import { useState, useEffect } from 'react';
import { WorkoutDay } from '../types';
import { mondayOfWeekKey, formatWeekLabel } from '../store/weekStore';

/** Prosty walidator e-mail — ten sam warunek, który pilnuje baza (CHECK constraint). */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ShareWorkoutModalProps {
  day: WorkoutDay;
  weekKey: string;
  /** E-mail zalogowanego użytkownika — nie wolno udostępnić samemu sobie. */
  currentUserEmail?: string | null;
  /** Wysyłka udostępnienia — zwraca błąd albo `null` przy sukcesie. */
  onSend: (recipientEmail: string) => Promise<{ error: Error | null }>;
  onClose: () => void;
}

export default function ShareWorkoutModal({
  day,
  weekKey,
  currentUserEmail,
  onSend,
  onClose,
}: ShareWorkoutModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const totalSets = day.exercises.reduce((acc, e) => acc + (e.sets || 0), 0);

  // Tydzień, z którego pochodzi udostępniany dzień (np. „27 – 2 lis 2026").
  const sourceMonday = mondayOfWeekKey(weekKey);
  const weekLabel = sourceMonday ? formatWeekLabel(sourceMonday) : null;

  // Zamknij na Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Zablokuj przewijanie tła gdy modal otwarty
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const trimmed = email.trim();
  const isValidEmail = EMAIL_RE.test(trimmed);
  const isOwnEmail =
    !!currentUserEmail &&
    trimmed.toLowerCase() === currentUserEmail.trim().toLowerCase();

  const handleSend = async () => {
    if (!isValidEmail || isOwnEmail || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await onSend(trimmed.toLowerCase());
      if (result.error) {
        setError(result.error.message);
      } else {
        // Ten sam komunikat niezależnie od tego, czy konto odbiorcy istnieje.
        setSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się udostępnić treningu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base sm:text-lg">Udostępnij trening</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Ekran sukcesu ── */}
        {sent ? (
          <div className="p-5 sm:p-6 flex flex-col items-center text-center flex-1 overflow-y-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-4 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-green-500">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h3 className="text-slate-800 font-bold text-base sm:text-lg">Udostępniono</h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Trening został udostępniony na adres <span className="font-semibold text-slate-700">{trimmed.toLowerCase()}</span>.
            </p>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              Trafienie do planu wymaga akceptacji odbiorcy — to on wskaże dzień, w którym trening ma się pojawić.
            </p>

            <button
              onClick={onClose}
              className="mt-5 w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 active:opacity-80"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Podsumowanie dnia */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                  {day.name}
                  {weekLabel && (
                    <span className="normal-case tracking-normal font-normal"> · {weekLabel}</span>
                  )}
                </p>
                <p className="text-slate-800 font-bold text-sm sm:text-base">
                  {day.exercises.length} ćwiczeń
                  {totalSets > 0 && <span className="text-slate-400 font-normal"> · {totalSets} serii</span>}
                </p>

                {/* Podgląd zawartości — nadawca widzi dokładnie to, co wysyła */}
                <ul className="mt-2 space-y-0.5">
                  {day.exercises.map((ex, i) => (
                    <li key={`${ex.id}-${i}`} className="text-xs text-slate-500 truncate">
                      • {ex.name}
                      {ex.sets ? ` — ${ex.sets} × ${ex.reps ?? ''}`.trim() : ''}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pole e-mail */}
              <div>
                <label htmlFor="share-recipient-email" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                  Adres e-mail odbiorcy:
                </label>
                <input
                  id="share-recipient-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  placeholder="np. kowalski@example.com"
                  autoComplete="off"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border-2 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                    isOwnEmail
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-violet-500 focus:ring-violet-500/20'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />

                {isOwnEmail ? (
                  <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    Nie możesz udostępnić treningu samemu sobie
                  </p>
                ) : trimmed && !isValidEmail ? (
                  <p className="text-[11px] text-amber-600 mt-2">
                    Podaj poprawny adres e-mail
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Odbiorca zobaczy trening w sekcji „Udostępnienia” i zdecyduje, czy go przyjąć.
                  </p>
                )}
              </div>

              {/* Błąd wysyłki */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p className="text-red-600 text-xs leading-relaxed">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Anuluj
              </button>
              <button
                onClick={handleSend}
                disabled={!isValidEmail || isOwnEmail || sending}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 disabled:opacity-50 active:opacity-80"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {sending ? 'Wysyłam…' : 'Udostępnij'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
