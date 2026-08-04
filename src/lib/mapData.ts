import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import type { Trip } from '@/lib/schema';

/** Lo que cada punto del mapa necesita saber de su parada. */
export interface StopProperties {
  /** Posición en `trip.stops`: es lo que se le pasa a `goToStop` al hacer click. */
  index: number;
  id: string;
  name: string;
  /** Color del capítulo al que pertenece la parada. */
  color: string;
}

/** Las paradas como source GeoJSON, nunca como marcadores de DOM (§2.5). */
export function stopsCollection(trip: Trip): FeatureCollection<Point, StopProperties> {
  const colors = new Map(trip.chapters.map((chapter) => [chapter.id, chapter.color]));

  return {
    type: 'FeatureCollection',
    features: trip.stops.map((stop, index) => {
      const color = colors.get(stop.chapterId);
      if (color === undefined) {
        throw new Error(
          `La parada "${stop.id}" apunta al capítulo "${stop.chapterId}", que no ` +
            'existe: los datos no han pasado por el loader.',
        );
      }

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: stop.coords },
        properties: { index, id: stop.id, name: stop.name, color },
      };
    }),
  };
}

/**
 * Una source GeoJSON necesita datos siempre, también cuando todavía no hay ruta
 * que dibujar: entonces es una colección sin features.
 */
export function lineCollection(line: Feature<LineString> | null): FeatureCollection<LineString> {
  return { type: 'FeatureCollection', features: line === null ? [] : [line] };
}

/**
 * Índice de parada que lleva un feature del mapa. MapLibre entrega las
 * propiedades sin tipar, así que se comprueban antes de navegar con ellas.
 */
export function stopIndexOf(properties: unknown): number | null {
  if (typeof properties !== 'object' || properties === null) return null;
  if (!('index' in properties)) return null;

  const index: unknown = properties.index;
  return typeof index === 'number' && Number.isInteger(index) && index >= 0 ? index : null;
}
