import { useEffect, useState } from 'react';
import { TimerIcon } from '../icons';
import { describeDuration, formatDuration, REST_PRESETS } from '../../lib/restTimer';
import {
  RestTimerSettings as RestTimerSettingsType,
  useRestTimerSettings,
} from '../../store/restTimerStore';
import { requestPushPermission, registerSubscription } from '../../lib/pushClient';

interface RestTimerSettingsViewProps {
  /** Czy zalogowany użytkownik (powiadomienia wymagają konta). */
  canUsePush: boolean;
  /** Identyfikator użytkownika — potrzebny do zapisania subskrypcji. */
  userId?: string;
}

/**
 * Widok „Timer odpoczynku” — ustawienia przerwy między seriami.
 *
 * Są tu cztery przełączniki, które realnie zmieniają zachowanie:
 *  • **auto-start** — przerwa startuje sama po zaznaczeniu serii,
 *  • **dźwięk** — dzwonek na koniec przerwy,
 *  • **wibracje** — ostatnie 3 sekundy i koniec (Android; iOS ich nie ma),
 *  • **ekran** — telefon nie wygasza ekranu w trakcie przerwy,
 *  • **powiadomienia** — alarm systemowy, gdy aplikacja jest w tle.
 */
export default function RestTimerSettingsView({
  canUsePush,
  userId,
}: RestTimerSettingsViewProps) {
  const { settings, update } = useRestTimerSettings();
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  // Komunikat o powiadomieniach znika po kilku sekundach.
  useEffect(() => {
    if (!pushMessage) return;
    const id = window.setTimeout(() => setPushMessage(null), 6000);
    return () => window.clearTimeout(id);
  }, [pushMessage]);

  const toggleSwitch = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (value: boolean) => void,
    badge?: string,
  ) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.06] last:border-b-0">
      <button onClick={() => onChange(!checked)} className="text-left cursor-pointer min-w-0">
        <p className="text-sm font-semibold text-white">
          {label}
          {badge && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              {badge}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </button>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#081226] ${
          checked
            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 border-cyan-400/40 shadow-[0_0_18px_-6px_rgba(6,182,212,0.9)]'
            : 'bg-white/[0.07] border-white/10 hover:border-white/20'
        }`}
      >
        <span
          className={`absolute top-[3px] left-[2px] h-[18px] w-[18px] rounded-full shadow-md transition-all duration-200 ${
            checked ? 'translate-x-[22px] bg-white' : 'translate-x-0 bg-slate-400'
          }`}
        />
      </button>
    </div>
  );

  const handlePushToggle = async (value: boolean) => {
    if (!value) {
      update({ pushEnabled: false });
      setPushMessage('Powiadomienia wyłączone.');
      return;
    }

    if (!canUsePush || !userId) {
      setPushMessage(
        'Powiadomienia wymagają konta — zaloguj się, aby je włączyć.',
      );
      return;
    }

    setPushBusy(true);
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      setPushBusy(false);
      setPushMessage(
        permission === 'unsupported'
          ? 'Ta przeglądarka nie obsługuje powiadomień. Na iPhone dodaj aplikację do ekranu głównego (iOS 16.4+).'
          : 'Brak zgody na powiadomienia — włącz je w ustawieniach systemu.',
      );
      return;
    }

    const ok = await registerSubscription();
    setPushBusy(false);
    update({ pushEnabled: ok });
    setPushMessage(
      ok
        ? 'Powiadomienia włączone — alarm zadzwoni nawet przy zablokowanym ekranie.'
        : 'Nie udało się zapisać subskrypcji — spróbuj ponownie za chwilę.',
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Timer odpoczynku
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Odliczanie przerwy między seriami — z dźwiękiem i alarmem, gdy telefon jest zablokowany
        </p>
      </div>

      {/* Domyślny czas */}
      <section className="bg-white rounded-2xl border border-cyan-400/15 p-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          <TimerIcon className="h-4 w-4 text-cyan-300" />
          Domyślny czas przerwy
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Tyle czasu odpoczywasz po zaznaczeniu serii. W trackerze możesz go
          zmienić jednym dotknięciem.
        </p>

        <div className="flex items-center justify-center gap-4 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 to-cyan-400/5 px-4 py-4 mb-4">
          <button
            onClick={() =>
              update({
                defaultDurationMs: Math.max(5_000, settings.defaultDurationMs - 15_000),
              })
            }
            aria-label="15 sekund mniej"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-white/[0.06] text-lg font-bold text-white transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
          >
            −
          </button>
          <div className="min-w-[130px] text-center">
            <p className="text-4xl font-extrabold text-cyan-300 tabular-nums leading-none">
              {formatDuration(settings.defaultDurationMs)}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {describeDuration(settings.defaultDurationMs)}
            </p>
          </div>
          <button
            onClick={() =>
              update({
                defaultDurationMs: Math.min(
                  15 * 60_000,
                  settings.defaultDurationMs + 15_000,
                ),
              })
            }
            aria-label="15 sekund więcej"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-white/[0.06] text-lg font-bold text-white transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
          >
            +
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {REST_PRESETS.map(preset => {
            const isActive = preset.ms === settings.defaultDurationMs;
            return (
              <button
                key={preset.ms}
                onClick={() => update({ defaultDurationMs: preset.ms })}
                aria-pressed={isActive}
                className={`rounded-xl border py-2.5 text-xs font-bold transition-colors active:scale-95 cursor-pointer ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-500 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40 hover:bg-white/[0.06]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Zachowanie timera */}
      <section className="bg-white rounded-2xl border border-cyan-400/15 p-5">
        <h2 className="text-base font-bold text-white mb-1">Zachowanie</h2>
        <p className="text-sm text-slate-400 mb-2">
          Co się dzieje, gdy zaznaczysz serię.
        </p>

        {toggleSwitch(
          'Startuj automatycznie',
          'Przerwa zaczyna się sama po zakończeniu serii — nie musisz o niej pamiętać.',
          settings.autoStart,
          v => update({ autoStart: v }),
        )}
        {toggleSwitch(
          'Dźwięk',
          'Dzwonek na koniec przerwy. Wgrywa się na Twoją muzykę, zamiast ją przerywać.',
          settings.soundEnabled,
          v => update({ soundEnabled: v }),
        )}
        {toggleSwitch(
          'Wibracje',
          'Krótki sygnał wibracyjny — ostatnie 3 sekundy i koniec przerwy.',
          settings.vibrationEnabled,
          v => update({ vibrationEnabled: v }),
          'Android',
        )}
        {toggleSwitch(
          'Nie wygaszaj ekranu',
          'Telefon nie wygasza ekranu w trakcie przerwy, więc odliczanie działa zawsze.',
          settings.keepScreenOn,
          v => update({ keepScreenOn: v }),
        )}
        {toggleSwitch(
          'Powiadomienie systemowe',
          'Alarm dociera nawet przy zablokowanym ekranie (iPhone wymaga aplikacji na ekranie głównym, iOS 16.4+).',
          settings.pushEnabled,
          v => void handlePushToggle(v),
          pushBusy ? '…' : undefined,
        )}

        {pushMessage && (
          <p className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-semibold text-cyan-200">
            {pushMessage}
          </p>
        )}
      </section>

      {/* Jak to działa */}
      <section className="bg-white rounded-2xl border border-cyan-400/15 p-5">
        <h2 className="text-base font-bold text-white mb-3">Jak to działa na telefonie</h2>
        <ul className="space-y-2.5 text-sm text-slate-400">
          <li className="flex gap-2.5">
            <span className="text-cyan-400 flex-shrink-0">•</span>
            <span>
              Przy włączonej opcji <strong className="text-slate-300">Nie wygaszaj ekranu</strong>{' '}
              telefon nie usypia aplikacji, więc odliczanie i dźwięk działają zawsze.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-cyan-400 flex-shrink-0">•</span>
            <span>
              Jeśli przełączysz się do innej apki, dźwięk może być wyciszony przez system —
              dlatego <strong className="text-slate-300">powiadomienie systemowe</strong>{' '}
              jest najpewniejszym alarmem.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="text-cyan-400 flex-shrink-0">•</span>
            <span>
              Zawsze widoczny pasek z odliczaniem pozwala zerknąć, ile zostało — nawet
              bez dźwięku.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

export type { RestTimerSettingsType };
