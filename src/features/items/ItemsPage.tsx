import { Page } from '../../app/Layout';
import { de } from '../../i18n/de';

// Platzhalter – Item-Liste und Konfiguration folgen in M1.
export function ItemsPage() {
  return (
    <Page title={de.nav.items}>
      <div className="empty-state">
        <p>{de.items.empty}</p>
      </div>
    </Page>
  );
}
