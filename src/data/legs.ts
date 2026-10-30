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
  { fromStopId: 'solheimajokull', toStopId: 'dyrholaey', mode: 'car' },
  { fromStopId: 'dyrholaey', toStopId: 'vik-camping', mode: 'car' },
  { fromStopId: 'vik-camping', toStopId: 'reynisfjara', mode: 'car' },
  { fromStopId: 'reynisfjara', toStopId: 'kirkjubaejarklaustur', mode: 'car' },
  { fromStopId: 'kirkjubaejarklaustur', toStopId: 'svinafellsjokull', mode: 'car' },
  { fromStopId: 'svinafellsjokull', toStopId: 'jokulsarlon', mode: 'car' },
  { fromStopId: 'jokulsarlon', toStopId: 'hofn-camping', mode: 'car' },
  { fromStopId: 'hofn-camping', toStopId: 'stokksnes', mode: 'car' },
  { fromStopId: 'stokksnes', toStopId: 'fljotsdalsherad', mode: 'car' },
  { fromStopId: 'fljotsdalsherad', toStopId: 'gasolinera', mode: 'car' },
  { fromStopId: 'gasolinera', toStopId: 'dettifoss', mode: 'car' },
  { fromStopId: 'dettifoss', toStopId: 'skutustadahreppur', mode: 'car' },
  { fromStopId: 'skutustadahreppur', toStopId: 'fosshol', mode: 'car' },
  { fromStopId: 'fosshol', toStopId: 'akureyri', mode: 'car' },
  { fromStopId: 'akureyri', toStopId: 'hvitserkur', mode: 'car' },
  { fromStopId: 'hvitserkur', toStopId: 'borgarnes', mode: 'car' },
  { fromStopId: 'borgarnes', toStopId: 'grundarfjordur', mode: 'car' },
  { fromStopId: 'grundarfjordur', toStopId: 'eyja-miklaholtshreppur', mode: 'car' },
  { fromStopId: 'eyja-miklaholtshreppur', toStopId: 'reikiavik', mode: 'car' },
  { fromStopId: 'reikiavik', toStopId: 'blue-lagoon', mode: 'car' },
  { fromStopId: 'blue-lagoon', toStopId: 'keflavik-regreso', mode: 'car' },
];
