import type { TripInput } from '@/lib/schema';

/**
 * Un leg por cada par de paradas consecutivas, en el mismo orden que `stops`.
 * Toda la vuelta se hace en coche de alquiler; ninguna curva necesita `via`,
 * las paradas van todas pegadas a la carretera de circunvalación.
 */
export const legs: TripInput['legs'] = [
  {
    fromStopId: 'reikiavik',
    toStopId: 'vik',
    mode: 'car',
  },
  {
    fromStopId: 'vik',
    toStopId: 'jokulsarlon',
    mode: 'car',
  },
  {
    fromStopId: 'jokulsarlon',
    toStopId: 'hofn',
    mode: 'car',
  },
  {
    fromStopId: 'hofn',
    toStopId: 'egilsstadir',
    mode: 'car',
  },
  {
    fromStopId: 'egilsstadir',
    toStopId: 'akureyri',
    mode: 'car',
  },
  {
    fromStopId: 'akureyri',
    toStopId: 'stykkisholmur',
    mode: 'car',
  },
  {
    fromStopId: 'stykkisholmur',
    toStopId: 'borgarnes',
    mode: 'car',
  },
];
