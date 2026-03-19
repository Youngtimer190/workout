export default function DemoBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">🎮</span>
        <div className="min-w-0">
          <span className="text-white font-semibold text-sm">Tryb Demo</span>
          <span className="text-orange-100 text-xs ml-2 hidden sm:inline">· Dane zapisywane lokalnie, bez synchronizacji z chmurą</span>
        </div>
      </div>
      <button
        onClick={onExit}
        className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        Zakończ demo
      </button>
    </div>
  );
}
