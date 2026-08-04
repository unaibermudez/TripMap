import type { TripInput } from '@/lib/schema';

export const chapters: TripInput['chapters'] = [
  {
    id: 'costa-sur',
    title: 'Costa Sur',
    subtitle: 'De Reikiavik a los glaciares del sudeste',
    dateStart: '2024-06-05',
    dateEnd: '2024-06-13',
    color: '#0284c7',
  },
  {
    id: 'circulo-norte',
    title: 'Círculo Norte',
    subtitle: 'Fiordos del este, el norte y la vuelta por el oeste',
    dateStart: '2024-06-14',
    dateEnd: '2024-06-22',
    color: '#7c3aed',
  },
];
