import { describe, expect, it } from 'vitest';
import { formatDateRange, formatShortDay } from '@/lib/dates';

describe('formatShortDay', () => {
  it('da el día y el mes, sin cero delante', () => {
    expect(formatShortDay('2023-01-05')).toBe('5 ene');
  });

  it('no corre la fecha por el huso horario', () => {
    // `new Date('2023-01-01')` es medianoche UTC, que en Madrid o en Nuakchot
    // se leería como el 31 de diciembre.
    expect(formatShortDay('2023-01-01')).toBe('1 ene');
    expect(formatShortDay('2023-12-31')).toBe('31 dic');
  });

  it('rechaza lo que no sea una fecha ISO', () => {
    expect(() => formatShortDay('2023-1-5')).toThrow(/YYYY-MM-DD/);
    expect(() => formatShortDay('')).toThrow(/YYYY-MM-DD/);
  });

  it('rechaza un mes que no existe', () => {
    expect(() => formatShortDay('2023-13-01')).toThrow(/13/);
  });
});

describe('formatDateRange', () => {
  it('sin fecha de fin da una fecha suelta', () => {
    expect(formatDateRange('2023-01-10')).toBe('10 ene 2023');
  });

  it('con el mismo día en los dos extremos no repite la fecha', () => {
    expect(formatDateRange('2023-01-10', '2023-01-10')).toBe('10 ene 2023');
  });

  it('dentro del mismo mes solo repite los días', () => {
    expect(formatDateRange('2023-01-10', '2023-01-14')).toBe('10–14 ene 2023');
  });

  it('dentro del mismo año no repite el año', () => {
    expect(formatDateRange('2023-01-27', '2023-02-02')).toBe('27 ene – 2 feb 2023');
  });

  it('entre años distintos escribe las dos fechas enteras', () => {
    expect(formatDateRange('2023-11-30', '2024-04-05')).toBe('30 nov 2023 – 5 abr 2024');
  });
});
