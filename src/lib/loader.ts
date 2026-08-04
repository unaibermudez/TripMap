import { z } from 'zod';
import { tripSchema, type Stop, type Trip } from '@/lib/schema';

export class TripDataError extends Error {
  override readonly name = 'TripDataError';

  constructor(message: string) {
    super(message);
  }
}

function fail(message: string): never {
  throw new TripDataError(message);
}

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(raíz)';
    return `  ${path}: ${issue.message}`;
  });
  return `Los datos del viaje no cumplen el esquema:\n${lines.join('\n')}`;
}

function findDuplicate(ids: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return undefined;
}

/** Los capítulos se pintan como una banda continua en la timeline (§4). */
function assertChaptersAreContiguous(stops: readonly Stop[]): void {
  const closed = new Set<string>();
  let previous: string | undefined;

  for (const stop of stops) {
    if (stop.chapterId === previous) continue;
    if (closed.has(stop.chapterId)) {
      fail(
        `El capítulo "${stop.chapterId}" se reabre en la parada "${stop.id}": ` +
          'las paradas de un capítulo deben ser contiguas en el array.',
      );
    }
    if (previous !== undefined) closed.add(previous);
    previous = stop.chapterId;
  }
}

/**
 * La cadena de legs tiene que reproducir el orden de las paradas tal como están
 * escritas en el fichero, que es el orden canónico del viaje (§2.7).
 */
function assertLegChainMatchesStopOrder(trip: Trip): void {
  const expected = trip.stops.length - 1;
  if (trip.legs.length !== expected) {
    fail(
      `Hay ${trip.legs.length} legs para ${trip.stops.length} paradas: ` +
        `se esperaban exactamente ${expected}.`,
    );
  }

  for (const [index, leg] of trip.legs.entries()) {
    const from = trip.stops[index];
    const to = trip.stops[index + 1];
    if (from === undefined || to === undefined) continue;

    if (leg.fromStopId !== from.id || leg.toStopId !== to.id) {
      fail(
        `El leg en la posición ${index} va de "${leg.fromStopId}" a "${leg.toStopId}", ` +
          `pero entre las paradas consecutivas "${from.id}" y "${to.id}" ` +
          'debe haber exactamente un leg en ese mismo orden.',
      );
    }
  }
}

/**
 * Valida los datos crudos de `src/data` y devuelve el viaje ya tipado. Lanza
 * `TripDataError` con un mensaje que nombra las entidades implicadas.
 */
export function loadTrip(raw: unknown): Trip {
  const parsed = tripSchema.safeParse(raw);
  if (!parsed.success) fail(formatZodError(parsed.error));
  const trip = parsed.data;

  const duplicateStop = findDuplicate(trip.stops.map((stop) => stop.id));
  if (duplicateStop !== undefined) fail(`Hay más de una parada con el id "${duplicateStop}".`);

  const duplicateChapter = findDuplicate(trip.chapters.map((chapter) => chapter.id));
  if (duplicateChapter !== undefined) {
    fail(`Hay más de un capítulo con el id "${duplicateChapter}".`);
  }

  const duplicateLeg = findDuplicate(trip.legs.map((leg) => `${leg.fromStopId}→${leg.toStopId}`));
  if (duplicateLeg !== undefined) fail(`Hay más de un leg de "${duplicateLeg.replace('→', '" a "')}".`);

  const chapterIds = new Set(trip.chapters.map((chapter) => chapter.id));
  for (const stop of trip.stops) {
    if (!chapterIds.has(stop.chapterId)) {
      fail(`La parada "${stop.id}" apunta al capítulo "${stop.chapterId}", que no existe.`);
    }
  }

  const usedChapterIds = new Set(trip.stops.map((stop) => stop.chapterId));
  for (const chapter of trip.chapters) {
    if (!usedChapterIds.has(chapter.id)) {
      fail(`El capítulo "${chapter.id}" no tiene ninguna parada.`);
    }
  }

  assertChaptersAreContiguous(trip.stops);
  assertLegChainMatchesStopOrder(trip);

  return trip;
}
