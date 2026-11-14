import { useEffect, useMemo, useState } from 'react';
import { SharedWorkout, ShareStatus } from '../types';
import { DAY_NAMES, mondayOfWeekKey } from '../store/weekStore';
import AcceptShareModal from './AcceptShareModal';
import {
  ArchiveIcon,
  CheckIcon,
  ChevronDownIcon,
  InboxIcon,
  SearchIcon,
  ShareIcon,
  XIcon,
} from './icons';
import {
  formatDatePL,
  formatRelativePL,
  monthLabelPL,
  pluralExercise,
  pluralSet,
  pluralWorkout,
} from '../lib/format';
import { useArchivedShares } from '../store/archivedSharesStore';
import { toUserMessage } from '../lib/errorMessages';

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
  /** Komunikat globalny aplikacji (toast). */
  onNotify?: (ok: boolean, text: string) => void;
  /** Przejdź do Planera (np. po akceptacji udostępnienia). */
  onOpenPlanner?: () => void;
  /** Data (`YYYY-MM-DD`) → liczba ćwiczeń w tym dniu — „dzień zajęty”. */
  busyDates?: Record<string, number>;
  /** Identyfikator konta — klucz osobistej listy zarchiwizowanych udostępnień. */
  userId?: string | null;
  /** Czas ostatniego odświeżenia listy. */
  lastRefreshedAt?: number | null;
}

type Tab = 'incoming' | 'history' | 'outgoing';
type StatusFilter = 'all' | ShareStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: 'incoming', label: 'Do akceptacji' },
  { id: 'history', label: 'Odebrane' },
  { id: 'outgoing', label: 'Wysłane' },
];

/** Ile pozycji pokazujemy naraz — reszta pod „Pokaż starsze”. */
const PAGE_SIZE = 12;

const STATUS_STYLES: Record<ShareStatus, { label: string; cls: string }> = {
  pending: { label: 'Oczekuje', cls: 'border-amber-400/30 bg-amber-400/15 text-amber-200' },
  accepted: { label: 'Przyjęte', cls: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200' },
  declined: { label: 'Odrzucone', cls: 'border-white/10 bg-white/[0.06] text-slate-300' },
};

/**
 * Data, w której trening wylądował w planie.
 *
 * Wiersz ma pola `accepted_week_key` + `accepted_day_index` niezależnie od
 * tego, kto udostępnił — dlatego informację pokazujemy w obu historiach.
 */
function landingDate(share: SharedWorkout): { date: string; dayIndex: number } | null {
  if (!share.accepted_week_key || share.accepted_day_index == null) return null;
  const monday = mondayOfWeekKey(share.accepted_week_key);
  if (!monday) return null;
  const d = new Date(monday);
  d.setDate(d.getDate() + share.accepted_day_index);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, dayIndex: share.accepted_day_index };
}

/** Grupa miesięczna — nagłówek „Listopad 2026”. */
interface MonthGroup {
  key: string;
  label: string;
  items: SharedWorkout[];
}

function groupByMonth(items: SharedWorkout[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const item of items) {
    const d = new Date(item.created_at);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { key, label: monthLabelPL(d), items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return [...map.values()];
}

/** Inicjały w awatarze — „Paweł Korcz” → „PK”. */
function initialsOf(label: string): string {
  const clean = label.trim();
  if (!clean) return '?';
  const parts = clean.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

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
  onNotify,
  onOpenPlanner,
  busyDates,
  userId,
  lastRefreshedAt,
}: SharesViewProps) {
  const [tab, setTab] = useState<Tab>('incoming');
  const [activeShare, setActiveShare] = useState<SharedWorkout | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showHidden, setShowHidden] = useState(false);

  const archived = useArchivedShares(userId);

  // Nowe dane → wróć na początek listy (i wyczyść wyszukiwanie).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [incoming.length, outgoing.length]);

  // Odśwież listę przy wejściu w widok (dane mogą być nieaktualne).
  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingIncoming = useMemo(() => incoming.filter(s => s.status === 'pending'), [incoming]);
  const historyIncoming = useMemo(() => incoming.filter(s => s.status !== 'pending'), [incoming]);

  const filteredHistory = useMemo(() => {
    const byStatus = statusFilter === 'all'
      ? historyIncoming
      : historyIncoming.filter(s => s.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(s => {
      const who = `${s.owner_name ?? ''} ${s.owner_email}`.toLowerCase();
      const what = `${s.day_name ?? ''}`.toLowerCase();
      return who.includes(q) || what.includes(q);
    });
  }, [historyIncoming, statusFilter, query]);

  const filteredOutgoing = useMemo(() => {
    const byStatus = statusFilter === 'all'
      ? outgoing
      : outgoing.filter(s => s.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(s => {
      const who = `${s.recipient_email}`.toLowerCase();
      const what = `${s.day_name ?? ''}`.toLowerCase();
      return who.includes(q) || what.includes(q);
    });
  }, [outgoing, statusFilter, query]);

  const visibleHistory = filteredHistory.filter(s => !archived.archivedIds.includes(s.id));
  const visibleOutgoing = filteredOutgoing.filter(s => !archived.archivedIds.includes(s.id));
  const archivedHistory = historyIncoming.filter(s => archived.archivedIds.includes(s.id));
  const archivedOutgoing = outgoing.filter(s => archived.archivedIds.includes(s.id));

  const handleDecline = async (share: SharedWorkout) => {
    setBusyId(share.id);
    setActionError(null);
    try {
      const result = await onDecline(share);
      if (result.error) {
        setActionError(toUserMessage(result.error, 'Nie udało się odrzucić udostępnienia.'));
      } else {
        onNotify?.(true, `Odrzucono udostępnienie od ${share.owner_name || share.owner_email}.`);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (shareId: string) => {
    setBusyId(shareId);
    setActionError(null);
    try {
      const result = await onCancel(shareId);
      if (result.error) {
        setActionError(toUserMessage(result.error, 'Nie udało się anulować udostępnienia.'));
      } else {
        onNotify?.(true, 'Udostępnienie anulowane.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = (share: SharedWorkout) => {
    archived.archive(share.id);
    onNotify?.(true, 'Udostępnienie zarchiwizowane. Możesz je przywrócić w sekcji „Zarchiwizowane”.');
  };

  const tabCounts: Record<Tab, number> = {
    incoming: pendingIncoming.length,
    history: historyIncoming.length,
    outgoing: outgoing.length,
  };

  // ── Elementy pomocnicze ───────────────────────────────────────────────────

  const renderEmpty = (title: string, sub: string, icon?: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/20 bg-white/[0.02] px-6 py-12 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-200">
        {icon ?? <InboxIcon className="h-7 w-7" />}
      </span>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{sub}</p>
    </div>
  );

  const renderStatusPill = (status: ShareStatus) => {
    const s = STATUS_STYLES[status];
    return (
      <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  // ── Karta udostępnienia ───────────────────────────────────────────────────
  const renderCard = (share: SharedWorkout, mode: 'incoming' | 'outgoing') => {
        const exercises = Array.isArray(share.day_data?.exercises) ? share.day_data.exercises : [];
    const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
    const counterparty = mode === 'incoming'
      ? (share.owner_name?.trim() || share.owner_email)
      : share.recipient_email;
    const rel = formatRelativePL(share.created_at);
    const landed = landingDate(share);
    const isExpanded = expandedId === share.id;
    // W historii (przetworzone udostępnienia) lista ćwiczeń jest zwinięta —
    // użytkownik przegląda historię, a nie podejmuje decyzję o przyjęciu.
    const compact = share.status !== 'pending';
    const listVisible = !compact || isExpanded;
    const isBusy = busyId === share.id;

    return (
      <article
        key={share.id}
        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 transition-colors hover:border-cyan-400/25 sm:p-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-xs font-bold uppercase text-white">
            {initialsOf(counterparty || '?')}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{counterparty}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {mode === 'incoming' ? 'Udostępnił' : 'Udostępniono do'}
                  {rel.text && <> · <span title={rel.title}>{rel.text}</span></>}
                </p>
              </div>
              {renderStatusPill(share.status)}
            </div>

            {/* Treść udostępnionego dnia */}
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-200">
                  {share.day_name ?? 'Dzień treningowy'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {exercises.length} {pluralExercise(exercises.length)}
                  {totalSets > 0 && <> · {totalSets} {pluralSet(totalSets)}</>}
                </p>
              </div>

              {exercises.length > 0 && listVisible && (
                <>
                  <ul className="mt-2 space-y-1">
                    {(isExpanded ? exercises : exercises.slice(0, 3)).map((ex, i) => (
                      <li key={`${ex.name}-${i}`} className="flex items-baseline gap-2 text-xs text-slate-300">
                        <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400/70" />
                        <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                        {ex.sets ? (
                          <span className="flex-shrink-0 text-[11px] text-slate-500">
                            {ex.sets} × {ex.reps ?? ''}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {(exercises.length > 3 || compact) && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : share.id)}
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-200 cursor-pointer"
                    >
                      {isExpanded
                        ? 'Zwiń listę'
                        : compact
                          ? `Pokaż ćwiczenia (${exercises.length})`
                          : `Pokaż wszystkie (${exercises.length})`}
                      <ChevronDownIcon className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Dokąd wylądował trening */}
            {landed && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
                <CheckIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {mode === 'incoming' ? 'W Twoim planie' : 'Odbiorca dodał do planu'} · {DAY_NAMES[landed.dayIndex]} {formatDatePL(landed.date)}
              </p>
            )}

            {/* Akcje */}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {mode === 'incoming' && share.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleDecline(share)}
                    disabled={isBusy}
                    className="min-h-[40px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:flex-none"
                  >
                    {isBusy ? 'Odrzucam…' : 'Odrzuć'}
                  </button>
                  <button
                    onClick={() => setActiveShare(share)}
                    disabled={isBusy}
                    className="min-h-[40px] flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:flex-none"
                  >
                    Akceptuj
                  </button>
                </>
              )}

              {mode === 'outgoing' && share.status === 'pending' && (
                <button
                  onClick={() => handleCancel(share.id)}
                  disabled={isBusy}
                  className="min-h-[40px] rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isBusy ? 'Anuluję…' : 'Anuluj udostępnienie'}
                </button>
              )}

              {share.status !== 'pending' && (
                <button
                  onClick={() => handleArchive(share)}
                  className="flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200 cursor-pointer"
                  title="Zarchiwizuj udostępnienie (możesz je przywrócić)"
                >
                  <ArchiveIcon className="h-3.5 w-3.5" />
                  Zarchiwizuj
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  // ── Lista z grupowaniem i „Pokaż starsze” ────────────────────────────────

  const renderGroupedList = (items: SharedWorkout[]) => {
    if (items.length === 0) return null;

    const groups = groupByMonth(items);
    let shown = 0;
    const rendered: React.ReactNode[] = [];

    for (const group of groups) {
      const remaining = visibleCount - shown;
      if (remaining <= 0) break;

      const groupItems = group.items.slice(0, remaining);
      shown += groupItems.length;

      rendered.push(
        <section key={group.key} className="space-y-2">
          <h3 className="flex items-center gap-2 px-1 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {group.label}
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
              {group.items.length}
            </span>
          </h3>
          {groupItems.map(s => renderCard(s, tab === 'outgoing' ? 'outgoing' : 'incoming'))}
        </section>
      );
    }

    const rest = items.length - shown;
    return (
      <>
        {rendered}
        {rest > 0 && (
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs font-semibold text-cyan-200 transition-all hover:border-cyan-400/30 hover:bg-white/[0.05] cursor-pointer"
          >
            Pokaż starsze ({rest})
          </button>
        )}
      </>
    );
  };

  // ── Pasek narzędzi historii ───────────────────────────────────────────────

  const renderHistoryToolbar = (options: { id: StatusFilter; label: string }[]) => {
    const total = tab === 'outgoing' ? outgoing.length : historyIncoming.length;
    if (total === 0) return null;

    return (
      <div className="space-y-2.5">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {options.map(opt => {
            const active = statusFilter === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { setStatusFilter(opt.id); setVisibleCount(PAGE_SIZE); }}
                aria-pressed={active}
                className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder={tab === 'outgoing' ? 'Szukaj odbiorcy lub dnia…' : 'Szukaj nadawcy lub dnia…'}
            aria-label="Szukaj w historii udostępnień"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Sekcja zarchiwizowanych ───────────────────────────────────────────────

  const renderArchivedSection = (items: SharedWorkout[]) => {
    if (items.length === 0) return null;
    return (
      <section className="space-y-2 pt-1">
        <button
          onClick={() => setShowHidden(v => !v)}
          aria-expanded={showHidden}
          className="flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] cursor-pointer"
        >
          <ArchiveIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="flex-1 text-xs font-semibold text-slate-300">
            Zarchiwizowane ({items.length})
          </span>
          <span className="text-[11px] text-slate-500">Rozwiń, aby cofnąć archiwizację</span>
          <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${showHidden ? 'rotate-180' : ''}`} />
        </button>

        {showHidden && (
          <div className="space-y-2 pl-1">
            {items.map(s => {
              const who = tab === 'outgoing' ? s.recipient_email : (s.owner_name?.trim() || s.owner_email);
              const rel = formatRelativePL(s.created_at);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-300">{who}</span>
                    <span className="block text-[11px] text-slate-500">
                      {s.day_name ?? 'Dzień treningowy'}{rel.text ? ` · ${rel.text}` : ''}
                    </span>
                  </span>
                  <button
                    onClick={() => { archived.restore(s.id); onNotify?.(true, 'Udostępnienie przywrócone z archiwum.'); }}
                    className="min-h-[34px] rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
                  >
                    Przywróć
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => { archived.clearAll(); onNotify?.(true, 'Wyczyszczono zarchiwizowane udostępnienia.'); }}
              className="text-[11px] font-semibold text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-300 cursor-pointer"
            >
              Wyczyść zarchiwizowane
            </button>
          </div>
        )}
      </section>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const refreshedLabel = lastRefreshedAt
    ? `Zaktualizowano ${formatRelativePL(new Date(lastRefreshedAt).toISOString()).text}`
    : null;

  return (
    <div className="space-y-4">
      {/* Nagłówek */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            <ShareIcon className="h-6 w-6 text-cyan-300" />
            Udostępnienia
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Treningi udostępnione przez innych użytkowników i przez Ciebie
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {refreshedLabel && (
            <span className="hidden text-[11px] text-slate-500 sm:inline">{refreshedLabel}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Odśwież listę udostępnień"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            {loading ? 'Odświeżam…' : 'Odśwież'}
          </button>
        </div>
      </div>

      {/* Brak konfiguracji — zamiast martwego baneru wyjaśnienie + CTA */}
      {!canShare && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <ShareIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-200">Udostępnianie wymaga konta</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
              Zaloguj się kontem powiązanym z Supabase — wtedy będziesz mógł wysyłać treningi
              innym osobom i odbierać ich propozycje.
            </p>
          </div>
        </div>
      )}

      {/* Błąd odczytu */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 p-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
          <p className="text-xs leading-relaxed text-red-200">{error}</p>
        </div>
      )}

      {/* Błąd akcji */}
      {actionError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 p-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
          </svg>
          <p className="text-xs leading-relaxed text-red-200">{actionError}</p>
        </div>
      )}

      {/* Zakładki */}
      <div role="tablist" aria-label="Kategorie udostępnień" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1.5">
        {TABS.map(t => {
          const count = tabCounts[t.id];
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setTab(t.id);
                setStatusFilter('all');
                setQuery('');
                setVisibleCount(PAGE_SIZE);
              }}
              className={`flex min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:text-sm cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-[0_10px_26px_-14px_rgba(6,182,212,1)]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-cyan-500/20 text-cyan-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Do akceptacji ── */}
      {tab === 'incoming' && (
        <div className="space-y-3">
          {pendingIncoming.length > 0 && (
            <p className="px-1 text-xs text-slate-400">
              {pendingIncoming.length} {pluralWorkout(pendingIncoming.length)} czeka na Twoją decyzję.
            </p>
          )}
          {pendingIncoming.length === 0
            ? renderEmpty(
                'Nie masz udostępnień do akceptacji',
                'Gdy ktoś udostępni Ci swój dzień treningowy, znajdziesz go tutaj.'
              )
            : pendingIncoming.map(s => renderCard(s, 'incoming'))}
        </div>
      )}

      {/* ── Odebrane ── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {renderHistoryToolbar([
            { id: 'all', label: 'Wszystkie' },
            { id: 'accepted', label: 'Przyjęte' },
            { id: 'declined', label: 'Odrzucone' },
          ])}

          {visibleHistory.length === 0 && query === '' && statusFilter === 'all'
            ? renderEmpty(
                'Brak historii',
                'Zaakceptowane i odrzucone udostępnienia pojawią się tutaj.'
              )
            : visibleHistory.length === 0
              ? renderEmpty(
                  'Nic nie pasuje do filtra',
                  'Zmień filtr statusu albo wyczyść wyszukiwanie.',
                  <SearchIcon className="h-7 w-7" />
                )
              : renderGroupedList(visibleHistory)}

          {renderArchivedSection(archivedHistory)}
        </div>
      )}

      {/* ── Wysłane ── */}
      {tab === 'outgoing' && (
        <div className="space-y-3">
          {renderHistoryToolbar([
            { id: 'all', label: 'Wszystkie' },
            { id: 'pending', label: 'Oczekujące' },
            { id: 'accepted', label: 'Przyjęte' },
            { id: 'declined', label: 'Odrzucone' },
          ])}

          {visibleOutgoing.length === 0 && query === '' && statusFilter === 'all'
            ? renderEmpty(
                'Nic jeszcze nie udostępniłeś',
                'W Planerze wybierz dzień z ćwiczeniami i użyj przycisku udostępniania.',
                <ShareIcon className="h-7 w-7" />
              )
            : visibleOutgoing.length === 0
              ? renderEmpty(
                  'Nic nie pasuje do filtra',
                  'Zmień filtr statusu albo wyczyść wyszukiwanie.',
                  <SearchIcon className="h-7 w-7" />
                )
              : renderGroupedList(visibleOutgoing)}

          {renderArchivedSection(archivedOutgoing)}
        </div>
      )}

      {/* Modal akceptacji */}
      {activeShare && (
        <AcceptShareModal
          share={activeShare}
          busyDates={busyDates}
          onAccept={async (targetDateStr) => {
            const result = await onAccept(activeShare, targetDateStr);
            if (!result.error) {
              const count = Array.isArray(activeShare.day_data?.exercises)
                ? activeShare.day_data.exercises.length
                : 0;
              onNotify?.(true, `Dodano ${count} ${pluralExercise(count)} do planu.`);
            }
            return result;
          }}
          onDecline={async () => {
            const result = await onDecline(activeShare);
            if (!result.error) {
              setActiveShare(null);
              onNotify?.(true, `Odrzucono udostępnienie od ${activeShare.owner_name || activeShare.owner_email}.`);
            }
            return result;
          }}
          onOpenPlanner={() => {
            setActiveShare(null);
            onOpenPlanner?.();
          }}
          onClose={() => setActiveShare(null)}
        />
      )}
    </div>
  );
}
