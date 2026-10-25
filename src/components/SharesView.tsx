import { useState } from 'react';
import { SharedWorkout, ShareStatus } from '../types';
import { mondayOfWeekKey, DAY_NAMES } from '../store/weekStore';
import AcceptShareModal from './AcceptShareModal';

interface SharesViewProps {
  incoming: SharedWorkout[];
  outgoing: SharedWorkout[];
  loading: boolean;
  error: string | null;
  /** Czy udostępnianie w ogóle działa (wymaga Supabase i konta). */
  canShare: boolean;
  onRefresh: () => void;
  onAccept: (share: SharedWorkout, targetDateStr: string) => Promise<{ error: Error | null }>;
  onDecline: (share: SharedWorkout) => Promise<{ error: Error | null }>;
  onCancel: (shareId: string) => Promise<{ error: Error | null }>;
}

type Tab = 'incoming' | 'history' | 'outgoing';

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'incoming', label: 'Do akceptacji' },
  { id: 'history', label: 'Odebrane' },
  { id: 'outgoing', label: 'Wysłane' },
];

/** `2026-10-27` → `27.10.2026` */
function formatDatePL(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** `2026-10-27T…` → `27.10.2026` */
function formatTimestampPL(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** Data lądowania udostępnienia — z `accepted_week_key` + `accepted_day_index`. */
function landingDate(share: SharedWorkout): string | null {
  if (!share.accepted_week_key || share.accepted_day_index == null) return null;
  const monday = mondayOfWeekKey(share.accepted_week_key);
  if (!monday) return null;
  const d = new Date(monday);
  d.setDate(d.getDate() + share.accepted_day_index);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STATUS_STYLES: Record<ShareStatus, { label: string; cls: string }> = {
  pending: { label: 'Oczekuje', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: 'Zaakceptowane', cls: 'bg-green-50 text-green-700 border-green-200' },
  declined: { label: 'Odrzucone', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export default function SharesView({
  incoming,
  outgoing,
  loading,
  error,
  canShare,
  onRefresh,
  onAccept,
  onDecline,
  onCancel,
}: SharesViewProps) {
  const [tab, setTab] = useState<Tab>('incoming');
  const [activeShare, setActiveShare] = useState<SharedWorkout | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingIncoming = incoming.filter(s => s.status === 'pending');
  const historyIncoming = incoming.filter(s => s.status !== 'pending');

  const handleDecline = async (share: SharedWorkout) => {
    setBusyId(share.id);
    setActionError(null);
    try {
      const result = await onDecline(share);
      if (result.error) setActionError(result.error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (shareId: string) => {
    setBusyId(shareId);
    setActionError(null);
    try {
      const result = await onCancel(shareId);
      if (result.error) setActionError(result.error.message);
    } finally {
      setBusyId(null);
    }
  };

  const renderEmpty = (text: string, sub: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-2">📭</span>
      <p className="text-slate-500 font-semibold text-sm sm:text-base">{text}</p>
      <p className="text-slate-400 text-xs mt-1 max-w-xs">{sub}</p>
    </div>
  );

  const renderShareCard = (share: SharedWorkout, mode: 'incoming' | 'outgoing') => {
    const status = STATUS_STYLES[share.status];
    const exercises = Array.isArray(share.day_data?.exercises) ? share.day_data.exercises : [];
    const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
    const counterparty = mode === 'incoming'
      ? (share.owner_name?.trim() || share.owner_email)
      : share.recipient_email;
    const landed = mode === 'outgoing' ? landingDate(share) : null;

    return (
      <div key={share.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm uppercase">
              {(counterparty || '?').trim().charAt(0)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-slate-800 font-bold text-sm truncate">{counterparty}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  {mode === 'incoming' ? 'Udostępnił' : 'Udostępniono do'}
                  {formatTimestampPL(share.created_at) ? ` · ${formatTimestampPL(share.created_at)}` : ''}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border flex-shrink-0 ${status.cls}`}>
                {status.label}
              </span>
            </div>

            <div className="mt-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <p className="text-slate-700 font-semibold text-xs">
                {share.day_name ?? 'Dzień treningowy'}
                <span className="text-slate-400 font-normal">
                  {' · '}{exercises.length} ćwiczeń{totalSets > 0 ? ` · ${totalSets} serii` : ''}
                </span>
              </p>
              {landed && (
                <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  Dodano do {DAY_NAMES[share.accepted_day_index ?? 0]} {formatDatePL(landed)}
                </p>
              )}
            </div>

            {/* Akcje */}
            {mode === 'incoming' && share.status === 'pending' && (
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => handleDecline(share)}
                  disabled={busyId === share.id}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {busyId === share.id ? 'Odrzucam…' : 'Odrzuć'}
                </button>
                <button
                  onClick={() => setActiveShare(share)}
                  disabled={busyId === share.id}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Akceptuj
                </button>
              </div>
            )}

            {mode === 'outgoing' && share.status === 'pending' && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleCancel(share.id)}
                  disabled={busyId === share.id}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {busyId === share.id ? 'Anuluję…' : 'Anuluj udostępnienie'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Udostępnienia</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Tradingi udostępnione przez innych użytkowników i Twoje własne
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all cursor-pointer self-start sm:self-auto flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}>
            <path d="M21 12a9 9 0 11-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {loading ? 'Odświeżam…' : 'Odśwież'}
        </button>
      </div>

      {/* Brak konfiguracji */}
      {!canShare && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <div>
            <p className="text-sm font-bold text-amber-700">Udostępnianie niedostępne</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Funkcja wymaga skonfigurowanego Supabase i zalogowanego konta (tryb demo jej nie obsługuje).
            </p>
          </div>
        </div>
      )}

      {/* Błąd odczytu */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-red-600 text-xs leading-relaxed">{error}</p>
        </div>
      )}

      {/* Błąd akcji */}
      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-red-600 text-xs leading-relaxed">{actionError}</p>
        </div>
      )}

      {/* Zakładki */}
      <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 overflow-x-auto">
        {TAB_LABELS.map(t => {
          const count = t.id === 'incoming'
            ? pendingIncoming.length
            : t.id === 'history'
            ? historyIncoming.length
            : outgoing.length;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-fit whitespace-nowrap px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {tab === 'incoming' && (
        <div className="space-y-2">
          {pendingIncoming.length === 0
            ? renderEmpty(
                'Nie masz udostępnień do akceptacji',
                'Gdy ktoś udostępni Ci swój dzień treningowy, znajdziesz go tutaj.'
              )
            : pendingIncoming.map(s => renderShareCard(s, 'incoming'))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {historyIncoming.length === 0
            ? renderEmpty(
                'Brak historii',
                'Zaakceptowane i odrzucone udostępnienia pojawią się tutaj.'
              )
            : historyIncoming.map(s => renderShareCard(s, 'incoming'))}
        </div>
      )}

      {tab === 'outgoing' && (
        <div className="space-y-2">
          {outgoing.length === 0
            ? renderEmpty(
                'Nic jeszcze nie udostępniłeś',
                'W planerze wybierz dzień z ćwiczeniami i użyj przycisku udostępniania.'
              )
            : outgoing.map(s => renderShareCard(s, 'outgoing'))}
        </div>
      )}

      {/* Modal akceptacji */}
      {activeShare && (
        <AcceptShareModal
          share={activeShare}
          onAccept={async (targetDateStr) => {
            // Po sukcesie modal ZOSTAJE otwarty — sam pokazuje ekran
            // „Dodano do …". Zamyka go użytkownik przyciskiem „Zamknij".
            return onAccept(activeShare, targetDateStr);
          }}
          onDecline={async () => {
            const result = await onDecline(activeShare);
            if (!result.error) setActiveShare(null);
            return result;
          }}
          onClose={() => setActiveShare(null)}
        />
      )}
    </div>
  );
}
