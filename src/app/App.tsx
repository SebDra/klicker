import { HashRouter, Route, Routes } from 'react-router-dom';
import { ChartPage } from '../features/chart/ChartPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ItemsPage } from '../features/items/ItemsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { de } from '../i18n/de';
import { Layout, Page } from './Layout';

// HashRouter: funktioniert auf statischem Hosting ohne Server-Rewrites und offline.
export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="chart" element={<ChartPage />} />
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
