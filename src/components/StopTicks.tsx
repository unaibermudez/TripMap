import { formatShortDay } from '@/lib/dates';
import type { Chapter, Stop } from '@/lib/schema';
import { stopCenterRatio } from '@/lib/timeline';

interface StopTicksProps {
  stops: readonly Stop[];
  currentStopIndex: number;
  /** Capítulo activo: solo sus paradas se muestran con nombre y fecha. */
  activeChapter: Chapter;
}

/**
 * El nivel de abajo: todas las paradas ocupan su franja, pero solo las del
 * capítulo activo se expanden con etiqueta. Las demás quedan como puntos, que
 * es lo que hace visible que la escala es uniforme por índice (§2.8).
 */
export function StopTicks({ stops, currentStopIndex, activeChapter }: StopTicksProps) {
  return (
    <>
      {stops.map((stop, index) => {
        const expanded = stop.chapterId === activeChapter.id;
        const current = index === currentStopIndex;

        return (
          <div
            key={stop.id}
            className="absolute top-2 flex -translate-x-1/2 flex-col items-center"
            style={{
              left: `${stopCenterRatio(index, stops.length) * 100}%`,
              width: `${100 / stops.length}%`,
            }}
          >
            <span
              className={
                expanded
                  ? 'size-2.5 rounded-full ring-2 ring-white'
                  : 'mt-0.5 size-1.5 rounded-full bg-neutral-300'
              }
              style={expanded ? { backgroundColor: activeChapter.color } : undefined}
            />
            {expanded && (
              <span
                className={`mt-1.5 w-full truncate px-1 text-center text-[11px] leading-tight ${
                  current ? 'font-semibold text-neutral-900' : 'text-neutral-600'
                }`}
              >
                {stop.name}
              </span>
            )}
            {expanded && (
              <span className="w-full truncate px-1 text-center text-[10px] leading-tight text-neutral-400">
                {formatShortDay(stop.dateStart)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
