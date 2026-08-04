import type { TripInput } from '@/lib/schema';

export const chapters: TripInput['chapters'] = [
  {
    id: 'marruecos',
    title: 'Marruecos',
    subtitle: 'Del estrecho al desierto',
    dateStart: '2023-01-10',
    dateEnd: '2023-02-20',
    color: '#c2410c',
  },
  {
    id: 'sahara-mauritania',
    title: 'Sáhara y Mauritania',
    subtitle: 'Bajando por la costa atlántica',
    dateStart: '2023-02-21',
    dateEnd: '2023-04-05',
    color: '#0f766e',
  },
];
