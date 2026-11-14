import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getEnabledOAuthProviders } from '../../lib/supabase';
import authBgUrl from '../../assets/auth-bg.jpg';
import logoUrl from '../../assets/fitplanner-logo.png';
import { toUserMessage } from '../../lib/errorMessages';
type AuthView = 'login' | 'register' | 'reset';
type OAuthProvider = 'google';

interface AuthScreenProps {
  onDemoLogin?: () => void;
}

/* ─────────────────────────────  Ikony  ───────────────────────────── */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3.5 7 7.4 5.2a1.5 1.5 0 0 0 1.7 0L20.5 7" />
    </svg>
  );
}

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <circle cx="12" cy="15.5" r="1.2" />
    </svg>
  );
}

function EyeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.6" />
      <path d="M6.2 7.8A16.8 16.8 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4-.85" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3.5 3.5 17 17" />
    </svg>
  );
}

function UserPlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <circle cx="9.5" cy="8" r="3.5" />
      <path d="M3 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M18.5 8v6" />
      <path d="M21.5 11h-6" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* Ikony kolumny „funkcje” (lewa strona ekranu) */

function ProgressIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M3 21h18" />
      <path d="M6.5 21v-5" />
      <path d="M11 21V10" />
      <path d="M15.5 21v-7" />
      <path d="m7 9 3.6-3.6L14 8l5-4" />
      <path d="M19 4h-4" />
      <path d="M19 4v4" />
    </svg>
  );
}

function DumbbellIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.7 21.5a2 2 0 1 1-2.9-2.9l-1.7 1.8a2 2 0 1 1-2.9-2.8l6.4-6.4a2 2 0 1 1 2.9 2.8l-1.8 1.8a2 2 0 1 1 2.8 2.9z" />
      <path d="m21.5 21.5-1.4-1.4" />
      <path d="m3.5 3.5 1.4 1.4" />
      <path d="m18 3 3 3" />
      <path d="m3 18 3-3" />
      <path d="m6.5 6.5 3.5 3.5" />
      <path d="m14 14 3.5 3.5" />
    </svg>
  );
}

function TrophyIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} {...stroke}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.7V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.7V17c0 .55.47.98.97 1.21 1.18.55 2 2.04 2 3.79" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

/* Logo dostawców tożsamości */

function GoogleIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

/* ─────────────────────────────  Komponent  ───────────────────────────── */

export default function AuthScreen({ onDemoLogin }: AuthScreenProps) {
  const { signIn, signUp, resetPassword, signInWithOAuth, loading } = useAuthStore();
  const [view, setView] = useState<AuthView>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  // Czy logowanie przez Google jest włączone w projekcie Supabase.
  // Startujemy optymistycznie (przycisk widoczny od razu), a chowamy go dopiero
  // po potwierdzeniu z /auth/v1/settings — dzięki temu logowanie działa nawet,
  // gdy zapytanie o ustawienia się nie powiedzie.
  const [googleEnabled, setGoogleEnabled] = useState(true);

  /**
   * Obsługa powrotu z logowania OAuth:
   *  1. Supabase przekierowuje tu błędy (`?error=...`) — trzeba je pokazać
   *     użytkownikowi i posprzątać URL, inaczej ekran wraca przyciskiem F5.
   *  2. Sprawdzamy, czy logowanie przez Google jest włączone, żeby nie
   *     pokazywać przycisku prowadzącego na surowy błąd 400 z Supabase.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      const messages: Record<string, string> = {
        access_denied: 'Logowanie zostało anulowane.',
        server_error: 'Dostawca logowania zwrócił błąd. Spróbuj ponownie.',
        validation_failed: 'Ten dostawca logowania nie jest skonfigurowany.',
        bad_oauth_callback: 'Nieprawidłowy adres powrotu. Sprawdź konfigurację adresów przekierowania w Supabase.',
      };
      setError(messages[oauthError] ?? 'Logowanie nie powiodło się. Spróbuj ponownie.');
      // czyścimy URL, żeby odświeżenie strony nie pokazywało tego samego błędu
      window.history.replaceState({}, '', window.location.pathname);
    } else if (window.location.pathname !== '/') {
      // Aplikacja nie ma routingu URL — każdy inny adres oznacza, że Supabase
      // cofnął się na adres produkcyjny (brak originu na liście Redirect URLs).
      setError(
        'Logowanie nie wróciło do aplikacji. Sprawdź, czy adres tej aplikacji ' +
        'znajduje się na liście Redirect URLs w Supabase (Authentication → URL Configuration).'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }

    getEnabledOAuthProviders().then(providers => {
      // Gdy nie uda się pobrać ustawień — zostawiamy przycisk (działamy optymistycznie)
      if (!providers) return;
      setGoogleEnabled(providers.google !== false);
    });
  }, []);

  const clearMessages = () => { setError(null); setSuccessMsg(null); };

  const switchView = (next: AuthView) => {
    setView(next);
    clearMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) { setError('Wypełnij wszystkie pola.'); return; }
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message.includes('Invalid login')) setError('Nieprawidłowy email lub hasło.');
      else if (error.message.includes('Email not confirmed')) setError('Najpierw potwierdź adres email — sprawdź swoją skrzynkę pocztową.');
      else setError(toUserMessage(error, 'Logowanie nie powiodło się. Spróbuj ponownie.'));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!fullName.trim()) { setError('Podaj swoje imię.'); return; }
    if (!email) { setError('Podaj adres email.'); return; }
    if (password.length < 6) { setError('Hasło musi mieć co najmniej 6 znaków.'); return; }
    if (password !== confirmPassword) { setError('Hasła nie są zgodne.'); return; }
    const { error, needsConfirmation } = await signUp(email, password, fullName);
    if (error) {
      if (error.message.includes('already registered')) setError('Ten email jest już zarejestrowany.');
      else setError(toUserMessage(error, 'Nie udało się założyć konta. Spróbuj ponownie.'));
    } else if (needsConfirmation) {
      setSuccessMsg(`Konto zostało utworzone! Wysłaliśmy link potwierdzający na adres ${email}. Kliknij w link w emailu, aby aktywować konto.`);
      setView('login');
    } else {
      setSuccessMsg('Konto zostało utworzone! Możesz się teraz zalogować.');
      setView('login');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email) { setError('Podaj adres email.'); return; }
    const { error } = await resetPassword(email);
    if (error) setError(toUserMessage(error, 'Nie udało się wysłać linku do resetowania hasła.'));
    else setSuccessMsg('Link do resetowania hasła został wysłany na podany adres email.');
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    clearMessages();
    setOauthProvider(provider);
    const { error } = await signInWithOAuth(provider);
    setOauthProvider(null);
    if (error) {
      setError(
        toUserMessage(error, '') ||
        'Logowanie przez Google nie jest skonfigurowane. Użyj logowania emailem i hasłem.'
      );
    }
  };

  const isLogin = view === 'login';
  const isRegister = view === 'register';

  return (
    <div className="relative isolate min-h-[100dvh] w-full overflow-x-hidden bg-[#060d1f] text-slate-100">
      {/* ── Tło: siłownia + przyciemnienie ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <img
          src={authBgUrl}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[#060d1f]/72" />
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_50%_45%,rgba(8,145,178,0.28),transparent_72%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,13,31,0.75)_0%,rgba(6,13,31,0.2)_30%,rgba(6,13,31,0.9)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col items-center gap-8 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:py-10">
        {/* ── Nagłówek marketingowy (mobile: na górze, desktop: prawa kolumna) ── */}
        <div className="order-1 w-full text-center lg:order-3 lg:w-auto lg:justify-self-end lg:self-start lg:pt-12 lg:text-left">
          <h2 className="text-[28px] font-extrabold italic leading-[1.15] tracking-tight sm:text-4xl lg:text-[42px]">
            <span className="block text-white">Planuj treningi.</span>
            <span className="block bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-500 bg-clip-text text-transparent">
              Śledź postępy.
            </span>
            <span className="block text-white">Osiągaj więcej.</span>
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-40 rounded-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-transparent lg:mx-0" />
        </div>

        {/* ── Kolumna środkowa: logo + karta ── */}
        <div className="order-2 flex w-full flex-col items-center">
          {/* Logo */}
          <div className="mb-5 flex items-center justify-center gap-3 sm:mb-6">
            <img
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="h-11 w-auto drop-shadow-[0_0_22px_rgba(6,182,212,0.55)] sm:h-14"
            />
            <div className="text-left">
              <h1 className="text-2xl font-extrabold leading-none tracking-tight text-white sm:text-4xl">
                FitPlanner
              </h1>
              <p className="mt-1.5 text-xs text-slate-300/90 sm:text-sm">
                Twój osobisty trener w kieszeni
              </p>
            </div>
          </div>

          {/* Karta */}
          <div className="w-full max-w-[470px] rounded-[26px] border border-cyan-400/30 bg-[#0d1b38]/70 p-1.5 shadow-[0_30px_90px_-30px_rgba(8,145,178,0.9)] backdrop-blur-2xl lg:max-w-[520px]">
            <div className="rounded-[20px] bg-[#070f24]/50 px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
              {/* Przełącznik Zaloguj / Zarejestruj */}
              {view !== 'reset' && (
                <div role="tablist" aria-label="Logowanie lub rejestracja" className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
                  <button
                    role="tab"
                    type="button"
                    aria-selected={isLogin}
                    onClick={() => switchView('login')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      isLogin
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-[0_10px_24px_-10px_rgba(6,182,212,1)]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <MailIcon className="h-[18px] w-[18px]" />
                    Zaloguj się
                  </button>
                  <button
                    role="tab"
                    type="button"
                    aria-selected={isRegister}
                    onClick={() => switchView('register')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      isRegister
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-[0_10px_24px_-10px_rgba(6,182,212,1)]'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <UserPlusIcon className="h-[18px] w-[18px]" />
                    Zarejestruj się
                  </button>
                </div>
              )}

              {/* Komunikaty */}
              {error && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              {successMsg && (
                <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-emerald-300">{successMsg}</p>
                </div>
              )}

              {/* ── LOGOWANIE ── */}
              {isLogin && (
                <form onSubmit={handleLogin} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Adres email
                    </label>
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="twoj@email.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Hasło
                    </label>
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => switchView('reset')}
                    className="text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    Nie pamiętasz hasła?
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                        Logowanie...
                      </>
                    ) : (
                      <>
                        Zaloguj się
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── REJESTRACJA ── */}
              {isRegister && (
                <form onSubmit={handleRegister} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Imię i nazwisko
                    </label>
                    <div className="relative">
                      <UserPlusIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-name"
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Jan Kowalski"
                        autoComplete="name"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Adres email
                    </label>
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="twoj@email.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Hasło
                    </label>
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 6 znaków"
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>

                    {/* Siła hasła */}
                    {password.length > 0 && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                password.length >= i * 3
                                  ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-orange-500' : i <= 3 ? 'bg-yellow-500' : 'bg-emerald-500'
                                  : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {password.length < 6 ? 'Za krótkie' : password.length < 8 ? 'Słabe' : password.length < 10 ? 'Dobre' : 'Silne'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="auth-confirm" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Powtórz hasło
                    </label>
                    <div className="relative">
                      <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-confirm"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className={`w-full rounded-xl border bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/30'
                            : 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-500/30'
                        }`}
                      />
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="mt-1 text-xs text-red-400">Hasła nie są zgodne</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                        Rejestracja...
                      </>
                    ) : (
                      <>
                        Utwórz konto
                        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── RESET HASŁA ── */}
              {view === 'reset' && (
                <form onSubmit={handleReset} className="mt-5 space-y-4">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10">
                      <LockIcon className="h-6 w-6 text-cyan-300" />
                    </div>
                    <h3 className="font-semibold text-white">Reset hasła</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Wyślemy Ci link do zresetowania hasła
                    </p>
                  </div>

                  <div>
                    <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-200">
                      Adres email
                    </label>
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="twoj@email.com"
                        autoComplete="email"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon className="h-4 w-4 animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      'Wyślij link resetujący'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="flex w-full items-center justify-center gap-1 py-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Wróć do logowania
                  </button>
                </form>
              )}

              {/* ── Logowanie przez dostawców ── */}
              {/* Pokazujemy tylko tych dostawców, którzy są włączeni w projekcie
                  Supabase — kliknięcie w nieskonfigurowany provider kończyłoby się
                  surowym ekranem JSON z błędem 400. */}
              {view !== 'reset' && googleEnabled && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">lub</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={oauthProvider !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-3 text-sm font-medium text-white transition-all hover:border-cyan-400/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {oauthProvider === 'google'
                      ? <SpinnerIcon className="h-4 w-4 animate-spin" />
                      : <GoogleIcon />}
                    {oauthProvider === 'google' ? 'Łączenie...' : 'Kontynuuj z Google'}
                  </button>
                </>
              )}

              {/* Podpowiedź dla developera — adres dev musi być na liście Redirect URLs */}
              {view !== 'reset' && import.meta.env.DEV && (
                <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                  Tryb dev: adres <span className="text-slate-400">{window.location.origin}</span> musi być
                  w Supabase → Authentication → URL Configuration → Redirect URLs,
                  inaczej logowanie nie wróci tu (<span className="text-slate-400">localhost</span> i{' '}
                  <span className="text-slate-400">127.0.0.1</span> to dla Supabase dwa różne adresy).
                </p>
              )}

              {/* ── Stopka karty ── */}
              <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldIcon className="h-4 w-4 text-slate-500" />
                Twoje dane są bezpieczne i szyfrowane
              </p>
            </div>
          </div>

          {/* ── Przełącznik logowanie / rejestracja pod kartą ── */}
          {view !== 'reset' && (
            <p className="mt-5 text-center text-sm text-slate-300">
              {isRegister ? (
                <>
                  Masz już konto?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    Zaloguj się
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  Nie masz konta?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="inline-flex items-center gap-1 font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    Zarejestruj się
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </p>
          )}

          {/* Tryb demo (bez kona) */}
          {onDemoLogin && (
            <button
              type="button"
              onClick={onDemoLogin}
              className="mt-4 w-full max-w-[470px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 transition-all hover:border-cyan-400/30 hover:bg-white/[0.07] hover:text-white lg:max-w-[520px]"
            >
              Wypróbuj bez rejestracji (Demo)
            </button>
          )}
        </div>

        {/* ── Kolumna funkcji (mobile: pod kartą, desktop: lewa strona) ── */}
        <div className="order-3 mt-2 flex w-full max-w-[420px] flex-col gap-5 lg:order-1 lg:mt-0 lg:max-w-[320px] lg:justify-self-end lg:-translate-y-24">
          <Feature
            icon={<ProgressIcon />}
            title="Śledź postępy"
            description="Monitoruj swoje wyniki i zobacz realny progres."
          />
          <Feature
            icon={<DumbbellIcon />}
            title="Planuj treningi"
            description="Twórz spersonalizowane plany treningowe."
          />
          <Feature
            icon={<TrophyIcon />}
            title="Realizuj cele"
            description="Przekraczaj swoje granice."
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────  Element pomocniczy  ───────────────────────────── */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-200 shadow-lg shadow-cyan-950/60">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-white sm:text-base">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-300/85">{description}</p>
      </div>
    </div>
  );
}
