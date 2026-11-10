import { APPEARANCE_SCALES, AppearanceSettings } from '../../store/appearanceStore';
import { MoonIcon, SparklesIcon, SunIcon } from '../icons';

interface AppearanceViewProps {
  settings: AppearanceSettings;
  onScaleChange: (scale: number) => void;
  onAnimationsChange: (animations: boolean) => void;
}

/**
 * Widok „Wygląd” — skala interfejsu i animacje.
 *
 * Skala działa na `html { font-size }`, a Tailwind buduje rozmiary w `rem`,
 * więc cały interfejs (także ten w panelu bocznym) skaluje się spójnie.
 */
export default function AppearanceView({
  settings,
  onScaleChange,
  onAnimationsChange,
}: AppearanceViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Wygląd</h1>
        <p className="text-slate-400 text-sm mt-1">Dopasuj interfejs do swoich potrzeb</p>
      </div>

      {/* Motyw */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <MoonIcon className="h-4 w-4 text-violet-300" />
          Motyw
        </h2>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/40 to-fuchsia-500/20 text-violet-100">
              <SparklesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">FitPlanner Dark</p>
              <p className="text-[11px] text-slate-400">Styl dopasowany do ekranu logowania</p>
            </div>
          </div>
          <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">
            Aktywny
          </span>
        </div>
      </section>

      {/* Skala */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <SunIcon className="h-4 w-4 text-violet-300" />
          Skala interfejsu
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Powiększa lub pomniejsza cały interfejs — teksty, przyciski i karty.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {APPEARANCE_SCALES.map(option => {
            const isActive = settings.scale === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onScaleChange(option.value)}
                aria-pressed={isActive}
                className={`rounded-xl border-2 px-3 py-4 text-center transition-all cursor-pointer ${
                  isActive
                    ? 'border-violet-500 bg-violet-500/15 text-white shadow-[0_10px_24px_-14px_rgba(139,92,246,1)]'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-violet-400/40 hover:bg-white/[0.06]'
                }`}
              >
                <span className="block text-lg font-extrabold">{option.hint}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-400">{option.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Animacje */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white mb-4">Animacje</h2>
        <div className="flex items-center justify-between gap-4">
          {/* Etykieta też przełącza — większy obszar klikalny */}
          <button
            onClick={() => onAnimationsChange(!settings.animations)}
            className="text-left cursor-pointer"
          >
            <p className="text-sm font-semibold text-white">Przejścia i animacje</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Wyłącz, jeśli animacje powodują dyskomfort (np. przy migotaniu).
            </p>
          </button>
          <button
            role="switch"
            aria-checked={settings.animations}
            aria-label="Przejścia i animacje"
            onClick={() => onAnimationsChange(!settings.animations)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0620] ${
              settings.animations
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-400/40 shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]'
                : 'bg-white/[0.07] border-white/10 hover:border-white/20'
            }`}
          >
            <span
              className={`absolute top-[3px] left-[2px] h-[18px] w-[18px] rounded-full shadow-md transition-all duration-200 ${
                settings.animations
                  ? 'translate-x-[22px] bg-white'
                  : 'translate-x-0 bg-slate-400'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
