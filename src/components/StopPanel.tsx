import { Markdown } from '@/components/Markdown';
import { PhotoGallery } from '@/components/PhotoGallery';
import { formatDateRange } from '@/lib/dates';
import { selectCurrentChapter, selectCurrentStop } from '@/lib/store';
import { arrivalLeg, travelModeLabel } from '@/lib/travel';
import { tripStore, useTripStore } from '@/lib/tripStore';

/** El `aria-controls` del botón que despliega la hoja en móvil. */
const CONTENT_ID = 'stop-panel-content';

const NAV_BUTTON =
  'rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 ' +
  'transition-colors hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 ' +
  'disabled:hover:bg-transparent';

/**
 * La parada activa: título, fechas, cuerpo y fotos. Panel lateral en escritorio
 * y hoja inferior desplegable en móvil, con el mismo marcado en los dos casos
 * (§3.6). Solo lee del store y dispara sus acciones.
 */
export function StopPanel() {
  const trip = useTripStore((state) => state.trip);
  const currentStopIndex = useTripStore((state) => state.currentStopIndex);
  const stop = useTripStore(selectCurrentStop);
  const chapter = useTripStore(selectCurrentChapter);
  const isPanelOpen = useTripStore((state) => state.isPanelOpen);

  const arrival = arrivalLeg(trip, currentStopIndex);

  return (
    <aside
      aria-label="Detalle de la parada"
      className="flex max-h-[60%] shrink-0 flex-col border-t border-neutral-200 bg-white md:h-full md:max-h-none md:w-96 md:border-t-0 md:border-l"
    >
      <header className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[11px] font-semibold tracking-wide uppercase"
            style={{ color: chapter.color }}
          >
            {chapter.title}
          </p>
          <h2 className="mt-0.5 text-lg leading-tight font-semibold text-neutral-900">
            {stop.title}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {stop.name} · {formatDateRange(stop.dateStart, stop.dateEnd)}
          </p>
        </div>

        {/* En escritorio el panel no se pliega: no hay nada que anunciar. */}
        <button
          type="button"
          aria-expanded={isPanelOpen}
          aria-controls={CONTENT_ID}
          onClick={() => tripStore.getState().togglePanel()}
          className={`${NAV_BUTTON} shrink-0 md:hidden`}
        >
          {isPanelOpen ? 'Ocultar' : 'Ver más'}
        </button>
      </header>

      <div
        id={CONTENT_ID}
        className={`min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:block ${isPanelOpen ? '' : 'hidden'}`}
      >
        {arrival !== null && (
          <p className="mb-3 text-xs text-neutral-400">Llegada {travelModeLabel(arrival.mode)}</p>
        )}

        <Markdown body={stop.body} />
        <PhotoGallery photos={stop.photos} stopName={stop.name} />
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200 px-4 py-2">
        <button
          type="button"
          onClick={() => tripStore.getState().prev()}
          disabled={currentStopIndex === 0}
          className={NAV_BUTTON}
        >
          ← Anterior
        </button>
        <span className="text-xs tabular-nums text-neutral-500">
          {currentStopIndex + 1} / {trip.stops.length}
        </span>
        <button
          type="button"
          onClick={() => tripStore.getState().next()}
          disabled={currentStopIndex === trip.stops.length - 1}
          className={NAV_BUTTON}
        >
          Siguiente →
        </button>
      </footer>
    </aside>
  );
}
