/**
 * Liest eine Dezimalzahl mit Komma oder Punkt ein.
 * Gibt `undefined` für leere Eingaben und `NaN` für ungültige Eingaben zurück.
 */
export function parseDecimal(input: string): number | undefined {
  const s = input.trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return undefined;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

const formatters = new Map<number, Intl.NumberFormat>();

/** Formatiert eine Zahl deutsch mit fester Anzahl Nachkommastellen. */
export function formatDecimal(value: number, decimals = 0): string {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f.format(value);
}

/** Zahl → Eingabetext (deutsches Komma, ohne Tausenderpunkte); leer bei undefined. */
export function toInputString(value: number | undefined): string {
  return value === undefined ? '' : String(value).replace('.', ',');
}
