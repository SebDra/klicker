# Klicker

Offline-PWA zum Zählen und Erfassen von Werten für frei konfigurierbare Items.
Alle Daten bleiben lokal auf dem Gerät (IndexedDB). Details und Meilensteine: [PLAN.md](PLAN.md).

## Voraussetzungen

- Node.js ≥ 20 (`winget install OpenJS.NodeJS.LTS`)
- optional git (`winget install Git.Git`)

## Befehle

| Befehl             | Zweck                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| `npm install`      | Abhängigkeiten installieren                                                   |
| `npm run dev`      | Entwicklungsserver (auch im LAN erreichbar, `--host`)                         |
| `npm run build`    | Typprüfung + Produktions-Build nach `dist/`                                   |
| `npm run preview`  | Build lokal ausliefern (Port 4173, inkl. Service Worker)                      |
| `npm run check`    | Typprüfung, ESLint, Unit-Tests                                                |
| `npm run test:e2e` | Playwright-Tests (Android- und iOS-Profil); einmalig `npx playwright install` |
| `npm run format`   | Code mit Prettier formatieren                                                 |

App-Icons neu erzeugen: `powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1`

## Auf dem Handy testen

Service Worker und Installation funktionieren nur über **HTTPS** (oder `localhost`).
Zum Testen den Inhalt von `dist/` auf einem HTTPS-Hosting ablegen (z. B. GitHub Pages, Netlify)
und die Seite dann über „Zum Startbildschirm hinzufügen“ installieren.
Auf iOS ist die Installation wichtig, weil Safari sonst lokale Daten nach längerer Nichtnutzung löschen kann.

## Struktur

```
src/app/        Routing, Layout, Navigation, PWA-Update-Hinweis
src/features/   dashboard, items, chart, settings
src/i18n/       UI-Texte (de)
src/styles/     Design-Tokens, Basis-Layout (Safe Areas, Dark Mode)
tests/e2e/      Playwright
scripts/        Hilfsskripte (Icons)
```
