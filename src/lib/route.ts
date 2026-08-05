import bbox from '@turf/bbox';
import bezierSpline from '@turf/bezier-spline';
import greatCircle from '@turf/great-circle';
import { lineString } from '@turf/helpers';
import type { BBox, Feature, LineString, MultiPoint, Position } from 'geojson';
import rawRoadRoutes from '@/data/generated/road-routes.json';
import type { Leg, Stop, TravelMode, Trip } from '@/lib/schema';

/** Geometría real de carretera por leg, generada con `npm run roads` (§9). */
export type RoadRouteTable = Record<string, Position[]>;

const roadRoutesData = rawRoadRoutes as RoadRouteTable;

/** Puntos del arco de gran círculo; ni muy poligonal ni carga de más el mapa. */
const ARC_POINTS = 64;

/**
 * Modos que no siguen carreteras: se dibujan como arco de gran círculo en vez
 * de con la geometría real o el spline decorativo (§2.9).
 */
const ARC_MODES: ReadonlySet<TravelMode> = new Set(['plane', 'train', 'boat']);

function arcCoordinates(leg: Leg, from: Position, to: Position): Position[] {
  const arc = greatCircle(from, to, { npoints: ARC_POINTS });
  if (arc.geometry.type !== 'LineString') {
    throw new Error(
      `El leg "${leg.fromStopId}" → "${leg.toStopId}" cruza el antimeridiano: ` +
        'el arco de gran círculo da un MultiLineString y no se puede usar tal cual.',
    );
  }
  return arc.geometry.coordinates;
}

function legCoordinates(
  leg: Leg,
  from: Stop,
  to: Stop,
  roadRoutes: RoadRouteTable,
): Position[] {
  if (ARC_MODES.has(leg.mode)) return arcCoordinates(leg, from.coords, to.coords);

  const roadRoute = roadRoutes[`${leg.fromStopId}→${leg.toStopId}`];
  if (roadRoute !== undefined) return roadRoute;

  const line = lineString([from.coords, ...leg.via, to.coords]);
  return bezierSpline(line).geometry.coordinates;
}

/**
 * Fuerza los extremos exactos de la parada. Ni el arco ni, sobre todo, una
 * ruta real de un motor de rutas (que "engancha" el punto pedido a la
 * carretera más cercana) garantizan caer justo en la coordenada de la parada.
 */
function snapEndpoints(coordinates: readonly Position[], from: Position, to: Position): Position[] {
  if (coordinates.length < 2) return [from, to];
  return [from, ...coordinates.slice(1, -1), to];
}

/**
 * Geometría de cada leg, en el mismo orden que `trip.legs`. Tres fuentes, en
 * orden de prioridad (§2.9, §9):
 *
 * 1. Arco de gran círculo si el `mode` no sigue carreteras (avión, tren, barco).
 * 2. Geometría real de carretera, si `npm run roads` ya la generó para ese leg.
 * 3. El spline decorativo de siempre (`[from, ...via, to]` → `bezierSpline`),
 *    como hoy: cada parada cae exactamente sobre la línea y la ruta parcial es
 *    la concatenación de los primeros N legs. Un leg sin `via` son dos puntos y
 *    `bezierSpline` devuelve la recta.
 *
 * Sea cual sea la fuente, `snapEndpoints` fuerza que empiece y acabe justo en
 * las coordenadas de la parada.
 *
 * `roadRoutes` tiene un valor por defecto (los datos reales) para poder
 * inyectar una tabla de prueba en los tests sin tocar el fichero generado.
 *
 * Es lo caro de todo esto, así que se calcula una vez por viaje: `routeLine`,
 * `partialRouteLine` y `chapterBounds` parten de lo que devuelve.
 */
export function legGeometries(
  trip: Trip,
  roadRoutes: RoadRouteTable = roadRoutesData,
): Position[][] {
  return trip.legs.map((leg, index) => {
    const from = trip.stops[index];
    const to = trip.stops[index + 1];
    if (from === undefined || to === undefined) {
      throw new Error(
        `El leg ${index} ("${leg.fromStopId}" → "${leg.toStopId}") no tiene ` +
          'paradas en esa posición: los datos no han pasado por el loader.',
      );
    }

    const coordinates = legCoordinates(leg, from, to, roadRoutes);
    return snapEndpoints(coordinates, from.coords, to.coords);
  });
}

function concatenate(geometries: readonly Position[][]): Position[] {
  const coordinates: Position[] = [];
  for (const geometry of geometries) {
    for (const [index, position] of geometry.entries()) {
      // El último punto de un leg y el primero del siguiente son la misma parada.
      if (index === 0 && coordinates.length > 0) continue;
      coordinates.push(position);
    }
  }
  return coordinates;
}

/** Menos de dos puntos no es una línea: no hay nada que dibujar. */
function toLine(coordinates: Position[]): Feature<LineString> | null {
  return coordinates.length < 2 ? null : lineString(coordinates);
}

/** Ruta completa del viaje. `null` si el viaje no tiene ningún leg. */
export function routeLine(geometries: readonly Position[][]): Feature<LineString> | null {
  return toLine(concatenate(geometries));
}

/**
 * Ruta recorrida hasta la parada `stopIndex`: los primeros `stopIndex` legs, que
 * son siempre un prefijo exacto de `routeLine`. En la parada 0 todavía no se ha
 * recorrido nada y devuelve `null`. Los índices fuera de rango se recortan.
 */
export function partialRouteLine(
  geometries: readonly Position[][],
  stopIndex: number,
): Feature<LineString> | null {
  const legCount = Math.max(0, Math.min(stopIndex, geometries.length));
  return toLine(concatenate(geometries.slice(0, legCount)));
}

/**
 * Bounding box del capítulo: sus paradas y los tramos de ruta que quedan dentro
 * de él, que con un `via` pueden salirse del rectángulo de las paradas.
 */
export function chapterBounds(
  trip: Trip,
  geometries: readonly Position[][],
  chapterId: string,
): BBox {
  const coordinates: Position[] = [];

  for (const [index, stop] of trip.stops.entries()) {
    if (stop.chapterId !== chapterId) continue;
    coordinates.push(stop.coords);

    const next = trip.stops[index + 1];
    const geometry = geometries[index];
    if (next?.chapterId === chapterId && geometry !== undefined) {
      coordinates.push(...geometry);
    }
  }

  if (coordinates.length === 0) {
    throw new Error(`El capítulo "${chapterId}" no tiene ninguna parada.`);
  }

  const points: MultiPoint = { type: 'MultiPoint', coordinates };
  return bbox(points);
}
