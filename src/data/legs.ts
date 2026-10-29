import type { TripInput } from '@/lib/schema';

/**
 * Un leg por cada par de paradas consecutivas, en el mismo orden que `stops`.
 * Todo el viaje se hace en coche de alquiler; ninguna curva necesita `via`.
 */
export const legs: TripInput['legs'] = [
  { fromStopId: 'keflavik', toStopId: 'hveragerdi', mode: 'car' },
  { fromStopId: 'hveragerdi', toStopId: 'kerid', mode: 'car' },
  { fromStopId: 'kerid', toStopId: 'thingvellir', mode: 'car' },
  { fromStopId: 'thingvellir', toStopId: 'gullfoss', mode: 'car' },
  { fromStopId: 'gullfoss', toStopId: 'uthlid', mode: 'car' },
  { fromStopId: 'uthlid', toStopId: 'seljalandsfoss', mode: 'car' },
  { fromStopId: 'seljalandsfoss', toStopId: 'skogafoss', mode: 'car' },
  { fromStopId: 'skogafoss', toStopId: 'solheimajokull', mode: 'car' },
];
