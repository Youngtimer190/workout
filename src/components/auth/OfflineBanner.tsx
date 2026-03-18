interface Props {
  onDismiss: () => void;
}

export default function OfflineBanner({ onDismiss }: Props) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-3">
      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-amber-300 text-xs flex-1">
        <span className="font-semibold">Tryb offline</span> — dane zapisywane tylko lokalnie. 
        Dodaj klucze Supabase w <code className="bg-amber-500/10 px-1 rounded font-mono">.env.local</code> aby włączyć synchronizację.
      </p>
      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
