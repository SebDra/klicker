# Gerätetest-Checkliste (M6)

Automatisch abgedeckt (bei jedem Push in CI): Typprüfung, Lint, 123 Unit-/Komponententests,
E2E-Abläufe auf Android-Chromium und iOS-WebKit (Zählen + Rückgängig, Blutdruck + Diagramm,
Backup-Download; Offline-Betrieb nur auf Chromium).

Die folgenden Punkte lassen sich **nur auf echten Geräten** prüfen. Voraussetzung: Die App ist
per HTTPS erreichbar (siehe README, „Veröffentlichen“).

| #   | Prüfung                                                                                        | Android (Chrome) | iPhone (Safari) |
| --- | ---------------------------------------------------------------------------------------------- | ---------------- | --------------- |
| 1   | Seite öffnen: Dashboard zeigt Installationshinweis                                             | ☐                | ☐               |
| 2   | Installieren (Android: Button in Einstellungen; iOS: Teilen → Zum Home-Bildschirm)             | ☐                | ☐               |
| 3   | App vom Startbildschirm: ohne Browserleiste, Icon und Name korrekt, Statusleiste passt         | ☐                | ☐               |
| 4   | Notch/Home-Indikator verdecken nichts (Kopfzeile, untere Navigation, Sheets)                   | ☐                | ☐               |
| 5   | Einstellungen → Speicher: „Dauerhafter Speicher aktiv“                                         | ☐                | ☐ (evtl. n. v.) |
| 6   | Item anlegen: Tastatur verdeckt Eingaben nicht, kein Hineinzoomen in Felder                    | ☐                | ☐               |
| 7   | Emoji über „Eigenes Emoji“ mit der System-Emoji-Tastatur eingeben                              | ☐                | ☐               |
| 8   | Kachel antippen: Zähler +1, Rückgängig; Vibration (nur Android)                                | ☐                | ☐               |
| 9   | Langes Drücken: Menü öffnet, **kein** Systemmenü/Textauswahl                                   | ☐                | ☐               |
| 10  | Wert-Item: Zifferntastatur mit Komma, Werte speichern                                          | ☐                | ☐               |
| 11  | Zeitpunkt ändern (Datum/Uhrzeit-Auswahl des Systems)                                           | ☐                | ☐               |
| 12  | Diagramm: Wischen/Antippen zeigt Tooltip, Hoch-/Querformat                                     | ☐                | ☐               |
| 13  | Backup speichern → Teilen-Menü → „In Dateien sichern“ / Drive                                  | ☐                | ☐               |
| 14  | Backup einspielen über Dateiauswahl (Ersetzen + Zusammenführen)                                | ☐                | ☐               |
| 15  | CSV in Excel/Numbers öffnen: Umlaute, Spalten, Dezimalkomma korrekt                            | ☐                | ☐               |
| 16  | Flugmodus: App startet, alle Seiten inkl. Diagramm funktionieren                               | ☐                | ☐               |
| 17  | Über Mitternacht offen lassen / am nächsten Tag öffnen: Tageszähler steht auf 0                | ☐                | ☐               |
| 18  | Update: neue Version pushen → Hinweis „Neue Version verfügbar“ → Aktualisieren, Daten erhalten | ☐                | ☐               |
| 19  | Hell/Dunkel: System-Umschaltung und feste Auswahl in den Einstellungen                         | ☐                | ☐               |
| 20  | Mehrere Tage nutzen, App schließen/wiederöffnen: keine Daten verloren                          | ☐                | ☐               |

Gefundene Probleme bitte mit Gerät, OS-Version und Schritten notieren.
