import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import DeleteAccountModal from '../auth/DeleteAccountModal';
import { LockIcon, MailIcon, TrashIcon, UserIcon } from '../icons';
import { toUserMessage } from '../../lib/errorMessages';

interface SettingsViewProps {
  onGoToHelp: () => void;
}

/**
 * Widok „Ustawienia” — profil konta, hasło i niebezpieczne strefy.
 */
export default function SettingsView({ onGoToHelp }: SettingsViewProps) {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const email = user?.email || '';

  /**
   * Czy konto ma hasło (identyfikacja email)?
   *
   * Konto zalogowane wyłącznie przez Google nie ma hasła — wtedy nie da się
   * ani zweryfikować starego, ani ustawić nowego.
   */
  const identities = user?.identities ?? [];
  const hasPasswordIdentity =
    identities.length === 0 || identities.some(i => i.provider === 'email');

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      if (error) setNameMsg({ ok: false, text: toUserMessage(error, 'Nie udało się zmienić nazwy.') });
      else setNameMsg({ ok: true, text: 'Nazwa zapisana.' });
    } catch {
      setNameMsg({ ok: false, text: 'Nie udało się zapisać nazwy.' });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ ok: false, text: 'Podaj obecne hasło.' });
      return;
    }
    if (!newPassword) {
      setPasswordMsg({ ok: false, text: 'Podaj nowe hasło.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: 'Nowe hasło musi mieć co najmniej 6 znaków.' });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMsg({ ok: false, text: 'Nowe hasło musi różnić się od obecnego.' });
      return;
    }

    setSavingPassword(true);
    try {
      // 1) Weryfikacja obecnego hasła — `updateUser` działa na podstawie sesji,
      //    więc bez tego sprawdzenia każdy z przejętą sesją zmieniłby hasło.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        setPasswordMsg({ ok: false, text: 'Obecne hasło jest nieprawidłowe.' });
        return;
      }

      // 2) Ustawienie NOWEGO hasła
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg({ ok: false, text: toUserMessage(error, 'Nie udało się zmienić hasła.') });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ ok: true, text: 'Hasło zmienione. Zaloguj się ponownie nowym hasłem.' });
    } catch {
      setPasswordMsg({ ok: false, text: 'Nie udało się zmienić hasła.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Ustawienia</h1>
        <p className="text-slate-400 text-sm mt-1">Profil konta, hasło i zarządzanie danymi</p>
      </div>

      {/* Profil */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <UserIcon className="h-4 w-4 text-violet-300" />
          Profil
        </h2>

        <form onSubmit={saveName} className="space-y-3">
          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-slate-300">
              Nazwa wyświetlana
            </label>
            <input
              id="settings-name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Jak mamy Cię nazywać?"
              className={inputClass}
              disabled={!isSupabaseConfigured}
            />
          </div>

          <div>
            <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-slate-300">
              Adres email
            </label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="settings-email"
                type="email"
                value={email}
                readOnly
                className={`${inputClass} pl-10 text-slate-400 cursor-not-allowed`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Adres email jest powiązany z kontem {isSupabaseConfigured ? 'Supabase' : '(tryb offline)'} i nie można go tu zmienić.
            </p>
          </div>

          {nameMsg && (
            <p className={`text-xs ${nameMsg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{nameMsg.text}</p>
          )}

          <button
            type="submit"
            disabled={savingName || !isSupabaseConfigured}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(139,92,246,1)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingName ? 'Zapisywanie…' : 'Zapisz profil'}
          </button>
        </form>
      </section>

      {/* Hasło */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <LockIcon className="h-4 w-4 text-violet-300" />
          Hasło
        </h2>

        <form onSubmit={savePassword} className="space-y-3 max-w-md">
          <div>
            <label htmlFor="settings-pass-current" className="mb-1.5 block text-xs font-medium text-slate-300">
              Obecne hasło
            </label>
            <input
              id="settings-pass-current"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className={inputClass}
              disabled={!isSupabaseConfigured || !hasPasswordIdentity}
            />
          </div>
          <div>
            <label htmlFor="settings-pass-new" className="mb-1.5 block text-xs font-medium text-slate-300">
              Nowe hasło
            </label>
            <input
              id="settings-pass-new"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 znaków"
              autoComplete="new-password"
              className={inputClass}
              disabled={!isSupabaseConfigured || !hasPasswordIdentity}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Nowe hasło musi mieć co najmniej 6 znaków i różnić się od obecnego.
            </p>
          </div>

          {passwordMsg && (
            <p className={`text-xs ${passwordMsg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{passwordMsg.text}</p>
          )}

          <button
            type="submit"
            disabled={savingPassword || !isSupabaseConfigured || !hasPasswordIdentity}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition-all hover:bg-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingPassword ? 'Zmienianie…' : 'Zmień hasło'}
          </button>
        </form>

        {/* Konto zalogowane przez Google nie ma hasła */}
        {!hasPasswordIdentity && (
          <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">
            Twoje konto zostało utworzone przez Google, więc nie ma hasła do zmiany.
            Jeśli chcesz je ustawić, skorzystaj z opcji „Nie pamiętasz hasła” na ekranie logowania —
            dostaniesz link na e-mail.
          </p>
        )}
      </section>

      {/* Strefa niebezpieczna */}
      <section className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5">
        <h2 className="text-base font-bold text-red-300 flex items-center gap-2 mb-2">
          <TrashIcon className="h-4 w-4" />
          Strefa niebezpieczna
        </h2>
        <p className="text-sm text-slate-300 mb-4">
          Usunięcie konta jest nieodwracalne — znikną Twoje plany treningowe, szablony i własne ćwiczenia.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20 cursor-pointer"
        >
          <TrashIcon className="h-4 w-4" />
          Usuń konto
        </button>
      </section>

      <button
        onClick={onGoToHelp}
        className="text-sm text-slate-400 hover:text-violet-300 transition-colors underline underline-offset-4"
      >
        Potrzebujesz pomocy? Przejdź do „Pomoc i wsparcie”
      </button>

      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </div>
  );
}
