import type { TripInput } from '@/lib/schema';

/**
 * Un leg por cada par de paradas consecutivas, en el mismo orden que `stops`.
 * Los `via` están solo donde la recta se iba por donde no se pasó (§2.4).
 */
export const legs: TripInput['legs'] = [
  {
    fromStopId: 'tanger',
    toStopId: 'chefchaouen',
    mode: 'car',
  },
  {
    fromStopId: 'chefchaouen',
    toStopId: 'fez',
    mode: 'bus',
  },
  {
    fromStopId: 'fez',
    toStopId: 'merzouga',
    mode: 'bus',
    // Sin este punto la línea corta recto por el Atlas en vez de seguir la
    // carretera por Midelt y Errachidia.
    via: [[-4.7451, 32.6852]],
  },
  {
    fromStopId: 'merzouga',
    toStopId: 'dajla',
    mode: 'car',
    // La recta entraría en Argelia y luego cruzaría el Sáhara por el interior.
    // Estos dos puntos la devuelven a la carretera de la costa.
    via: [
      [-8.9829, 28.4356],
      [-13.2033, 27.1536],
    ],
  },
  {
    fromStopId: 'dajla',
    toStopId: 'nuadibu',
    mode: 'car',
  },
  {
    fromStopId: 'nuadibu',
    toStopId: 'atar',
    mode: 'train',
    // El tren del mineral no va en línea recta: sube hasta Choum.
    via: [[-13.0186, 21.3086]],
  },
  {
    fromStopId: 'atar',
    toStopId: 'nuakchot',
    mode: 'bus',
  },
];
