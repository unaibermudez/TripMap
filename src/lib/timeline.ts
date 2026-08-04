import type { Chapter, Trip } from '@/lib/schema';

/** Un capítulo y el tramo de `trip.stops` que ocupa. */
export interface ChapterSegment {
  chapter: Chapter;
  /** Índice de su primera parada en `trip.stops`. */
  startIndex: number;
  stopCount: number;
}

/**
 * Los capítulos como bandas contiguas, en el orden del viaje. El ancho de cada
 * banda es su `stopCount`: la escala de la timeline es uniforme por índice
 * (§2.8), así que un capítulo ocupa tanto como paradas tenga.
 */
export function chapterSegments(trip: Trip): ChapterSegment[] {
  const byId = new Map(trip.chapters.map((chapter) => [chapter.id, chapter]));
  const segments: ChapterSegment[] = [];

  for (const [index, stop] of trip.stops.entries()) {
    const open = segments.at(-1);
    if (open?.chapter.id === stop.chapterId) {
      open.stopCount += 1;
      continue;
    }

    const chapter = byId.get(stop.chapterId);
    if (chapter === undefined) {
      throw new Error(
        `La parada "${stop.id}" apunta al capítulo "${stop.chapterId}", que no ` +
          'existe: los datos no han pasado por el loader.',
      );
    }
    segments.push({ chapter, startIndex: index, stopCount: 1 });
  }

  return segments;
}

/** Centro de la parada dentro de la pista, de 0 a 1. */
export function stopCenterRatio(index: number, stopCount: number): number {
  if (stopCount <= 0) return 0;
  return (index + 0.5) / stopCount;
}

/**
 * Parada que hay bajo una posición de la pista, de 0 a 1. Cada parada ocupa una
 * franja del mismo ancho; fuera de la pista se devuelve la de ese extremo, que
 * es lo que hace falta al arrastrar el cursor más allá del borde.
 */
export function stopIndexAtRatio(ratio: number, stopCount: number): number {
  // Una pista de ancho 0, que es lo que mide antes del primer layout, da NaN.
  if (stopCount <= 0 || Number.isNaN(ratio)) return 0;
  return Math.min(Math.max(Math.floor(ratio * stopCount), 0), stopCount - 1);
}

/**
 * Nuevo `scrollLeft` para que `offset` quede a la vista con `margin` de aire a
 * los lados, o `null` si ya lo está y no hay que desplazar nada.
 */
export function scrollLeftFor(
  offset: number,
  scrollLeft: number,
  viewport: number,
  margin: number,
): number | null {
  const rightmost = offset - margin;
  const leftmost = offset + margin - viewport;

  if (scrollLeft > rightmost) return Math.max(rightmost, 0);
  if (scrollLeft < leftmost) return Math.max(leftmost, 0);
  return null;
}
