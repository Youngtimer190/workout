import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { isAdminConfigured } from '../../lib/supabase';

interface Props {
  onClose: () => void;
}

export default function DeleteAccountModal({ onClose }: Props) {
  const { deleteAccount, user, loading } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_PHRASE = 'USUŃ KONTO';
  const isConfirmValid = confirmText === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!isConfirmValid) {
      setError(`Wpisz dokładnie: ${CONFIRM_PHRASE}`);
      return;
    }
    setError(null);
    const { error } = await deleteAccount();
    if (error) setError(error);
    // Jeśli sukces — auth state change wyloguje użytkownika automatycznie
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="bg-slate-800 sm:rounded-2xl rounded-t-2xl border border-red-500/20 shadow-2xl w-full sm:max-w-md overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 1rem)' }}
      >

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600/20 to-red-500/10 border-b border-red-500/20 p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg">Usuń konto</h2>
            <p className="text-slate-400 text-sm mt-0.5">Ta operacja jest nieodwracalna</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {/* Krok 1 — Przegląd co zostanie usunięte */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
                <p className="text-red-400 font-medium text-sm mb-3">Co zostanie trwale usunięte:</p>
                {[
                  { icon: '👤', text: 'Twoje konto i dane logowania' },
                  { icon: '📅', text: 'Wszystkie plany treningowe ze wszystkich tygodni' },
                  { icon: '💪', text: 'Własne ćwiczenia które stworzyłeś' },
                  { icon: '📊', text: 'Historia treningów i statystyki serii' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <span className="text-base leading-none">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Info o metodzie usuwania */}
              <div className={`rounded-xl p-3 flex items-start gap-2.5 text-xs ${
                isAdminConfigured
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isAdminConfigured ? 'text-green-400' : 'text-amber-400'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isAdminConfigured
                      ? "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  />
                </svg>
                <div>
                  {isAdminConfigured ? (
                    <span className="text-green-300">
                      ✓ Klucz administracyjny skonfigurowany — usunięcie konta jest gwarantowane.
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      Brak klucza <code className="bg-amber-500/20 px-1 rounded">service_role</code> — 
                      dane zostaną usunięte z tabel, ale konto może wymagać ręcznego usunięcia w panelu Supabase.
                      Dodaj <code className="bg-amber-500/20 px-1 rounded">VITE_SUPABASE_SERVICE_ROLE_KEY</code> do <code className="bg-amber-500/20 px-1 rounded">.env.local</code>.
                    </span>
                  )}
                </div>
              </div>

              {/* Email konta */}
              <div className="bg-slate-700/30 rounded-xl p-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-slate-400 text-sm">
                  Konto: <span className="text-white font-medium">{user?.email}</span>
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors"
                >
                  Rozumiem, kontynuuj →
                </button>
              </div>
            </div>
          )}

          {/* Krok 2 — Potwierdzenie */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">
                Aby potwierdzić usunięcie konta <span className="text-white font-medium">{user?.email}</span>, wpisz poniżej dokładnie:
              </p>

              <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700">
                <span className="text-red-400 font-mono font-bold tracking-widest text-base select-all">
                  {CONFIRM_PHRASE}
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => { setConfirmText(e.target.value); setError(null); }}
                  placeholder="Wpisz potwierdzenie..."
                  className={`w-full px-4 py-3 rounded-xl bg-slate-700/50 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all font-mono ${
                    error
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : isConfirmValid
                        ? 'border-green-500/50 focus:ring-green-500/30'
                        : 'border-slate-600/50 focus:ring-red-500/30'
                  }`}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && isConfirmValid && handleDelete()}
                />
                {isConfirmValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-xs leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setStep(1); setConfirmText(''); setError(null); }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  ← Wróć
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading || !isConfirmValid}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Usuwanie...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Usuń konto permanentnie
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
