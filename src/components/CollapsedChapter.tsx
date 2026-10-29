import { formatDateRange } from '@/lib/dates';
import type { ChapterSegment } from '@/lib/timeline';
import { tripStore } from '@/lib/tripStore';

interface CollapsedChapterProps {
  segment: ChapterSegment;
  /** Antes o después del capítulo abierto: decide el borde y el color de los puntos. */
  side: 'past' | 'future';
}

/**
 * Un capítulo que no es el activo: su título, sus fechas y un punto por parada,
 * sin etiquetas. Un click entra en él. Se encoge antes que el capítulo abierto,
 * que es el que se queda con el ancho sobrante.
 */
export function CollapsedChapter({ segment, side }: CollapsedChapterProps) {
  const { chapter, stopCount } = segment;

  return (
    <button
      type="button"
      title={chapter.title}
      aria-label={`Ir a ${chapter.title}`}
      onClick={() => tripStore.getState().goToChapter(chapter.id)}
      className={`flex w-24 min-w-10 shrink cursor-pointer flex-col border-neutral-200 text-left transition-colors hover:bg-neutral-100 md:w-40 ${
        side === 'past' ? 'border-r' : 'border-l'
      }`}
    >
      <span
        className="block h-11 w-full shrink-0 border-b-2 px-2 py-1"
        style={{ borderColor: chapter.color }}
      >
        <span className="block truncate text-xs font-medium text-neutral-800">{chapter.title}</span>
        <span className="block truncate text-[10px] text-neutral-500">
          {formatDateRange(chapter.dateStart, chapter.dateEnd)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex flex-1 items-center justify-center gap-1.5 overflow-hidden px-2"
      >
        {Array.from({ length: stopCount }, (_, index) => (
          <span
            key={index}
            className={`size-2 shrink-0 rounded-full ${side === 'future' ? 'bg-neutral-300' : ''}`}
            style={side === 'past' ? { backgroundColor: chapter.color } : undefined}
          />
        ))}
      </span>
    </button>
  );
}
