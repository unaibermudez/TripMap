import { describe, expect, it } from 'vitest';
import { loadTrip } from '@/lib/loader';
import { lineCollection, stopIndexOf, stopsCollection } from '@/lib/mapData';
import { partialRouteLine, legGeometries, routeLine } from '@/lib/route';
import type { Trip } from '@/lib/schema';

/** Cuatro paradas en dos capítulos: "norte" es a y b, "sur" es c y d. */
function makeTrip(): Trip {
  return loadTrip({
    chapters: [
      { id: 'norte', title: 'Norte', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
      { id: 'sur', title: 'Sur', dateStart: '2023-02-01', dateEnd: '2023-02-28', color: '#0f766e' },
    ],
    stops: [
      { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'norte', title: 'A', body: '' },
      { id: 'b', name: 'B', country: 'MA', coords: [1, 0], dateStart: '2023-01-10', chapterId: 'norte', title: 'B', body: '' },
      { id: 'c', name: 'C', country: 'MR', coords: [2, 1], dateStart: '2023-02-01', chapterId: 'sur', title: 'C', body: '' },
      { id: 'd', name: 'D', country: 'MR', coords: [3, 1], dateStart: '2023-02-10', chapterId: 'sur', title: 'D', body: '' },
    ],
    legs: [
      { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
      { fromStopId: 'b', toStopId: 'c', mode: 'car' },
      { fromStopId: 'c', toStopId: 'd', mode: 'bus' },
    ],
  });
}

describe('stopsCollection', () => {
  it('da un punto por parada, en el orden del fichero', () => {
    const { features } = stopsCollection(makeTrip());

    expect(features).toHaveLength(4);
    expect(features.map((feature) => feature.properties.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(features.map((feature) => feature.properties.index)).toEqual([0, 1, 2, 3]);
  });

  it('lleva las coordenadas de la parada', () => {
    const first = stopsCollection(makeTrip()).features[0];

    expect(first?.geometry).toEqual({ type: 'Point', coordinates: [0, 0] });
  });

  it('pinta cada parada con el color de su capítulo', () => {
    const { features } = stopsCollection(makeTrip());

    expect(features.map((feature) => feature.properties.color)).toEqual([
      '#c2410c',
      '#c2410c',
      '#0f766e',
      '#0f766e',
    ]);
  });

  it('falla si una parada apunta a un capítulo que no existe', () => {
    const trip = makeTrip();
    const stop = trip.stops[0];
    if (stop === undefined) throw new Error('El fixture tiene paradas.');
    stop.chapterId = 'este';

    expect(() => stopsCollection(trip)).toThrow(/"este"/);
  });
});

describe('lineCollection', () => {
  it('envuelve la ruta en una colección de un solo feature', () => {
    const trip = makeTrip();
    const line = routeLine(legGeometries(trip));
    const collection = lineCollection(line);

    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toBe(line);
  });

  it('sin ruta devuelve una colección vacía', () => {
    // Es el caso de la parada 0: todavía no se ha recorrido nada.
    const collection = lineCollection(partialRouteLine(legGeometries(makeTrip()), 0));

    expect(collection).toEqual({ type: 'FeatureCollection', features: [] });
  });
});

describe('stopIndexOf', () => {
  it('lee el índice de las propiedades de un feature', () => {
    const feature = stopsCollection(makeTrip()).features[2];

    expect(stopIndexOf(feature?.properties)).toBe(2);
  });

  it('acepta el índice 0', () => {
    expect(stopIndexOf({ index: 0 })).toBe(0);
  });

  it('rechaza lo que no sea un índice de parada', () => {
    expect(stopIndexOf(undefined)).toBeNull();
    expect(stopIndexOf(null)).toBeNull();
    expect(stopIndexOf({})).toBeNull();
    expect(stopIndexOf({ index: '2' })).toBeNull();
    expect(stopIndexOf({ index: 1.5 })).toBeNull();
    expect(stopIndexOf({ index: -1 })).toBeNull();
    expect(stopIndexOf({ index: Number.NaN })).toBeNull();
  });
});
