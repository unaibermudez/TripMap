import { z } from 'zod';

/** `[lng, lat]`, el orden de GeoJSON y de MapLibre. */
export const coordsSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const photoSchema = z.object({
  src: z.string().min(1),
  caption: z.string().min(1).optional(),
  date: z.iso.date().optional(),
  // Obligatorios para reservar espacio y evitar layout shift (§4).
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const stopSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    country: z.string().regex(/^[A-Z]{2}$/, 'debe ser un código ISO2 en mayúsculas'),
    coords: coordsSchema,
    dateStart: z.iso.date(),
    dateEnd: z.iso.date().optional(),
    chapterId: z.string().min(1),
    title: z.string().min(1),
    body: z.string(),
    photos: z.array(photoSchema).default([]),
  })
  .refine((stop) => stop.dateEnd === undefined || stop.dateStart <= stop.dateEnd, {
    message: 'dateStart debe ser anterior o igual a dateEnd',
    path: ['dateEnd'],
  });

export const travelModeSchema = z.enum(['bus', 'train', 'car', 'boat', 'plane', 'foot']);

export const legSchema = z.object({
  fromStopId: z.string().min(1),
  toStopId: z.string().min(1),
  mode: travelModeSchema,
  // Solo para corregir tramos donde la curva quede mal (§2.4).
  via: z.array(coordsSchema).default([]),
});

export const chapterSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    subtitle: z.string().min(1).optional(),
    dateStart: z.iso.date(),
    dateEnd: z.iso.date(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'debe ser un color hex de 6 dígitos'),
  })
  .refine((chapter) => chapter.dateStart <= chapter.dateEnd, {
    message: 'dateStart debe ser anterior o igual a dateEnd',
    path: ['dateEnd'],
  });

export const tripSchema = z.object({
  stops: z.array(stopSchema).min(1),
  chapters: z.array(chapterSchema).min(1),
  legs: z.array(legSchema),
});

export type Coords = z.infer<typeof coordsSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type Stop = z.infer<typeof stopSchema>;
export type TravelMode = z.infer<typeof travelModeSchema>;
export type Leg = z.infer<typeof legSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Trip = z.infer<typeof tripSchema>;

/** Lo que se escribe en `src/data`: los campos con `default` son opcionales. */
export type TripInput = z.input<typeof tripSchema>;
