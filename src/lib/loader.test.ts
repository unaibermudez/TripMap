import { describe, expect, it } from 'vitest';
import { loadTrip, TripDataError } from '@/lib/loader';
import type { TripInput } from '@/lib/schema';
import { trip as fixture } from '@/data';

/** Tres paradas en dos capítulos: el mínimo para probar todas las reglas. */
function makeTrip(): TripInput {
  return {
    chapters: [
      {
        id: 'norte',
        title: 'Norte',
        dateStart: '2023-01-01',
        dateEnd: '2023-01-31',
        color: '#c2410c',
      },
      {
        id: 'sur',
        title: 'Sur',
        dateStart: '2023-02-01',
        dateEnd: '2023-02-28',
        color: '#0f766e',
      },
    ],
    stops: [
      {
        id: 'a',
        name: 'A',
        country: 'MA',
        coords: [-5, 35],
        dateStart: '2023-01-01',
        dateEnd: '2023-01-10',
        chapterId: 'norte',
        title: 'A',
        body: 'cuerpo de a',
      },
      {
        id: 'b',
        name: 'B',
        country: 'MA',
        coords: [-5, 33],
        dateStart: '2023-01-11',
        chapterId: 'norte',
        title: 'B',
        body: 'cuerpo de b',
      },
      {
        id: 'c',
        name: 'C',
        country: 'MR',
        coords: [-16, 18],
        dateStart: '2023-02-01',
        dateEnd: '2023-02-28',
        chapterId: 'sur',
        title: 'C',
        body: 'cuerpo de c',
      },
    ],
    legs: [
      { fromStopId: 'a', toStopId: 'b', mode: 'bus' },
      { fromStopId: 'b', toStopId: 'c', mode: 'car', via: [[-10, 25]] },
    ],
  };
}

function stopAt(trip: TripInput, index: number): TripInput['stops'][number] {
  const stop = trip.stops[index];
  if (stop === undefined) throw new Error(`El fixture del test no tiene parada ${index}.`);
  return stop;
}

/** Sustituye una parada por una versión con campos crudos, válidos o no. */
function withPatchedStop(index: number, patch: Record<string, unknown>): unknown {
  const trip = makeTrip();
  const stops = trip.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop));
  return { ...trip, stops };
}

describe('loadTrip', () => {
  it('acepta un viaje válido y conserva el orden del fichero', () => {
    const trip = loadTrip(makeTrip());

    expect(trip.stops.map((stop) => stop.id)).toEqual(['a', 'b', 'c']);
    expect(trip.chapters.map((chapter) => chapter.id)).toEqual(['norte', 'sur']);
    expect(trip.legs).toHaveLength(2);
  });

  it('rellena los valores por defecto de photos y via', () => {
    const trip = loadTrip(makeTrip());

    expect(stopAt(trip, 0).photos).toEqual([]);
    expect(trip.legs[0]?.via).toEqual([]);
    expect(trip.legs[1]?.via).toEqual([[-10, 25]]);
  });

  it('lanza TripDataError, no ZodError', () => {
    expect(() => loadTrip({})).toThrow(TripDataError);
  });

  describe('esquema', () => {
    it('rechaza un country que no sea ISO2 en mayúsculas', () => {
      expect(() => loadTrip(withPatchedStop(0, { country: 'ma' }))).toThrow(/country/);
    });

    it('rechaza coordenadas fuera de rango', () => {
      expect(() => loadTrip(withPatchedStop(0, { coords: [-5, 95] }))).toThrow(/coords/);
    });

    it('rechaza coordenadas que no sean un par', () => {
      expect(() => loadTrip(withPatchedStop(0, { coords: [-5] }))).toThrow(/coords/);
    });

    it('rechaza fechas que no sean YYYY-MM-DD', () => {
      expect(() => loadTrip(withPatchedStop(0, { dateStart: '10/01/2023' }))).toThrow(/dateStart/);
    });

    it('rechaza una foto sin dimensiones', () => {
      const photos = [{ src: '/photos/x.svg', width: 1600 }];
      expect(() => loadTrip(withPatchedStop(0, { photos }))).toThrow(/height/);
    });

    it('rechaza un mode de transporte desconocido', () => {
      const trip = makeTrip();
      const raw = { ...trip, legs: [{ ...trip.legs[0], mode: 'teletransporte' }, trip.legs[1]] };
      expect(() => loadTrip(raw)).toThrow(/mode/);
    });

    it('rechaza un color de capítulo que no sea hex', () => {
      const trip = makeTrip();
      const chapters = trip.chapters.map((chapter) => ({ ...chapter, color: 'naranja' }));
      expect(() => loadTrip({ ...trip, chapters })).toThrow(/color/);
    });

    it('rechaza dateStart posterior a dateEnd en una parada', () => {
      const raw = withPatchedStop(0, { dateStart: '2023-01-10', dateEnd: '2023-01-01' });
      expect(() => loadTrip(raw)).toThrow(/dateEnd/);
    });

    it('rechaza dateStart posterior a dateEnd en un capítulo', () => {
      const trip = makeTrip();
      const chapters = trip.chapters.map((chapter, i) =>
        i === 0 ? { ...chapter, dateStart: '2023-03-01' } : chapter,
      );
      expect(() => loadTrip({ ...trip, chapters })).toThrow(/dateEnd/);
    });

    it('rechaza un viaje sin paradas', () => {
      expect(() => loadTrip({ ...makeTrip(), stops: [], legs: [] })).toThrow(/stops/);
    });
  });

  describe('coherencia', () => {
    it('rechaza ids de parada duplicados nombrando el id', () => {
      const raw = withPatchedStop(1, { id: 'a' });
      expect(() => loadTrip(raw)).toThrow(/más de una parada con el id "a"/);
    });

    it('rechaza ids de capítulo duplicados nombrando el id', () => {
      const trip = makeTrip();
      const chapters = trip.chapters.map((chapter) => ({ ...chapter, id: 'norte' }));
      expect(() => loadTrip({ ...trip, chapters })).toThrow(/más de un capítulo con el id "norte"/);
    });

    it('rechaza dos legs entre el mismo par de paradas', () => {
      const trip = makeTrip();
      const legs = [trip.legs[0], trip.legs[0]];
      expect(() => loadTrip({ ...trip, legs })).toThrow(/más de un leg de "a" a "b"/);
    });

    it('rechaza una parada que apunta a un capítulo inexistente', () => {
      const raw = withPatchedStop(1, { chapterId: 'oeste' });
      expect(() => loadTrip(raw)).toThrow(/La parada "b" apunta al capítulo "oeste"/);
    });

    it('rechaza un capítulo sin ninguna parada', () => {
      const trip = makeTrip();
      const chapters = [
        ...trip.chapters,
        {
          id: 'este',
          title: 'Este',
          dateStart: '2023-03-01',
          dateEnd: '2023-03-31',
          color: '#1d4ed8',
        },
      ];
      expect(() => loadTrip({ ...trip, chapters })).toThrow(
        /El capítulo "este" no tiene ninguna parada/,
      );
    });

    it('rechaza un capítulo que se abre, se cierra y se reabre', () => {
      const trip = makeTrip();
      // norte, sur, norte
      const stops = trip.stops.map((stop, i) => {
        if (i === 1) return { ...stop, chapterId: 'sur' };
        if (i === 2) return { ...stop, chapterId: 'norte' };
        return stop;
      });
      expect(() => loadTrip({ ...trip, stops })).toThrow(
        /El capítulo "norte" se reabre en la parada "c"/,
      );
    });

    it('acepta un capítulo con una sola parada', () => {
      // norte, sur, sur
      const raw = withPatchedStop(1, { chapterId: 'sur' });
      expect(() => loadTrip(raw)).not.toThrow();
    });
  });

  describe('cadena de legs', () => {
    it('rechaza que falte un leg', () => {
      const trip = makeTrip();
      expect(() => loadTrip({ ...trip, legs: [trip.legs[0]] })).toThrow(
        /Hay 1 legs para 3 paradas: se esperaban exactamente 2/,
      );
    });

    it('rechaza que sobre un leg', () => {
      const trip = makeTrip();
      const legs = [...trip.legs, { fromStopId: 'c', toStopId: 'a', mode: 'plane' as const }];
      expect(() => loadTrip({ ...trip, legs })).toThrow(/Hay 3 legs para 3 paradas/);
    });

    it('rechaza los legs desordenados nombrando las paradas implicadas', () => {
      const trip = makeTrip();
      const legs = [trip.legs[1], trip.legs[0]];
      expect(() => loadTrip({ ...trip, legs })).toThrow(
        /posición 0 va de "b" a "c".*paradas consecutivas "a" y "b"/s,
      );
    });

    it('rechaza un leg invertido', () => {
      const trip = makeTrip();
      const legs = [{ fromStopId: 'b', toStopId: 'a', mode: 'bus' as const }, trip.legs[1]];
      expect(() => loadTrip({ ...trip, legs })).toThrow(/paradas consecutivas "a" y "b"/);
    });

    it('rechaza un leg que salta una parada', () => {
      const trip = makeTrip();
      const legs = [{ fromStopId: 'a', toStopId: 'c', mode: 'bus' as const }, trip.legs[1]];
      expect(() => loadTrip({ ...trip, legs })).toThrow(/va de "a" a "c"/);
    });
  });
});

describe('fixture de src/data', () => {
  it('carga y tiene 9 paradas en 2 capítulos', () => {
    expect(fixture.stops).toHaveLength(9);
    expect(fixture.chapters).toHaveLength(2);
    expect(fixture.legs).toHaveLength(8);
  });

  it('tiene al menos una foto en cada parada', () => {
    for (const stop of fixture.stops) {
      expect(stop.photos.length, `la parada "${stop.id}" no tiene fotos`).toBeGreaterThan(0);
    }
  });

  it('apunta a ficheros de imagen que existen en public/', async () => {
    const { access } = await import('node:fs/promises');
    const { join } = await import('node:path');

    for (const stop of fixture.stops) {
      for (const photo of stop.photos) {
        const path = join(process.cwd(), 'public', photo.src);
        await expect(access(path), `no existe ${photo.src}`).resolves.toBeUndefined();
      }
    }
  });
});
