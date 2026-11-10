import { useState, useCallback, useEffect } from 'react';

/**
 * Ustawienia wyglądu (widok „Wygląd").
 *
 * Skala interfejsu działa na `html { font-size }` — Tailwind buduje rozmiary
 * w `rem`, więc cały interfejs skaluje się spójnie. Animacje wyłączamy
 * klasą `.no-animations` na `<html>` (patrz `src/index.css`).
 */

export interface AppearanceSettings {
  /** Skala interfejsu jako procent bazowego rozmiaru czcionki. */
  scale: number;
  /** Czy animacje i przejścia mają być wyłączone. */
  animations: boolean;
}

export const APPEARANCE_SCALES = [
  { value: 90, label: 'Mały', hint: '90%' },
  { value: 100, label: 'Standardowy', hint: '100%' },
  { value: 110, label: 'Duży', hint: '110%' },
  { value: 125, label: 'Bardzo duży', hint: '125%' },
] as const;

const STORAGE_KEY = 'fitplanner-appearance';

const DEFAULT_SETTINGS: AppearanceSettings = {
  scale: 100,
  animations: true,
};

function loadSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        scale: typeof parsed.scale === 'number' ? parsed.scale : DEFAULT_SETTINGS.scale,
        animations: typeof parsed.animations === 'boolean' ? parsed.animations : DEFAULT_SETTINGS.animations,
      };
    }
  } catch {
    // uszkodzony JSON — ustawienia domyślne
  }
  return DEFAULT_SETTINGS;
}

/** Nakłada ustawienia na dokument (skala + animacje). */
export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = `${settings.scale}%`;
  document.documentElement.classList.toggle('no-animations', !settings.animations);
}

export function useAppearanceStore() {
  const [settings, setSettings] = useState<AppearanceSettings>(loadSettings);

  // Ustawienia działają od razu po załadowaniu aplikacji
  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ustawienia zostają tylko w pamięci sesji
      }
      return next;
    });
  }, []);

  const setScale = useCallback((scale: number) => update({ scale }), [update]);
  const setAnimations = useCallback((animations: boolean) => update({ animations }), [update]);

  return { settings, setScale, setAnimations, update };
}
