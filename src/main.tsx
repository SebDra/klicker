import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { UpdatePrompt } from './app/UpdatePrompt';
import { captureInstallPrompt, isStandalone } from './platform/install';
import { requestPersistence } from './platform/storage';
import { applyTheme } from './platform/theme';
import './styles/global.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/history.css';
import './styles/chart.css';
import './styles/settings.css';

applyTheme();
captureInstallPrompt();
// Installierte Apps erhalten dauerhaften Speicher meist ohne Rückfrage. Im Browser-Tab
// fragt z. B. Firefox nach – dort nur auf Wunsch über die Einstellungen.
if (isStandalone()) void requestPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UpdatePrompt />
  </StrictMode>,
);
