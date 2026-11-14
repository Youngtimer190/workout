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
 * Limit czasu ściany Edge Function: 150 s (darmowy plan) / 400 s (płatne).
 * Dlatego harmonogramy dłuższe niż `MAX_DELAY_MS` są odrzucane — lepiej
 * nie obiecywać powiadomienia, które nie dotrze.
 */

import webpush from 'npm:web-push@^3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@^2.49.1';

const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:angelika_pawelek@wp.pl';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

/** Najdłuższe oczekiwanie w tle (zostawiamy zapas na samo wysłanie). */
const MAX_DELAY_MS = 120_000;

/** Ile harmonogramów trzymamy dla jednego użytkownika. */
const MAX_SCHEDULES_PER_USER = 20;

/**
 * Ile czekamy po terminie, zanim wyślemy powiadomienie.
 *
 * To okno na anulowanie: gdy aplikacja jest na wierzchu, gra lokalny
 * dzwonek i w tym samym momencie prosi serwer o anulowanie powiadomienia.
 * Bez tej przerwy użytkownik dostałby dzwonek ORAZ powiadomienie.
 *
 * Gdy telefon jest zablokowany, nikt nie anuluje — powiadomienie wychodzi
 * (z opóźnieniem 1,8 s, którego nikt nie zauważy).
 */
const SEND_GRACE_MS = 1800;

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

  const userId = await resolveUser(req);
  if (!userId) return json({ error: 'Brak autoryzacji.' }, 401);

  const admin = adminClient();
  if (!admin) return json({ error: 'Brak konfiguracji Supabase.' }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Nieprawidłowe dane.' }, 400);
  }

  const action = String(body.action ?? '');

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

  /* ── 2. Anulowanie harmonogramu ────────────────────────────────────────── */
  if (action === 'cancel') {
    const id = String(body.id ?? '');
    if (!id) return json({ error: 'Brak identyfikatora.' }, 400);

    await admin
      .from('push_schedules')
      .update({ cancelled: true })
      .eq('id', id)
      .eq('user_id', userId);

    return json({ ok: true });
  }

  /* ── 3. Planowanie powiadomienia ───────────────────────────────────────── */
  if (action === 'schedule') {
    const endsAt = Number(body.endsAt);
    const delay = endsAt - Date.now();

    if (!Number.isFinite(endsAt) || delay <= 0) {
      return json({ error: 'Nieprawidłowy czas zakończenia.' }, 400);
    }
    if (delay > MAX_DELAY_MS) {
      return json(
        { error: 'Przerwa jest za długa, aby zaplanować powiadomienie.' },
        400,
      );
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
    EdgeRuntime.waitUntil(
      (async () => {
        await sleep(Math.max(0, endsAt - Date.now()));

        // Krótkie okno „grace period" przed wysyłką.
        //
        // Gdy aplikacja jest na wierzchu, gra lokalny dzwonek i w tym
        // samym momencie prosi serwer o anulowanie powiadomienia. Bez
        // tego oczekiwania serwer zdążyłby wysłać push w tej samej
        // chwili — użytkownik dostałby dzwonek ORAZ powiadomienie
        // (podwójny alarm). 1,8 s wystarczy, żeby anulowanie dotarło.
        //
        // Gdy telefon jest zablokowany, strona jest zamrożona i nie ma
        // kto anulować — wtedy powiadomienie wychodzi normalnie.
        await sleep(SEND_GRACE_MS);

        // Sprawdzamy, czy użytkownik zdążył anulować przerwę.
        const { data: row } = await admin
          .from('push_schedules')
          .select('cancelled')
          .eq('id', scheduleId)
          .maybeSingle();

        if (!row || (row as { cancelled: boolean }).cancelled) return;

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

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({ title, body: text }),
              { TTL: 60, urgency: 'high' },
            );
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // 404/410 = subskrypcja nieaktualna (apka odinstalowana
            // albo token wygasł) — usuwamy ją.
            if (status === 404 || status === 410) {
              await admin.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }

        await admin
          .from('push_schedules')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', scheduleId);
      })(),
    );

    return json({ id: scheduleId }, 202);
  }

  return json({ error: 'Nieznana akcja.' }, 400);
});
