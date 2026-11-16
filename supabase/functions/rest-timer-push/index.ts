/**
 * Edge Function: powiadomienie o końcu przerwy (Web Push).
 *
 * Dlaczego to potrzebne?
 * Dźwięk w przeglądarce nie zagra, gdy użytkownik przełączy się do innej
 * apki, ekran wygasnie albo system usypi aplikację. Powiadomienie
 * systemowe dociera nawet do zablokowanego ekranu — to jedyna metoda
 * alarmu, która działa bez natywnej aplikacji.
 *
 * Przepływ:
 *  1. Klient prosi o zgodę, tworzy subskrypcję i wysyła ją tu
 *     (`action: "subscribe"`).
 *  2. Przy starcie timera klient prosi o powiadomienie w konkretnej chwili
 *     (`action: "schedule"`). Funkcja zapisuje harmonogram i od razu
 *     odpowiada 202 — dalej pracuje w tle.
 *  3. Po upływie czasu funkcja wysyła push do wszystkich subskrypcji
 *     użytkownika.
 *  4. Jeśli użytkownik anuluje przerwę przed czasem, klient wysyła
 *     `action: "cancel"` i powiadomienie nie wychodzi.
 *
 * PRZERWY DŁUŻSZE NIŻ OKNO FUNKCJI
 * ──────────────────────────────────
 * Limit czasu ściany Edge Function to 150 s (plan darmowy) / 400 s (płatne).
 * Przerwa może trwać nawet 15 minut, więc funkcja NIE może po prostu
 * zasnąć do końca.
 *
 * Dlatego długa przerwa jest realizowana **łańcuchem wywołań**: gdy do
 * końca zostało więcej niż `MAX_SLEEP_MS`, funkcja budzi się po tym czasie
 * i wywołuje SIEBIE z akcją `resume` (przekazując identyfikator
 * harmonogramu). Każde wywołanie to nowy limit ściany — łańcuch dowolnej
 * długości. Żadnych sekretów i żadnych zmian w bazie.
 *
 * To samo dotyczy okna anulowania: gdy aplikacja jest na wierzchu, gra
 * lokalny dzwonek i w tej samej chwili prosi serwer o anulowanie.
 */

import webpush from 'npm:web-push@^3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@^2.49.1';

const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:angelika_pawelek@wp.pl';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

/**
 * Ile najdłużej śpimy w jednym wywołaniu.
 *
 * Zostawiamy duży zapas wobec limitu 150 s — po śnie jeszcze jest
 * sprawdzenie anulowania, szyfrowanie i samo wysłanie.
 */
const MAX_SLEEP_MS = 90_000;

/**
 * Ile czekamy po terminie, zanim wyślemy powiadomienie.
 *
 * To okno na anulowanie: gdy aplikacja jest na wierzchu, gra lokalny
 * dzwonek i w tym samym momencie prosi serwer o anulowanie powiadomienia.
 * Bez tej przerwy użytkownik dostałby dzwonek ORAZ powiadomienie.
 *
 * Gdy telefon jest zablokowany, nikt nie anuluje — powiadomienie wychodzi
 * (z opóźnieniem 0,6 s, którego nikt nie zauważy).
 */
const SEND_GRACE_MS = 600;

/** Ile harmonogramów trzymamy dla jednego użytkownika. */
const MAX_SCHEDULES_PER_USER = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Klient z kluczem service_role — omija RLS (funkcja działa po stronie serwera). */
function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Sprawdza JWT z nagłówka Authorization i zwraca id użytkownika. */
async function resolveUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !data.user) return null;
  return data.user.id;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ── Łańcuch wywołań dla długich przerw ───────────────────────────────────── */

interface ScheduleRow {
  id: string;
  user_id: string;
  ends_at: string;
  title: string;
  body: string;
  cancelled: boolean;
  sent_at: string | null;
}

/**
 * Wywołuje tę samą funkcję z akcją `resume`.
 *
 * Klucz service_role jest wbudowaną zmienną środowiska Edge Function —
 * nie musimy (i nie chcemy) trzymać go w kodzie ani w bazie.
 */
async function hopToNextSegment(scheduleId: string): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;

  try {
    await fetch(`${url}/functions/v1/rest-timer-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ action: 'resume', id: scheduleId }),
    });
  } catch (err) {
    console.log(
      JSON.stringify({
        zdarzenie: 'lancuch_przerwany',
        harmonogram: scheduleId,
        blad: String((err as Error)?.message ?? err),
      }),
    );
  }
}

/**
 * Czeka do końca przerwy i wysyła powiadomienie.
 *
 * Funkcja sama decyduje, czy zdąży zasnąć do końca (krótka przerwa), czy
 * musi przekazać pilnowanie kolejnemu wywołaniu (długa przerwa).
 */
async function waitAndSend(
  admin: ReturnType<typeof adminClient> extends null ? never : NonNullable<ReturnType<typeof adminClient>>,
  scheduleId: string,
  userId: string
): Promise<void> {
  const { data: row } = await admin
    .from('push_schedules')
    .select('id, user_id, ends_at, title, body, cancelled, sent_at')
    .eq('id', scheduleId)
    .maybeSingle();

  const harmonogram = row as ScheduleRow | null;
  if (!harmonogram || harmonogram.cancelled) return;

  const endsAt = new Date(harmonogram.ends_at).getTime();
  const pozostalo = endsAt - Date.now();

  // Za długa przerwa na jedno wywołanie → przekazujemy pilnowanie dalej.
  if (pozostalo > MAX_SLEEP_MS) {
    await sleep(MAX_SLEEP_MS);
    const { data: poCzekaniu } = await admin
      .from('push_schedules')
      .select('cancelled')
      .eq('id', scheduleId)
      .maybeSingle();
    if (!poCzekaniu || (poCzekaniu as { cancelled: boolean }).cancelled) return;

    // Ślad w bazie — pozwala zobaczyć, gdzie łańcuch się urwał.
    await admin
      .from('push_schedules')
      .update({ timing: { etap: 'hop', hop_po_ms: endsAt - Date.now() } })
      .eq('id', scheduleId);

    await hopToNextSegment(scheduleId);
    console.log(
      JSON.stringify({
        zdarzenie: 'lancuch_kontynuowany',
        harmonogram: scheduleId,
        do_konca_ms: endsAt - Date.now(),
      }),
    );
    return;
  }

  // Krótka przerwa — śpimy do końca.
  await sleep(Math.max(0, pozostalo));
  const wokeAt = Date.now();

  // Krótkie okno „grace period" przed wysyłką (patrz SEND_GRACE_MS).
  await sleep(SEND_GRACE_MS);
  const afterGrace = Date.now();

  // Sprawdzamy, czy użytkownik zdążył anulować przerwę.
  const { data: row2 } = await admin
    .from('push_schedules')
    .select('cancelled')
    .eq('id', scheduleId)
    .maybeSingle();
  const checkedAt = Date.now();

  if (!row2 || (row2 as { cancelled: boolean }).cancelled) {
    console.log(
      JSON.stringify({
        zdarzenie: 'powiadomienie_anulowane',
        opoznienie_ms: wokeAt - endsAt,
        lacznie_ms: checkedAt - endsAt,
      }),
    );
    return;
  }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  const subscriptions = (subs ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;

  let wyslane = 0;
  const bledy: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title: harmonogram.title, body: harmonogram.body }),
        { TTL: 60, urgency: 'high' },
      );
      wyslane++;
    } catch (err) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      const status = e?.statusCode;
      // 404/410 = subskrypcja nieaktualna (apka odinstalowana albo token
      // wygasł) — usuwamy ją.
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
      bledy.push(`${status ?? '?'} ${e?.message ?? String(err)}`);
      // Błąd wysyłki MUSI być widoczny — bez tego „sent_at” kłamałoby,
      // a użytkownik nigdy by się nie dowiedział, że push nie działa.
      console.log(
        JSON.stringify({
          zdarzenie: 'wysylka_nieudana',
          status: status ?? null,
          komunikat: e?.message ?? String(err),
          odpowiedz: e?.body ?? null,
        }),
      );
    }
  }

  const sentAt = Date.now();

  // `sent_at` ustawiamy TYLKO wtedy, gdy przynajmniej jedno powiadomienie
  // zostało przyjęte. Wcześniej znacznik był zapisywany bezwarunkowo —
  // baza twierdziła, że push poszedł, nawet gdy wysyłka się nie powiodła.
  await admin
    .from('push_schedules')
    .update({
      sent_at: wyslane > 0 ? new Date(sentAt).toISOString() : null,
      timing: {
        budzik_ms: wokeAt - endsAt,
        okno_ms: afterGrace - wokeAt,
        odczyt_ms: checkedAt - afterGrace,
        wysylka_ms: sentAt - checkedAt,
        lacznie_ms: sentAt - endsAt,
        subskrypcji: subscriptions.length,
        wyslane,
        bledy: bledy.length ? bledy : undefined,
      },
    })
    .eq('id', scheduleId);

  // Rozliczenie czasu — pozwala zobaczyć, gdzie znikają milisekundy
  // między końcem przerwy a powiadomieniem na telefonie.
  console.log(
    JSON.stringify({
      zdarzenie: wyslane > 0 ? 'powiadomienie_wyslane' : 'powiadomienie_nie_wyslane',
      budzik_ms: wokeAt - endsAt,        // opóźnienie przebudzenia
      okno_ms: afterGrace - wokeAt,      // „grace period"
      odczyt_ms: checkedAt - afterGrace, // odczyt flagi anulowania
      wysylka_ms: sentAt - checkedAt,    // szyfrowanie + APNs
      lacznie_ms: sentAt - endsAt,       // od końca przerwy do wysłania
      subskrypcji: subscriptions.length,
      wyslane,
      bledy: bledy.length ? bledy : undefined,
    }),
  );
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json(
      { error: 'Brak kluczy VAPID — ustaw VAPID_PUBLIC_KEY i VAPID_PRIVATE_KEY jako sekrety.' },
      500,
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Nieprawidłowe dane.' }, 400);
  }

  const action = String(body.action ?? '');

  const admin = adminClient();
  if (!admin) return json({ error: 'Brak konfiguracji Supabase.' }, 500);

  /* ── 0. Kontynuacja łańcucha (wewnętrzne) ────────────────────────────────
     Wywołanie od kolejnego ogniwa łańcucha — idzie z kluczem service_role,
     a nie z JWT użytkownika. Dlatego NIE może przechodzić przez
     `resolveUser()` (klucz service_role nie jest tokenem użytkownika).
     Uwierzytelnienie: token musi być dokładnie kluczem service_role. */
  if (action === 'resume') {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!serviceKey || token !== serviceKey) {
      return json({ error: 'Brak autoryzacji.' }, 401);
    }

    const id = String(body.id ?? '');
    if (!id) return json({ error: 'Brak identyfikatora.' }, 400);

    const { data: row } = await admin
      .from('push_schedules')
      .select('user_id, cancelled')
      .eq('id', id)
      .maybeSingle();

    if (!row) return json({ error: 'Nie ma takiego harmonogramu.' }, 404);
    if ((row as { cancelled: boolean }).cancelled) return json({ ok: true, anulowane: true });

    const userId = String((row as { user_id: string }).user_id);

    // Ślad w bazie — pozwala zobaczyć, gdzie łańcuch się urwał.
    await admin
      .from('push_schedules')
      .update({ timing: { etap: 'resume', resume_po_ms: Date.now() } })
      .eq('id', id);

    EdgeRuntime.waitUntil(waitAndSend(admin, id, userId));
    return json({ ok: true }, 202);
  }

  const userId = await resolveUser(req);
  if (!userId) return json({ error: 'Brak autoryzacji.' }, 401);

  /* ── 1. Zapisanie subskrypcji ──────────────────────────────────────────── */
  if (action === 'subscribe') {
    const sub = body.subscription as
      | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      | undefined;

    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return json({ error: 'Nieprawidłowa subskrypcja.' }, 400);
    }

    const { error } = await admin.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  /* ── 2. Status subskrypcji (diagnostyka dla aplikacji) ─────────────────── */
  if (action === 'status') {
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, last_used_at')
      .eq('user_id', userId);

    const lista = (subs ?? []) as Array<{ id: string; endpoint: string; last_used_at: string }>;
    return json({
      ok: true,
      subskrypcji: lista.length,
      ostatnia: lista[0]?.last_used_at ?? null,
    });
  }

  /* ── 3. Anulowanie harmonogramu ────────────────────────────────────────── */
  if (action === 'cancel') {
    const id = String(body.id ?? '');
    if (!id) return json({ error: 'Brak identyfikatora.' }, 400);

    const { data: existing } = await admin
      .from('push_schedules')
      .select('ends_at, cancelled')
      .eq('id', id)
      .maybeSingle();

    await admin
      .from('push_schedules')
      .update({ cancelled: true })
      .eq('id', id)
      .eq('user_id', userId);

    // Kiedy dotarło anulowanie względem końca przerwy — to decyduje,
    // ile musi trwać „okno" przed wysyłką powiadomienia.
    const endsAtMs = existing?.ends_at ? new Date(existing.ends_at).getTime() : null;
    console.log(
      JSON.stringify({
        zdarzenie: 'anulowanie_doszedlo',
        wzgledem_konca_ms: endsAtMs ? Date.now() - endsAtMs : null,
        juz_anulowane: existing?.cancelled ?? null,
      }),
    );

    return json({ ok: true });
  }

  /* ── 4. Planowanie powiadomienia ───────────────────────────────────────── */
  if (action === 'schedule') {
    const endsAt = Number(body.endsAt);
    const delay = endsAt - Date.now();

    if (!Number.isFinite(endsAt) || delay <= 0) {
      return json({ error: 'Nieprawidłowy czas zakończenia.' }, 400);
    }

    const title = String(body.title ?? 'Czas!');
    const text = String(body.body ?? 'Przerwa minęła — możesz zacząć kolejną serię.');

    // Porządkujemy stare harmonogramy (żaden nie waży więcej niż kilka
    // kilobajtów, ale tabela nie powinna rosnąć w nieskończoność).
    await admin
      .from('push_schedules')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const { data: inserted, error } = await admin
      .from('push_schedules')
      .insert({ user_id: userId, ends_at: new Date(endsAt).toISOString(), title, body: text })
      .select('id')
      .maybeSingle();

    if (error || !inserted) {
      return json({ error: error?.message ?? 'Nie udało się zaplanować.' }, 500);
    }

    const scheduleId = String((inserted as { id: string }).id);

    // Cała reszta dzieje się w tle — odpowiedź leci natychmiast.
    EdgeRuntime.waitUntil(waitAndSend(admin, scheduleId, userId));

    return json({ id: scheduleId }, 202);
  }

  /* ── 5. Kontynuacja łańcucha (wewnętrzne) ─────────────────────────────── */
  if (action === 'resume') {
    // Obsłużone wyżej — akcja wymaga klucza service_role, a nie JWT
    // użytkownika. Gdyby trafiła tutaj, znaczyłoby, że ktoś próbuje
    // wznowić cudzy harmonogram.
    return json({ error: 'Nieznana akcja.' }, 400);
  }

  return json({ error: 'Nieznana akcja.' }, 400);
});
