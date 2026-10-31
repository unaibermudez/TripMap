import { useEffect, useMemo } from 'react';
import { ChapterStrip } from '@/components/ChapterStrip';
import { ChapterTrack } from '@/components/ChapterTrack';
import { CollapsedChapter } from '@/components/CollapsedChapter';
import { selectCurrentChapter } from '@/lib/store';
import { chapterSegments } from '@/lib/timeline';
import { tripStore, useTripStore } from '@/lib/tripStore';

/**
 * Un solo capítulo abierto, el de la parada activa, con sus paradas; los demás
 * quedan colapsados a ambos lados. El capítulo abierto se deriva de la parada
 * activa (§3), así que cambiar de capítulo no es estado propio de la timeline.
 */
export function Timeline() {
  const trip = useTripStore((state) => state.trip);
  const currentChapter = useTripStore(selectCurrentChapter);

  const segments = useMemo(() => chapterSegments(trip), [trip]);
  const activeIndex = segments.findIndex((segment) => segment.chapter.id === currentChapter.id);

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

  return (
    <section
      aria-label="Línea de tiempo del viaje"
      className="flex shrink-0 flex-col border-t border-neutral-200 bg-white md:min-h-[8.75rem]"
    >
      <ChapterStrip segments={segments} activeIndex={activeIndex} />
      <div className="flex min-w-0 flex-1">
        {segments.map((segment, index) =>
          index === activeIndex ? (
            <ChapterTrack key={segment.chapter.id} segment={segment} />
          ) : (
            <CollapsedChapter
              key={segment.chapter.id}
              segment={segment}
              side={index < activeIndex ? 'past' : 'future'}
            />
          ),
        )}
      </div>
    </section>
  );
}
