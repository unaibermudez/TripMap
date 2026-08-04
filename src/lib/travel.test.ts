import { describe, expect, it } from 'vitest';
import { loadTrip } from '@/lib/loader';
import type { Trip } from '@/lib/schema';
import { arrivalLeg, travelModeLabel } from '@/lib/travel';

/** Tres paradas y dos legs: a →bus→ b →plane→ c. */
function makeTrip(): Trip {
  return loadTrip({
    chapters: [
      { id: 'norte', title: 'Norte', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
    ],
    stops: [
      { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'norte', title: 'A', body: '' },
      { id: 'b', name: 'B', country: 'MA', coords: [1, 0], dateStart: '2023-01-10', chapterId: 'norte', title: 'B', body: '' },
      { id: 'c', name: 'C', country: 'MA', coords: [2, 0], dateStart: '2023-01-20', chapterId: 'norte', title: 'C', body: '' },
    ],
    legs: [
      { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
      { fromStopId: 'b', toStopId: 'c', mode: 'plane' },
    ],
  });
}

describe('arrivalLeg', () => {
  it('devuelve el leg que termina en la parada', () => {
    const trip = makeTrip();

    expect(arrivalLeg(trip, 1)?.toStopId).toBe('b');
    expect(arrivalLeg(trip, 2)?.toStopId).toBe('c');
  });

  it('a la primera parada no se llega desde ninguna', () => {
    expect(arrivalLeg(makeTrip(), 0)).toBeNull();
  });

  it('fuera de rango no hay leg', () => {
    const trip = makeTrip();

    expect(arrivalLeg(trip, -1)).toBeNull();
    expect(arrivalLeg(trip, 9)).toBeNull();
  });
});

describe('travelModeLabel', () => {
  it('etiqueta todos los modos', () => {
    expect(travelModeLabel('bus')).toBe('en autobús');
    expect(travelModeLabel('train')).toBe('en tren');
    expect(travelModeLabel('car')).toBe('en coche');
    expect(travelModeLabel('boat')).toBe('en barco');
    expect(travelModeLabel('plane')).toBe('en avión');
    expect(travelModeLabel('foot')).toBe('a pie');
  });
});
