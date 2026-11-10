import { GamepadIcon } from '../icons';

export default function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="bg-amber-500/15 backdrop-blur-xl border-b border-amber-500/25 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <GamepadIcon className="h-5 w-5 flex-shrink-0 text-amber-300" />
        <div className="min-w-0">
          <span className="text-amber-200 font-semibold text-sm">Tryb Demo</span>
          <span className="text-amber-200/70 text-xs ml-2 hidden sm:inline">· Dane zapisywane lokalnie, bez synchronizacji z chmurą</span>
        </div>
      </div>
      <button
        onClick={onExit}
        className="flex-shrink-0 bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        Zakończ demo
      </button>
    </div>
  );
}
