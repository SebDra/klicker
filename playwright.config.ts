import { defineConfig, devices } from '@playwright/test';

// Lokal: installiertes Chrome nutzen (kein Browser-Download nötig; abschaltbar mit PW_CHANNEL=).
// In CI: die von Playwright mitgelieferten Browser inkl. WebKit für das iOS-Profil.
const channel = process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'chrome');
const local = channel ? { browserName: 'chromium' as const, channel } : {};

// E2E-Tests gegen den Produktions-Build (inkl. Service Worker), auf Android- und iOS-Profilen.
// Hinweis: Lokal emuliert das iOS-Profil nur Bildschirm/User-Agent in Chrome, nicht Safari.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'], ...local } },
    { name: 'ios', use: { ...devices['iPhone 14'], ...local } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
