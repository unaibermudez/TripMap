import bbox from '@turf/bbox';
import bezierSpline from '@turf/bezier-spline';
import { lineString } from '@turf/helpers';
import type { BBox, Feature, LineString, MultiPoint, Position } from 'geojson';
import type { Trip } from '@/lib/schema';

/**
 * Geometría suavizada de cada leg, en el mismo orden que `trip.legs`.
 *
 * El spline se calcula por leg y nunca sobre la polilínea global (§2.6): así
 * cada parada cae exactamente sobre la línea y la ruta parcial es la
 * concatenación de los primeros N legs. Un leg sin `via` son dos puntos y
 * `bezierSpline` devuelve la recta.
 *
 * Es lo caro de todo esto, así que se calcula una vez por viaje: `routeLine`,
 * `partialRouteLine` y `chapterBounds` parten de lo que devuelve.
 */
export function legGeometries(trip: Trip): Position[][] {
  return trip.legs.map((leg, index) => {
    const from = trip.stops[index];
    const to = trip.stops[index + 1];
    if (from === undefined || to === undefined) {
      throw new Error(
        `El leg ${index} ("${leg.fromStopId}" → "${leg.toStopId}") no tiene ` +
          'paradas en esa posición: los datos no han pasado por el loader.',
      );
    }

    const line = lineString([from.coords, ...leg.via, to.coords]);
    return bezierSpline(line).geometry.coordinates;
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
