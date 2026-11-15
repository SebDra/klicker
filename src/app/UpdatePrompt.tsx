import { useRegisterSW } from 'virtual:pwa-register/react';
import { de } from '../i18n/de';

/** Registriert den Service Worker und bietet Updates an, statt still neu zu laden. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    // Oben anzeigen, damit es nicht mit den Rückgängig-Hinweisen unten kollidiert.
    <div className="toast toast-top" role="status">
      <span>{needRefresh ? de.pwa.updateAvailable : de.pwa.offlineReady}</span>
      {needRefresh && (
        <button className="primary" onClick={() => void updateServiceWorker(true)}>
          {de.pwa.reload}
        </button>
      )}
      <button onClick={close}>{de.pwa.close}</button>
    </div>
  );
}
