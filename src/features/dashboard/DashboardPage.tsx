import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Page } from '../../app/Layout';
import { db } from '../../db/db';
import { de } from '../../i18n/de';

// Kacheln für Favoriten/Meistgenutzt folgen in M2.
export function DashboardPage() {
  const count = useLiveQuery(() => db.items.count(), []);

  return (
    <Page title={de.nav.dashboard}>
      {count === 0 && (
        <div className="empty-state">
          <div className="emoji" aria-hidden>
            👆
          </div>
          <p>{de.dashboard.empty}</p>
          <p>{de.dashboard.emptyHint}</p>
          <Link to="/items/new" className="btn primary">
            {de.dashboard.createFirst}
          </Link>
        </div>
      )}
      {!!count && <p className="hint center">{de.dashboard.tilesComing}</p>}
    </Page>
  );
}
