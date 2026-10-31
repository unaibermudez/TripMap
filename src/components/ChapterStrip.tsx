import type { ChapterSegment } from '@/lib/timeline';
import { tripStore } from '@/lib/tripStore';

interface ChapterStripProps {
  segments: readonly ChapterSegment[];
  activeIndex: number;
}

/**
 * Los capítulos en una sola fila, solo para móvil: el activo con su título y
 * los demás reducidos a su número, para que ninguno se quede sin ancho. Un
 * click entra en el capítulo, igual que en los colapsados de escritorio.
 */
export function ChapterStrip({ segments, activeIndex }: ChapterStripProps) {
  return (
    <nav aria-label="Capítulos del viaje" className="flex h-8 shrink-0 md:hidden">
      {segments.map(({ chapter }, index) => {
        const active = index === activeIndex;

        return (
          <button
            key={chapter.id}
            type="button"
            aria-label={`Ir a ${chapter.title}`}
            aria-current={active ? 'true' : undefined}
            onClick={() => tripStore.getState().goToChapter(chapter.id)}
            className={`min-w-0 cursor-pointer border-b-2 px-2 text-left text-xs ${
              active ? 'flex-[5] font-medium text-neutral-800' : 'flex-1 text-center text-neutral-500'
            }`}
            // El color del capítulo con `1f` detrás es el mismo con alfa (§4).
            style={{
              borderColor: chapter.color,
              backgroundColor: active ? `${chapter.color}1f` : undefined,
            }}
          >
            <span className="block truncate">{active ? `${index + 1} · ${chapter.title}` : index + 1}</span>
          </button>
        );
      })}
    </nav>
  );
}
