// Kategoriale Palette (feste Reihenfolge, validiert für Farbfehlsichtigkeit gegen die
// App-Flächen #ffffff bzw. #1e293b). Hell: drei Farben < 3:1 Kontrast → Tabellenansicht vorhanden.
export const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
} as const;

/** Diagramm-Chrome passend zu den App-Tokens (Fläche, Text, Hilfslinien). */
export const CHART_CHROME = {
  light: {
    surface: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    grid: '#e2e8f0',
    axis: '#cbd5e1',
    border: 'rgba(15, 23, 42, 0.12)',
  },
  dark: {
    surface: '#1e293b',
    text: '#f1f5f9',
    muted: '#94a3b8',
    grid: '#334155',
    axis: '#475569',
    border: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

export type ColorScheme = keyof typeof SERIES_COLORS;
