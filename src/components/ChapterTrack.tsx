import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { StopTicks } from '@/components/StopTicks';
import { formatDateRange } from '@/lib/dates';
import { selectCurrentStop } from '@/lib/store';
import {
  scrollLeftFor,
  stopCenterRatio,
  stopIndexAtRatio,
  type ChapterSegment,
} from '@/lib/timeline';
import { tripStore, useTripStore } from '@/lib/tripStore';

/**
 * Ancho de referencia de cada parada. Con pocas paradas la pista se estira para
 * llenar el ancho disponible; a partir de ahí crece y se desplaza.
 */
const SLOT_PX = 104;

interface ChapterTrackProps {
  segment: ChapterSegment;
}

/**
 * El capítulo activo, abierto: su cabecera y una pista con todas sus paradas,
 * etiquetadas, con el cursor encima. La escala es uniforme por índice (§2.8)
 * dentro del capítulo, y el arrastre no sale de él: para cambiar de capítulo
 * están los capítulos colapsados, las flechas y los botones del panel.
 */
export function ChapterTrack({ segment }: ChapterTrackProps) {
  const { chapter, startIndex, stopCount } = segment;

  const allStops = useTripStore((state) => state.trip.stops);
  const currentStopIndex = useTripStore((state) => state.currentStopIndex);
  const currentStop = useTripStore(selectCurrentStop);
  const isScrubbing = useTripStore((state) => state.isScrubbing);

  const stops = useMemo(
    () => allStops.slice(startIndex, startIndex + stopCount),
    [allStops, startIndex, stopCount],
  );
  const localIndex = currentStopIndex - startIndex;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (scroller === null || track === null) return;

    const offset = stopCenterRatio(localIndex, stopCount) * track.clientWidth;
    const left = scrollLeftFor(offset, scroller.scrollLeft, scroller.clientWidth, SLOT_PX);
    if (left === null) return;

    // `isScrubbing` se lee del store en el momento de desplazar y no como
    // estado de React: durante el arrastre el desplazamiento suave llegaría
    // tarde y se pelearía con el puntero.
    scroller.scrollTo({ left, behavior: tripStore.getState().isScrubbing ? 'auto' : 'smooth' });
  }, [localIndex, stopCount]);

  const indexAtClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (track === null) return currentStopIndex;

    const { left, width } = track.getBoundingClientRect();
    return startIndex + stopIndexAtRatio((clientX - left) / width, stopCount);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    // El orden importa: con `isScrubbing` ya puesto, la capa de URL trata este
    // primer salto como parte del arrastre y no ensucia el historial (§3.3).
    // Un click suelto acaba dejando una única entrada al levantar el dedo.
    tripStore.getState().startScrub();
    tripStore.getState().goToStop(indexAtClientX(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    tripStore.getState().goToStop(indexAtClientX(event.clientX));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    tripStore.getState().endScrub();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className="hidden h-11 shrink-0 border-b-2 px-2 py-1 md:block"
        // El color del capítulo con `1f` detrás es el mismo con alfa: el
        // esquema garantiza que sean seis dígitos hex (§4).
        style={{ borderColor: chapter.color, backgroundColor: `${chapter.color}1f` }}
      >
        <span className="block truncate text-xs font-medium text-neutral-800">{chapter.title}</span>
        <span className="block truncate text-[10px] text-neutral-500">
          {formatDateRange(chapter.dateStart, chapter.dateEnd)}
        </span>
      </div>

      <div ref={scrollerRef} className="overflow-x-auto overflow-y-hidden">
        <div ref={trackRef} className="relative min-w-full" style={{ width: stopCount * SLOT_PX }}>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Parada actual"
            aria-valuemin={startIndex}
            aria-valuemax={startIndex + stopCount - 1}
            aria-valuenow={currentStopIndex}
            aria-valuetext={currentStop.name}
            className="relative h-16 cursor-pointer md:h-24 touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <StopTicks
              stops={stops}
              startIndex={startIndex}
              currentStopIndex={currentStopIndex}
              chapter={chapter}
            />

            <div
              className={`pointer-events-none absolute inset-y-0 w-0 -translate-x-1/2 ${
                isScrubbing ? '' : 'transition-[left] duration-200 ease-out'
              }`}
              style={{ left: `${stopCenterRatio(localIndex, stopCount) * 100}%` }}
            >
              {/* Concéntrico con la marca de la parada activa y algo mayor, de
                  modo que la tape en vez de duplicarla justo encima. */}
              <span
                className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 md:size-6 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: chapter.color }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
