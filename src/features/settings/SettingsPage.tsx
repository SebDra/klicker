import { Page } from '../../app/Layout';
import { de } from '../../i18n/de';

// Export/Import, Theme und Speicherstatus folgen in M5.
export function SettingsPage() {
  return (
    <Page title={de.nav.settings}>
      <div className="card">
        <p>{de.settings.storageNote}</p>
        <p>
          {de.settings.version}: {__APP_VERSION__}
        </p>
      </div>
    </Page>
  );
}
