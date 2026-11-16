# Klicker

**App:** <https://sebdra.github.io/klicker/>

Offline-PWA zum Zählen und Erfassen von Werten für frei konfigurierbare Items.
Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Details und Meilensteine: [PLAN.md](PLAN.md).

## Voraussetzungen

- Node.js ≥ 20 (`winget install OpenJS.NodeJS.LTS`)
- optional git (`winget install Git.Git`)

## Befehle

| Befehl             | Zweck                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| `npm install`      | Abhängigkeiten installieren                                                |
| `npm run dev`      | Entwicklungsserver (auch im LAN erreichbar, `--host`)                      |
| `npm run build`    | Typprüfung + Produktions-Build nach `dist/`                                |
| `npm run preview`  | Build lokal ausliefern (Port 4173, inkl. Service Worker)                   |
| `npm run check`    | Typprüfung, ESLint, Unit-Tests                                             |
| `npm run test:e2e` | Playwright-Tests (Android- und iOS-Profil); lokal mit installiertem Chrome |
| `npm run format`   | Code mit Prettier formatieren                                              |

E2E mit den Playwright-Browsern (inkl. WebKit = Safari-Engine für das iOS-Profil):
einmalig `npx playwright install chromium webkit`, dann mit `PW_CHANNEL=bundled` starten.

App-Icons neu erzeugen: `powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1`

## CI und Veröffentlichen

Bei jedem Push auf `main` (und bei Pull Requests) läuft [.github/workflows/ci.yml](.github/workflows/ci.yml):
Typprüfung, Lint, Formatierung, Unit-Tests, Build sowie E2E-Tests auf Chromium (Android-Profil)
und WebKit (iOS-Profil).

Veröffentlichung auf **GitHub Pages** (aus, bis sie eingeschaltet wird):

1. Repository → Settings → Pages → Source: **GitHub Actions**
   (bei privaten Repositories nur mit kostenpflichtigem GitHub-Plan möglich).
2. Settings → Secrets and variables → Actions → Variables: `PAGES_ENABLED` = `true`.
3. Push auf `main` → die App ist danach unter `https://<benutzer>.github.io/klicker/` erreichbar.

Die App funktioniert auch in einem Unterverzeichnis (`base: './'`, Hash-Routing) und daher auf
jedem statischen HTTPS-Hosting (z. B. Netlify: Inhalt von `dist/` hochladen).

## Auf dem Handy testen

Service Worker und Installation funktionieren nur über **HTTPS** (oder `localhost`).
Seite öffnen und über „Zum Startbildschirm hinzufügen“ installieren. Auf iOS ist die Installation
wichtig, weil Safari sonst lokale Daten nach längerer Nichtnutzung löschen kann.
Checkliste: [docs/GERAETETEST.md](docs/GERAETETEST.md).

## Struktur

```
src/app/        Routing, Layout, Navigation, PWA-Update-Hinweis
src/components/ Wiederverwendbare Bausteine (Sheet, Dialog, Toast, Diagramm …)
src/db/         IndexedDB-Schema (Dexie) und Repositories
src/domain/     Fachlogik als reine Funktionen (Zeit, Aggregation, Validierung, Backup)
src/features/   dashboard, items, entries, history, chart, settings
src/platform/   Browser-Funktionen (Theme, Speicher, Installation, Dateien)
src/i18n/       UI-Texte (de)
src/styles/     Design-Tokens und Styles (Safe Areas, Dark Mode)
tests/e2e/      Playwright
scripts/        Hilfsskripte (Icons)
```
