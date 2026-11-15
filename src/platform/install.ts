import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Android: Ereignis, mit dem die App eine eigene Installations-Schaltfläche anbieten kann. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Früh aufrufen (vor dem ersten Rendern) – das Ereignis kommt sonst eventuell zu früh. */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function useInstallPrompt(): (() => Promise<void>) | null {
  const event = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => deferred,
  );
  if (!event) return null;
  return async () => {
    await event.prompt();
    await event.userChoice;
    deferred = null;
    notify();
  };
}

/** Läuft als installierte App (vom Startbildschirm)? */
export function isStandalone(): boolean {
  return (
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Mac – erkennbar an Touch-Unterstützung.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isMobile(): boolean {
  return isIOS() || /Android/.test(navigator.userAgent);
}
