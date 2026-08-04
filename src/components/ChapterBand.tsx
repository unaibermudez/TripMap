import { formatDateRange } from '@/lib/dates';
import type { ChapterSegment } from '@/lib/timeline';
import { tripStore } from '@/lib/tripStore';

interface ChapterBandProps {
  segments: readonly ChapterSegment[];
  activeChapterId: string;
}

/**
 * El nivel de arriba de la timeline: siempre están todos los capítulos. Cada
 * banda se estira en proporción a sus paradas, que es lo que la deja alineada
 * con las marcas de parada de debajo.
 */
export function ChapterBand({ segments, activeChapterId }: ChapterBandProps) {
  return (
    <div className="flex h-11 w-full">
      {segments.map(({ chapter, stopCount }) => {
        const active = chapter.id === activeChapterId;

        return (
          <button
            key={chapter.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => tripStore.getState().goToChapter(chapter.id)}
            // El color del capítulo con `1f` detrás es el mismo con alfa: el
            // esquema garantiza que sean seis dígitos hex (§4).
            style={{
              flexGrow: stopCount,
              flexBasis: 0,
              borderColor: chapter.color,
              backgroundColor: active ? `${chapter.color}1f` : undefined,
            }}
            className="min-w-0 cursor-pointer border-b-2 px-2 py-1 text-left transition-colors hover:bg-neutral-100"
          >
            <span className="block truncate text-xs font-medium text-neutral-800">
              {chapter.title}
            </span>
            <span className="block truncate text-[10px] text-neutral-500">
              {formatDateRange(chapter.dateStart, chapter.dateEnd)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
