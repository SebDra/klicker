import { Page } from '../../app/Layout';
import { de } from '../../i18n/de';

// Platzhalter – Diagramm-Ansicht folgt in M4.
export function ChartPage() {
  return (
    <Page title={de.nav.chart}>
      <div className="empty-state">
        <p>{de.chart.empty}</p>
      </div>
    </Page>
  );
}
