import { formatShortDay } from '@/lib/dates';
import type { Chapter, Stop } from '@/lib/schema';
import { stopCenterRatio } from '@/lib/timeline';
import { tripStore } from '@/lib/tripStore';

interface StopTicksProps {
  /** Solo las paradas del capítulo abierto, en orden. */
  stops: readonly Stop[];
  /** Índice de `stops[0]` en `trip.stops`, para navegar por el índice global. */
  startIndex: number;
  currentStopIndex: number;
  chapter: Chapter;
}

/**
 * Las paradas del capítulo abierto, cada una en su franja y con nombre y fecha,
 * unidas por una línea horizontal del color del capítulo. La escala es uniforme
 * por índice (§2.8): las franjas miden lo mismo, se haya estado un día o una
 * semana.
 */
export function StopTicks({ stops, startIndex, currentStopIndex, chapter }: StopTicksProps) {
  const firstCenter = stopCenterRatio(0, stops.length) * 100;
  const lastCenter = stopCenterRatio(stops.length - 1, stops.length) * 100;

  return (
    <>
      <span
        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{
          left: `${firstCenter}%`,
          width: `${lastCenter - firstCenter}%`,
          backgroundColor: chapter.color,
        }}
      />

      {stops.map((stop, index) => {
        const current = startIndex + index === currentStopIndex;

        return (
          <div
            key={stop.id}
            className="absolute inset-y-0 flex -translate-x-1/2 flex-col items-center justify-center"
            style={{
              left: `${stopCenterRatio(index, stops.length) * 100}%`,
              width: `${100 / stops.length}%`,
            }}
            onClick={() => tripStore.getState().goToStop(startIndex + index)}
          >
            <span
              className={`flex h-8 w-full items-end justify-center px-1 pb-1 text-center text-xs leading-tight ${
                current ? 'font-semibold text-neutral-900' : 'text-neutral-600'
              }`}
            >
              <span className="line-clamp-2">{stop.name}</span>
            </span>
            <span
              className="size-5 shrink-0 rounded-full ring-2 ring-white"
              style={{ backgroundColor: chapter.color }}
            />
            <span className="flex h-8 w-full items-start justify-center truncate px-1 pt-1 text-center text-[11px] leading-tight text-neutral-400">
              {formatShortDay(stop.dateStart)}
            </span>
          </div>
        );
      })}
    </>
  );
}
