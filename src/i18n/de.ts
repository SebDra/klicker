// Alle UI-Texte zentral – erleichtert spätere Mehrsprachigkeit.
export const de = {
  appName: 'Klicker',
  nav: {
    label: 'Hauptnavigation',
    dashboard: 'Dashboard',
    items: 'Items',
    chart: 'Diagramm',
    settings: 'Einstellungen',
  },
  dashboard: {
    empty: 'Noch keine Items vorhanden.',
    emptyHint: 'Lege dein erstes Item an, um mit dem Zählen zu beginnen.',
  },
  items: {
    empty: 'Hier erscheinen alle deine Items.',
  },
  chart: {
    empty: 'Hier werden die Daten ausgewählter Items als Diagramm angezeigt.',
  },
  settings: {
    storageNote: 'Alle Daten werden ausschließlich lokal auf diesem Gerät gespeichert.',
    version: 'Version',
  },
  pwa: {
    updateAvailable: 'Eine neue Version ist verfügbar.',
    reload: 'Aktualisieren',
    offlineReady: 'Die App ist jetzt offline verfügbar.',
    close: 'Schließen',
  },
  notFound: 'Seite nicht gefunden.',
} as const;
