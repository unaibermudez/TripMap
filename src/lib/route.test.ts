import type { Feature, LineString, Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { trip as fixture } from '@/data';
import { loadTrip } from '@/lib/loader';
import {
  chapterBounds,
  legGeometries,
  partialRouteLine,
  routeLine,
  tripBounds,
  type RoadRouteTable,
} from '@/lib/route';
import type { Coords, Trip } from '@/lib/schema';

/** Dos paradas y un único leg, para aislar el comportamiento por `mode`. */
function makeSingleLegTrip(mode: 'plane' | 'train' | 'boat' | 'car'): Trip {
  return loadTrip({
    chapters: [
      { id: 'unico', title: 'Único', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
    ],
    stops: [
      { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'unico', title: 'A', body: '' },
      { id: 'b', name: 'B', country: 'MA', coords: [10, 0], dateStart: '2023-01-10', chapterId: 'unico', title: 'B', body: '' },
    ],
    legs: [{ fromStopId: 'a', toStopId: 'b', mode }],
  });
}

/**
 * Cuatro paradas en dos capítulos, con coordenadas redondas para poder razonar
 * sobre la geometría: el leg a→b es horizontal y sin `via`, el b→c cambia de
 * capítulo con un `via` muy al este, y el c→d se queda dentro de "sur" con un
 * `via` muy al norte.
 */
function makeTrip(): Trip {
  return loadTrip({
    chapters: [
      {
        id: 'norte',
        title: 'Norte',
        dateStart: '2023-01-01',
        dateEnd: '2023-01-31',
        color: '#c2410c',
      },
      {
        id: 'sur',
        title: 'Sur',
        dateStart: '2023-02-01',
        dateEnd: '2023-02-28',
        color: '#0f766e',
      },
    ],
    stops: [
      { id: 'a', name: 'A', country: 'MA', coords: [0, 0], dateStart: '2023-01-01', chapterId: 'norte', title: 'A', body: '' },
      { id: 'b', name: 'B', country: 'MA', coords: [10, 0], dateStart: '2023-01-10', chapterId: 'norte', title: 'B', body: '' },
      { id: 'c', name: 'C', country: 'MR', coords: [10, 10], dateStart: '2023-02-01', chapterId: 'sur', title: 'C', body: '' },
      { id: 'd', name: 'D', country: 'MR', coords: [20, 10], dateStart: '2023-02-10', chapterId: 'sur', title: 'D', body: '' },
    ],
    legs: [
      { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
      { fromStopId: 'b', toStopId: 'c', mode: 'car', via: [[20, 5]] },
      { fromStopId: 'c', toStopId: 'd', mode: 'bus', via: [[15, 20]] },
    ],
  });
}

function geometryAt(geometries: readonly Position[][], index: number): Position[] {
  const geometry = geometries[index];
  if (geometry === undefined) throw new Error(`No hay geometría para el leg ${index}.`);
  return geometry;
}

function coordinatesOf(line: Feature<LineString> | null): Position[] {
  if (line === null) throw new Error('Se esperaba una línea y no la hay.');
  return line.geometry.coordinates;
}

function xy(position: Position | undefined): Coords {
  const [x, y] = position ?? [];
  if (x === undefined || y === undefined) throw new Error('Coordenada incompleta.');
  return [x, y];
}

function stopAt(trip: Trip, index: number): Trip['stops'][number] {
  const stop = trip.stops[index];
  if (stop === undefined) throw new Error(`El fixture del test no tiene parada ${index}.`);
  return stop;
}

describe('legGeometries', () => {
  it('devuelve una geometría por leg', () => {
    const trip = makeTrip();
    expect(legGeometries(trip)).toHaveLength(trip.legs.length);
  });

  it('empieza y acaba exactamente en las paradas del leg', () => {
    const trip = makeTrip();
    const geometries = legGeometries(trip);

    for (const index of trip.legs.keys()) {
      const coordinates = geometryAt(geometries, index);
      expect(coordinates.at(0)).toEqual(stopAt(trip, index).coords);
      expect(coordinates.at(-1)).toEqual(stopAt(trip, index + 1).coords);
    }
  });

  it('un leg sin via es una recta entre las dos paradas (§2.6)', () => {
    const coordinates = geometryAt(legGeometries(makeTrip()), 0);

    expect(coordinates.length).toBeGreaterThan(2);
    // De [0, 0] a [10, 0]: todo punto de la recta tiene latitud 0.
    for (const position of coordinates) {
      const [x, y] = xy(position);
      expect(y).toBeCloseTo(0, 10);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
    }
  });

  it('un leg con via pasa por el waypoint', () => {
    const coordinates = geometryAt(legGeometries(makeTrip()), 1);
    const distances = coordinates.map((position) => {
      const [x, y] = xy(position);
      return Math.hypot(x - 20, y - 5);
    });

    expect(Math.min(...distances)).toBeLessThan(0.01);
  });
});

describe('legGeometries — arco para avión, tren y barco (§2.9)', () => {
  it.each(['plane', 'train', 'boat'] as const)(
    'el leg en %s empieza y acaba exacto en las paradas, con un arco de más de dos puntos',
    (mode) => {
      const [coordinates] = legGeometries(makeSingleLegTrip(mode));
      if (coordinates === undefined) throw new Error('Se esperaba geometría para el leg.');

      expect(coordinates.at(0)).toEqual([0, 0]);
      expect(coordinates.at(-1)).toEqual([10, 0]);
      expect(coordinates.length).toBeGreaterThan(2);
    },
  );

  it('un leg por carretera no lleva arco: sigue siendo el spline decorativo de siempre', () => {
    const [coordinates] = legGeometries(makeSingleLegTrip('car'));
    if (coordinates === undefined) throw new Error('Se esperaba geometría para el leg.');

    // Sin `via`, dos puntos: `bezierSpline` da la recta (§2.6), latitud siempre 0.
    for (const position of coordinates) {
      const [, y] = xy(position);
      expect(y).toBeCloseTo(0, 10);
    }
  });

  it('falla si el arco cruza el antimeridiano, sin caer a ningún fallback silencioso', () => {
    const trip = loadTrip({
      chapters: [
        { id: 'unico', title: 'Único', dateStart: '2023-01-01', dateEnd: '2023-01-31', color: '#c2410c' },
      ],
      stops: [
        { id: 'a', name: 'A', country: 'FJ', coords: [179, 0], dateStart: '2023-01-01', chapterId: 'unico', title: 'A', body: '' },
        { id: 'b', name: 'B', country: 'FJ', coords: [-179, 0], dateStart: '2023-01-10', chapterId: 'unico', title: 'B', body: '' },
      ],
      legs: [{ fromStopId: 'a', toStopId: 'b', mode: 'plane' }],
    });

    expect(() => legGeometries(trip)).toThrow(/antimeridiano/);
  });
});

describe('legGeometries — tabla de rutas por carretera (§9)', () => {
  it('usa la geometría inyectada cuando existe para el leg', () => {
    const roadRoutes: RoadRouteTable = {
      'a→b': [
        [0, 0],
        [5, 3],
        [10, 0],
      ],
    };

    const [coordinates] = legGeometries(makeSingleLegTrip('car'), roadRoutes);
    if (coordinates === undefined) throw new Error('Se esperaba geometría para el leg.');

    expect(coordinates).toContainEqual([5, 3]);
  });

  it('corrige a la coordenada exacta de la parada aunque la tabla traiga un extremo "sucio"', () => {
    const roadRoutes: RoadRouteTable = {
      // Un motor de rutas engancha el punto pedido a la carretera más cercana,
      // no siempre a la coordenada exacta.
      'a→b': [
        [0.0004, -0.0002],
        [5, 3],
        [10.0003, 0.0001],
      ],
    };

    const [coordinates] = legGeometries(makeSingleLegTrip('car'), roadRoutes);
    if (coordinates === undefined) throw new Error('Se esperaba geometría para el leg.');

    expect(coordinates.at(0)).toEqual([0, 0]);
    expect(coordinates.at(-1)).toEqual([10, 0]);
  });

  it('sin entrada en la tabla cae al spline decorativo de siempre', () => {
    const conEntradaAjena: RoadRouteTable = { 'x→y': [[0, 0], [1, 1]] };

    const [coordinates] = legGeometries(makeSingleLegTrip('car'), conEntradaAjena);
    const [esperado] = legGeometries(makeSingleLegTrip('car'), {});

    expect(coordinates).toEqual(esperado);
  });

  it('un leg en avión ignora una entrada de carretera para el mismo par de paradas', () => {
    const roadRoutes: RoadRouteTable = {
      // Muy lejos de la línea recta: fácil de detectar si "ganara" sobre el arco.
      'a→b': [
        [0, 0],
        [5, -8],
        [10, 0],
      ],
    };

    const [coordinates] = legGeometries(makeSingleLegTrip('plane'), roadRoutes);
    if (coordinates === undefined) throw new Error('Se esperaba geometría para el leg.');

    expect(coordinates).not.toContainEqual([5, -8]);
    expect(coordinates.length).toBeGreaterThan(3);
  });
});

describe('routeLine', () => {
  it('va de la primera a la última parada pasando por todas', () => {
    const trip = makeTrip();
    const coordinates = coordinatesOf(routeLine(legGeometries(trip)));

    expect(coordinates.at(0)).toEqual(stopAt(trip, 0).coords);
    expect(coordinates.at(-1)).toEqual(stopAt(trip, trip.stops.length - 1).coords);

    for (const stop of trip.stops) {
      const found = coordinates.some((position) => {
        const [x, y] = xy(position);
        return x === stop.coords[0] && y === stop.coords[1];
      });
      expect(found).toBe(true);
    }
  });

  it('no repite el punto de unión entre legs', () => {
    const geometries = legGeometries(makeTrip());
    const coordinates = coordinatesOf(routeLine(geometries));

    const total = geometries.reduce((sum, geometry) => sum + geometry.length, 0);
    expect(coordinates).toHaveLength(total - (geometries.length - 1));

    for (const [index, position] of coordinates.entries()) {
      if (index === 0) continue;
      expect(position).not.toEqual(coordinates[index - 1]);
    }
  });

  it('devuelve null si el viaje no tiene legs', () => {
    expect(routeLine([])).toBeNull();
  });
});

describe('partialRouteLine', () => {
  it('en la parada 0 no hay nada recorrido', () => {
    expect(partialRouteLine(legGeometries(makeTrip()), 0)).toBeNull();
  });

  it('hasta la parada N es la concatenación de los N primeros legs', () => {
    const geometries = legGeometries(makeTrip());
    const coordinates = coordinatesOf(partialRouteLine(geometries, 2));

    expect(coordinates.at(0)).toEqual(geometryAt(geometries, 0).at(0));
    expect(coordinates.at(-1)).toEqual(geometryAt(geometries, 1).at(-1));
  });

  it('acaba exactamente en la parada activa', () => {
    const trip = makeTrip();
    const geometries = legGeometries(trip);

    for (const index of trip.stops.keys()) {
      if (index === 0) continue;
      const coordinates = coordinatesOf(partialRouteLine(geometries, index));
      expect(coordinates.at(-1)).toEqual(stopAt(trip, index).coords);
    }
  });

  it('es siempre un prefijo de la ruta completa (§2.6)', () => {
    const geometries = legGeometries(makeTrip());
    const full = coordinatesOf(routeLine(geometries));

    for (let index = 1; index <= geometries.length; index += 1) {
      const partial = coordinatesOf(partialRouteLine(geometries, index));
      expect(full.slice(0, partial.length)).toEqual(partial);
    }
  });

  it('en la última parada coincide con la ruta completa', () => {
    const geometries = legGeometries(makeTrip());
    expect(partialRouteLine(geometries, geometries.length)).toEqual(routeLine(geometries));
  });

  it('recorta los índices fuera de rango', () => {
    const geometries = legGeometries(makeTrip());

    expect(partialRouteLine(geometries, geometries.length + 5)).toEqual(routeLine(geometries));
    expect(partialRouteLine(geometries, -3)).toBeNull();
  });
});

describe('chapterBounds', () => {
  it('encierra las paradas del capítulo y solo esas', () => {
    const trip = makeTrip();
    const [minX, minY, maxX, maxY] = chapterBounds(trip, legGeometries(trip), 'norte');

    // "norte" son [0, 0] y [10, 0], unidas por una recta: el via del leg b→c,
    // que sale del capítulo, no cuenta.
    expect(minX).toBeCloseTo(0, 10);
    expect(minY).toBeCloseTo(0, 10);
    expect(maxX).toBeCloseTo(10, 10);
    expect(maxY).toBeCloseTo(0, 10);
  });

  it('incluye los tramos interiores del capítulo, no solo las paradas', () => {
    const trip = makeTrip();
    const bounds = chapterBounds(trip, legGeometries(trip), 'sur');

    // Las dos paradas de "sur" están en latitud 10, pero el leg c→d sube hasta
    // el via en [15, 20].
    expect(bounds[3]).toBeGreaterThan(19);
  });

  it('falla si el capítulo no existe', () => {
    const trip = makeTrip();
    expect(() => chapterBounds(trip, legGeometries(trip), 'este')).toThrow(/"este"/);
  });

  it('con los datos reales encierra las paradas de su capítulo', () => {
    const geometries = legGeometries(fixture);

    for (const chapter of fixture.chapters) {
      const [minX, minY, maxX, maxY] = chapterBounds(fixture, geometries, chapter.id);
      const own = fixture.stops.filter((stop) => stop.chapterId === chapter.id);

      expect(own.length).toBeGreaterThan(0);
      for (const stop of own) {
        expect(stop.coords[0]).toBeGreaterThanOrEqual(minX);
        expect(stop.coords[0]).toBeLessThanOrEqual(maxX);
        expect(stop.coords[1]).toBeGreaterThanOrEqual(minY);
        expect(stop.coords[1]).toBeLessThanOrEqual(maxY);
      }
    }
  });

  it('con los datos reales no se estira hasta el capítulo siguiente', () => {
    const [, minY] = chapterBounds(fixture, legGeometries(fixture), 'circulo-dorado');
    const firstOfNext = stopAt(fixture, 6);

    // "circulo-dorado" no baja de Keflavík; "costa-sur" arranca en
    // Seljalandsfoss, más al sur que cualquier parada o tramo interior de él.
    expect(firstOfNext.id).toBe('seljalandsfoss');
    expect(firstOfNext.coords[1]).toBeLessThan(minY);
  });
});

describe('tripBounds', () => {
  it('encierra todas las paradas y los tramos que se salen de ellas', () => {
    const trip = makeTrip();
    const [minX, minY, maxX, maxY] = tripBounds(trip, legGeometries(trip));

    // Las paradas llegan a [20, 10], pero el via del leg c→d sube hasta
    // [15, 20].
    expect(minX).toBeCloseTo(0, 10);
    expect(minY).toBeCloseTo(0, 10);
    expect(maxX).toBeGreaterThanOrEqual(20);
    expect(maxY).toBeGreaterThan(19);
  });

  it('con los datos reales encierra todas las paradas', () => {
    const [minX, minY, maxX, maxY] = tripBounds(fixture, legGeometries(fixture));

    for (const stop of fixture.stops) {
      expect(stop.coords[0]).toBeGreaterThanOrEqual(minX);
      expect(stop.coords[0]).toBeLessThanOrEqual(maxX);
      expect(stop.coords[1]).toBeGreaterThanOrEqual(minY);
      expect(stop.coords[1]).toBeLessThanOrEqual(maxY);
    }
  });
});
