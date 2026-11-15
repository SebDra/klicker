import { Page } from '../../app/Layout';
import { de } from '../../i18n/de';

// Platzhalter – Kacheln für Favoriten/Meistgenutzt folgen in M2.
export function DashboardPage() {
  return (
    <Page title={de.nav.dashboard}>
      <div className="empty-state">
        <div className="emoji" aria-hidden>
          👆
        </div>
        <p>{de.dashboard.empty}</p>
        <p>{de.dashboard.emptyHint}</p>
      </div>
    </Page>
  );
}
