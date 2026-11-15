import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { ItemEditPage } from '../features/items/ItemEditPage';
import { ItemsPage } from '../features/items/ItemsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { de } from '../i18n/de';
import { Layout, Page } from './Layout';

// Die Diagramm-Bibliothek ist groß – erst laden, wenn die Seite geöffnet wird.
// Offline verfügbar bleibt sie trotzdem, weil der Service Worker alle Dateien vorab speichert.
const ChartPage = lazy(() =>
  import('../features/chart/ChartPage').then((m) => ({ default: m.ChartPage })),
);

// HashRouter: funktioniert auf statischem Hosting ohne Server-Rewrites und offline.
export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="items/new" element={<ItemEditPage />} />
          <Route path="items/:id" element={<ItemEditPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route
            path="chart"
            element={
              <Suspense fallback={<Page title={de.nav.chart}>{null}</Page>}>
                <ChartPage />
              </Suspense>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <Page title={de.appName}>
                <p>{de.notFound}</p>
              </Page>
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
