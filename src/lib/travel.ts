import type { Leg, TravelMode, Trip } from '@/lib/schema';

const MODE_LABELS: Record<TravelMode, string> = {
  bus: 'en autobús',
  train: 'en tren',
  car: 'en coche',
  boat: 'en barco',
  plane: 'en avión',
  foot: 'a pie',
};

/** Cómo se hizo el tramo, para escribirlo detrás de "Llegada". */
export function travelModeLabel(mode: TravelMode): string {
  return MODE_LABELS[mode];
}

/**
 * Leg por el que se llega a la parada `stopIndex`. El leg N va de la parada N a
 * la N+1 (§2.7), así que a una parada se llega por el leg anterior. A la primera
 * no se llega desde ninguna parte.
 */
export function arrivalLeg(trip: Trip, stopIndex: number): Leg | null {
  if (stopIndex <= 0) return null;
  return trip.legs[stopIndex - 1] ?? null;
}
