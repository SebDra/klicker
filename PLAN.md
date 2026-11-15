# Klicker – Projektplan

Stand: 15.11.2026 · Status: M0–M5 abgeschlossen (Setup, Item-Verwaltung, Dashboard, Verlauf,
Diagramm, Einstellungen/Backup). M6: CI mit E2E-Tests (Chromium + WebKit) und automatischem
Deployment auf https://sebdra.github.io/klicker/ läuft; offen: Tests auf echten Geräten
(docs/GERAETETEST.md)

Abweichung in M1: Die Item-Sortierung erfolgt über einen Sortiermodus mit ↑/↓-Buttons statt
Drag & Drop (zuverlässiger mit Touch-Bedienung und Screenreadern).

Präzisierungen in M2:

- „Meistgenutzt“ zeigt nur Items mit Nutzung in den letzten 14 Tagen. Alle übrigen aktiven Items
  stehen unter „Weitere Items“ (eingeklappt; ausgeklappt, solange es weder Favoriten noch Nutzung gibt).
- Wert-Items: mindestens ein Feld muss ausgefüllt sein, Werte werden auf die Nachkommastellen gerundet.
- Rückdatieren/Notiz bei Zähler-Items über langes Drücken → „Mit Zeitpunkt / Notiz erfassen“.

Abweichung in M4: Statt eines Diagramms mit zwei Y-Achsen gibt es **ein Diagramm je Einheit**
untereinander mit gemeinsamer Zeitachse (zwei Skalen in einem Bild suggerieren Zusammenhänge,
die nicht existieren). Dadurch entfällt auch die Grenze von zwei Einheiten. Weitere Details:
höchstens 8 Datenreihen (feste, farbfehlsichtigkeitsgeprüfte Palette; jede Reihe behält ihre
Farbe), Tabellenansicht zuschaltbar, Einteilungen mit mehr als 400 Abschnitten gesperrt,
letzte Auswahl wird gespeichert, ohne gespeicherte Auswahl sind die Favoriten vorausgewählt.

## 1. Ziel

Mobile Web-App (Android/iOS) zum schnellen Erfassen von Ereignissen und Messwerten für frei
konfigurierbare „Items“. Eine Aktivierung erhöht einen Zähler oder fragt Werte ab
(z. B. Blutdruck, Gewicht). Jede Aktivierung wird mit Zeitstempel gespeichert. Alle Daten bleiben
lokal auf dem Gerät.

## 2. Getroffene Entscheidungen

| Thema        | Entscheidung                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plattform    | Installierbare PWA, kein App Store                                                                                                                          |
| Framework    | React + TypeScript, Build mit Vite                                                                                                                          |
| Speicherung  | IndexedDB über Dexie.js, kein Backend                                                                                                                       |
| Offline      | Service Worker (vite-plugin-pwa / Workbox)                                                                                                                  |
| Reset        | Automatisch um 00:00, pro Item ein- oder ausschaltbar                                                                                                       |
| Zählschritt  | Immer +1, mit Rückgängig-Toast nach jeder Aktivierung                                                                                                       |
| Werte        | Mehrere Zahlenfelder pro Item (z. B. Sys/Dia/Puls) mit Einheit, Min/Max und Nachkommastellen                                                                |
| Eintrag      | Optionale Notiz; Zeitpunkt ist mit „jetzt“ vorbelegt und kann rückdatiert werden                                                                            |
| Meistgenutzt | Top 8 nach Anzahl der Einträge in den letzten 14 Tagen, ohne Favoriten                                                                                      |
| Diagramm     | Ein Diagramm je Einheit (siehe Abweichung M4); Zähler als Balken (Summe pro Zeitabschnitt), Werte als Linie (Mittelwert pro Abschnitt, Min/Max zuschaltbar) |
| Icons        | Nur Emojis                                                                                                                                                  |
| Sicherheit   | Vorerst keine PIN oder Verschlüsselung                                                                                                                      |
| Sprache      | Nur Deutsch (Texte trotzdem zentral ablegen)                                                                                                                |
| Backup       | Export/Import als JSON (komplett) und CSV (Einträge)                                                                                                        |

## 3. Voraussetzungen (Entwicklungsrechner)

Auf dem Rechner sind aktuell **weder Node.js noch git** installiert. Für die Umsetzung braucht es:

- Node.js LTS (z. B. `winget install OpenJS.NodeJS.LTS`)
- git (z. B. `winget install Git.Git`)
- Zum Testen auf dem Handy: HTTPS-Hosting (GitHub Pages, Netlify o. ä.) oder ein lokaler Tunnel,
  weil Service Worker nur über HTTPS (oder localhost) laufen.

## 4. Tech-Stack

- Vite, React 18, TypeScript (strict)
- Dexie.js + dexie-react-hooks (`useLiveQuery`)
- React Router (Hash-Routing, damit die App auf statischem Hosting läuft)
- Apache ECharts (Zeitachse, mehrere Y-Achsen, Balken und Linien)
- date-fns mit Locale `de`
- vite-plugin-pwa (Manifest, Service Worker, Update-Hinweis)
- Emoji-Auswahl: kompakte eigene Liste nach Kategorien, mit Suche
- Qualität: ESLint, Prettier, Vitest, Playwright (Profile Pixel und iPhone)

## 5. Datenmodell (IndexedDB, Dexie)

```ts
type ItemType = 'counter' | 'value';

interface ValueField {
  key: string; // stabil, z. B. "sys"
  name: string; // "Systole"
  unit?: string; // "mmHg"
  min?: number;
  max?: number;
  decimals: number; // 0..3
}

interface Item {
  id: string; // UUID
  name: string; // Pflicht, max. 60 Zeichen
  label?: string; // max. 20 Zeichen
  memo?: string;
  icon: string; // Emoji
  type: ItemType;
  fields: ValueField[]; // leer bei 'counter'
  dailyReset: boolean; // Standard: true
  favorite: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Entry {
  id: string;
  itemId: string;
  timestamp: number; // ms seit Epoch
  values?: Record<string, number>; // fieldKey -> Wert
  note?: string;
  createdAt: number;
}
```

Indizes: `items: id, sortOrder, favorite, archived` · `entries: id, itemId, timestamp, [itemId+timestamp]`

Regeln:

- Der **Zählerstand wird nicht gespeichert**, sondern berechnet: Einträge ab heute 00:00 (bei
  `dailyReset`) bzw. alle Einträge (ohne Reset). Die Historie bleibt also immer vollständig.
- Ein Item mit Einträgen wird beim Löschen standardmäßig archiviert; endgültiges Löschen
  (inklusive Einträge) nur nach einer Bestätigung.
- Für Datenbank-Migrationen wird Dexie-Versionierung genutzt, ab Version 1.
- Beim Start wird `navigator.storage.persist()` angefragt; der Status steht in den Einstellungen.

## 6. Ansichten

1. **Dashboard** (Startseite)
   - Bereich „Favoriten“ und Bereich „Meistgenutzt“ als Kachelraster (2–4 Spalten, je nach Breite)
   - Kachel: Emoji, Label (ersatzweise der Name, gekürzt), heutiger Zählerstand bzw. letzter Wert
   - Antippen: Zähler-Item → sofort Eintrag + Toast „Rückgängig“; Wert-Item → Eingabe-Sheet
   - Langes Drücken: Menü mit Verlauf, Bearbeiten, Favorit an/aus
   - Leerer Zustand: Hinweis und Button „Erstes Item anlegen“
2. **Items:** Liste aller Items mit Suche, Sortierung per Drag & Drop, Filter „archiviert“, Button „+“
3. **Item-Konfiguration:** Name, Label, Memo (mit Zeichenzählern), Emoji, Typ, Felder
   (hinzufügen, sortieren, entfernen), täglicher Reset, Favorit, Archivieren/Löschen
4. **Eingabe-Sheet:** ein Feld pro Wert (`inputmode="decimal"`, Komma und Punkt erlaubt),
   Prüfung gegen Min/Max, Zeitpunkt (Standard „jetzt“), Notiz
5. **Verlauf:** Einträge eines oder aller Items, nach Tagen gruppiert, bearbeiten und löschen
6. **Diagramm**
   - Items mehrfach auswählbar
   - Start und Ende, mit Schnellauswahl (7 T / 30 T / 3 M / 1 J)
   - Einteilung in Stunden, Tage, Wochen (ISO, Montag) oder Monate
   - Bei mehr als zwei Einheiten: Hinweis, bzw. die weiteren Items werden ausgeblendet
   - Die letzte Auswahl wird gespeichert
7. **Einstellungen:** Export/Import (JSON, CSV), Hell/Dunkel/System, Speicherstatus,
   Installationshilfe für iOS und Android, Version

Navigation: Leiste unten mit Dashboard · Items · Diagramm · Einstellungen.

## 7. Mobile-Anforderungen

- `viewport-fit=cover` und `env(safe-area-inset-*)` für Notch und Home-Indikator
- Touch-Ziele mindestens 48 px; keine Funktion, die nur über Hover erreichbar ist
- Standalone-Manifest, App-Icons (192/512, maskable), `apple-touch-icon`, Splash-Farben
- Vibrationsfeedback, wo verfügbar (Android; iOS unterstützt es im Browser nicht)
- Dark Mode nach Systemeinstellung, 24-Stunden-Format, deutsche Zahlen- und Datumsformate
- Installationshinweis beim ersten Start; auf iOS mit Anleitung „Teilen → Zum Home-Bildschirm“
- Ziel: Lighthouse PWA/Performance/Accessibility ≥ 90

## 8. Projektstruktur (geplant)

```
src/
  db/          Dexie-Schema, Repositories, Migrationen
  domain/      Zählerlogik, Ranking, Aggregation (pure Funktionen, gut testbar)
  features/
    dashboard/ items/ entry/ history/ chart/ settings/
  components/  Kachel, BottomSheet, Toast, EmojiPicker, ...
  i18n/        de.ts
  app/         Routing, Layout, Theme
public/        Icons, Manifest-Assets
tests/         Playwright E2E
```

## 9. Meilensteine

| #   | Inhalt                                                 | Ergebnis / Abnahme                             |
| --- | ------------------------------------------------------ | ---------------------------------------------- |
| M0  | Setup: Vite, TS, Lint, Tests, PWA-Grundgerüst, Hosting | Leere App installierbar, läuft offline         |
| M1  | Datenlayer, Item-Liste, Item-Konfiguration             | Items anlegen, bearbeiten, archivieren         |
| M2  | Dashboard, Aktivierung, Eingabe-Sheet, Rückgängig      | Zählen und Werte erfassen auf dem Handy        |
| M3  | Verlauf                                                | Einträge bearbeiten, löschen, rückdatieren     |
| M4  | Diagramm                                               | Alle vier Einteilungen, zwei Y-Achsen, Min/Max |
| M5  | Einstellungen, Export/Import, dauerhafter Speicher     | Backup und Wiederherstellung funktionieren     |
| M6  | Gerätetests (Android Chrome, iOS Safari), Feinschliff  | Abnahme auf echten Geräten                     |

## 10. Tests

- Unit (Vitest): Reset-Grenzen (inklusive Sommer-/Winterzeit), Ranking, Aggregation pro
  Zeitabschnitt, Validierung, Export/Import ohne Datenverlust
- E2E (Playwright, mobile Profile): Item anlegen → zählen → rückgängig → Wert erfassen →
  Diagramm prüfen
- Manuell: Installation und Offline-Betrieb auf iOS und Android, Neustart, App-Update

## 11. Risiken

- **iOS löscht lokale Daten** bei nicht installierter Nutzung → Installationshinweis,
  `storage.persist()`, Erinnerung an das Backup
- **Datenverlust beim Gerätewechsel** → Export/Import; eine Synchronisation ist bewusst nicht vorgesehen
- **Zeitzonen und Sommerzeit** → Zeitabschnitte und Reset immer in lokaler Zeit über date-fns berechnen, mit Tests
