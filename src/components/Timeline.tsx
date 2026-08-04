import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { ChapterBand } from '@/components/ChapterBand';
import { StopTicks } from '@/components/StopTicks';
import { selectCurrentChapter, selectCurrentStop } from '@/lib/store';
import { chapterSegments, scrollLeftFor, stopCenterRatio, stopIndexAtRatio } from '@/lib/timeline';
import { tripStore, useTripStore } from '@/lib/tripStore';

/**
 * Ancho de referencia de cada parada. Con pocas paradas la pista se estira para
 * llenar el ancho disponible; a partir de ahí crece y se desplaza.
 */
const SLOT_PX = 76;

export function Timeline() {
  const trip = useTripStore((state) => state.trip);
  const currentStopIndex = useTripStore((state) => state.currentStopIndex);
  const currentStop = useTripStore(selectCurrentStop);
  const currentChapter = useTripStore(selectCurrentChapter);
  const isScrubbing = useTripStore((state) => state.isScrubbing);

  const segments = useMemo(() => chapterSegments(trip), [trip]);
  const stopCount = trip.stops.length;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === 'ArrowRight') tripStore.getState().next();
      else if (event.key === 'ArrowLeft') tripStore.getState().prev();
      else return;

      // Si no, además de navegar se desplazaría la pista o la página entera.
      event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (scroller === null || track === null) return;

    const offset = stopCenterRatio(currentStopIndex, stopCount) * track.clientWidth;
    const left = scrollLeftFor(offset, scroller.scrollLeft, scroller.clientWidth, SLOT_PX);
    if (left === null) return;

    // `isScrubbing` se lee del store en el momento de desplazar y no como
    // estado de React: durante el arrastre el desplazamiento suave llegaría
    // tarde y se pelearía con el puntero.
    scroller.scrollTo({ left, behavior: tripStore.getState().isScrubbing ? 'auto' : 'smooth' });
  }, [currentStopIndex, stopCount]);

  const indexAtClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (track === null) return currentStopIndex;

    const { left, width } = track.getBoundingClientRect();
    return stopIndexAtRatio((clientX - left) / width, stopCount);
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
    <section
      aria-label="Línea de tiempo del viaje"
      className="shrink-0 border-t border-neutral-200 bg-white"
    >
      <div ref={scrollerRef} className="overflow-x-auto overflow-y-hidden">
        <div ref={trackRef} className="relative min-w-full" style={{ width: stopCount * SLOT_PX }}>
          <ChapterBand segments={segments} activeChapterId={currentChapter.id} />

          <div
            role="slider"
            tabIndex={0}
            aria-label="Parada actual"
            aria-valuemin={0}
            aria-valuemax={stopCount - 1}
            aria-valuenow={currentStopIndex}
            aria-valuetext={currentStop.name}
            className="relative h-20 cursor-pointer touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <StopTicks
              stops={trip.stops}
              currentStopIndex={currentStopIndex}
              activeChapter={currentChapter}
              chapters={trip.chapters}
            />

            <div
              className={`pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-neutral-800 ${
                isScrubbing ? '' : 'transition-[left] duration-200 ease-out'
              }`}
              style={{ left: `${stopCenterRatio(currentStopIndex, stopCount) * 100}%` }}
            >
              {/* Concéntrico con la marca de la parada activa y algo mayor, de
                  modo que la tape en vez de duplicarla justo encima. */}
              <span
                className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: currentChapter.color }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
