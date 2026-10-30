import type { TripInput } from '@/lib/schema';

export const chapters: TripInput['chapters'] = [
  {
    id: 'circulo-dorado',
    title: 'Círculo Dorado',
    subtitle: 'De Keflavík a Gullfoss, con noche en el camping',
    dateStart: '2026-04-29',
    dateEnd: '2026-05-01',
    color: '#0284c7',
  },
  {
    id: 'costa-sur',
    title: 'Costa Sur',
    subtitle: 'Cascadas, playas negras y cañones camino de Vík',
    dateStart: '2026-05-01',
    dateEnd: '2026-05-02',
    color: '#7c3aed',
  },
  {
    id: 'sureste',
    title: 'Glaciares del sureste',
    subtitle: 'De Svínafellsjökull a Höfn y Vestrahorn',
    dateStart: '2026-05-02',
    dateEnd: '2026-05-03',
    color: '#059669',
  },
  {
    id: 'este-norte',
    title: 'Este y norte',
    subtitle: 'Cascadas, fumarolas y Akureyri',
    dateStart: '2026-05-03',
    dateEnd: '2026-05-05',
    color: '#d97706',
  },
  {
    id: 'oeste',
    title: 'Oeste y Snæfellsnes',
    subtitle: 'De Hvítserkur a Kirkjufell',
    dateStart: '2026-05-05',
    dateEnd: '2026-05-06',
    color: '#db2777',
  },
  {
    id: 'despedida',
    title: 'Reikiavik y despedida',
    subtitle: 'La capital, la Blue Lagoon y vuelta a casa',
    dateStart: '2026-05-07',
    dateEnd: '2026-05-09',
    color: '#475569',
  },
];
