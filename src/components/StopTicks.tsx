import { formatShortDay } from '@/lib/dates';
import type { Chapter, Stop } from '@/lib/schema';
import { stopCenterRatio } from '@/lib/timeline';
import { tripStore } from '@/lib/tripStore';

interface StopTicksProps {
  stops: readonly Stop[];
  currentStopIndex: number;
  /** Capítulo activo: solo sus paradas se muestran con nombre y fecha. */
  activeChapter: Chapter;
  /** Para colorear cada tramo de la línea con el color de su capítulo. */
  chapters: readonly Chapter[];
}

/**
 * El nivel de abajo: todas las paradas ocupan su franja, pero solo las del
 * capítulo activo se expanden con etiqueta. Las demás quedan como puntos, que
 * es lo que hace visible que la escala es uniforme por índice (§2.8). Los
 * círculos se conectan con una línea horizontal coloreada tramo a tramo, que
 * da continuidad visual con `ChapterBand`.
 */
export function StopTicks({ stops, currentStopIndex, activeChapter, chapters }: StopTicksProps) {
  const colorByChapterId = new Map(chapters.map((chapter) => [chapter.id, chapter.color]));

  return (
    <>
      {stops.slice(0, -1).map((stop, index) => {
        const left = stopCenterRatio(index, stops.length) * 100;
        const right = stopCenterRatio(index + 1, stops.length) * 100;

        return (
          <span
            key={`segment-${stop.id}`}
            className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
            style={{
              left: `${left}%`,
              width: `${right - left}%`,
              backgroundColor: colorByChapterId.get(stop.chapterId),
            }}
          />
        );
      })}

      {stops.map((stop, index) => {
        const expanded = stop.chapterId === activeChapter.id;
        const current = index === currentStopIndex;

        return (
          <div
            key={stop.id}
            className="absolute inset-y-0 flex -translate-x-1/2 flex-col items-center justify-center"
            style={{
              left: `${stopCenterRatio(index, stops.length) * 100}%`,
              width: `${100 / stops.length}%`,
            }}
            onClick={() => tripStore.getState().goToStop(index)}
          >
            <span
              className={`flex h-4 w-full items-end justify-center truncate px-1 text-center text-[11px] leading-tight ${
                current ? 'font-semibold text-neutral-900' : 'text-neutral-600'
              }`}
            >
              {expanded ? stop.name : ''}
            </span>
            <span
              className={
                expanded
                  ? 'size-5 shrink-0 rounded-full ring-2 ring-white'
                  : 'size-2 shrink-0 rounded-full bg-neutral-300'
              }
              style={expanded ? { backgroundColor: activeChapter.color } : undefined}
            />
            <span className="flex h-4 w-full items-start justify-center truncate px-1 text-center text-[10px] leading-tight text-neutral-400">
              {expanded ? formatShortDay(stop.dateStart) : ''}
            </span>
          </div>
        );
      })}
    </>
  );
}
