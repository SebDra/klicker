import { formatDecimal, parseDecimal, toInputString } from './number';

describe('parseDecimal', () => {
  it.each([
    ['12', 12],
    ['12,5', 12.5],
    ['12.5', 12.5],
    [' 7 ', 7],
    ['-3,25', -3.25],
    [',5', 0.5],
    ['12,', 12],
  ])('%s → %d', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it('leer → undefined', () => {
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('   ')).toBeUndefined();
  });

  it.each(['abc', '1,2,3', '1.2.3', '--1', '1e5'])('%s → NaN', (input) => {
    expect(parseDecimal(input)).toBeNaN();
  });
});

describe('formatDecimal / toInputString', () => {
  it('formatiert deutsch', () => {
    expect(formatDecimal(1234.5, 1)).toBe('1.234,5');
    expect(formatDecimal(80, 0)).toBe('80');
  });

  it('erzeugt Eingabetext mit Komma', () => {
    expect(toInputString(72.5)).toBe('72,5');
    expect(toInputString(undefined)).toBe('');
  });
});
