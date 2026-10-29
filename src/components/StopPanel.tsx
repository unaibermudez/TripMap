import { Markdown } from '@/components/Markdown';
import { PhotoGallery } from '@/components/PhotoGallery';
import { formatDateRange } from '@/lib/dates';
import { selectCurrentChapter, selectCurrentStop } from '@/lib/store';
import { arrivalLeg, travelModeLabel } from '@/lib/travel';
import { tripStore, useTripStore } from '@/lib/tripStore';

/** El `aria-controls` del botón que despliega la hoja en móvil. */
const CONTENT_ID = 'stop-panel-content';

const NAV_BUTTON =
  'rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 ' +
  'transition-colors hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 ' +
  'disabled:hover:bg-transparent';

const STEP_BUTTON =
  'flex min-w-0 flex-1 cursor-pointer flex-col rounded-lg px-4 py-2.5 transition ' +
  'disabled:cursor-default disabled:opacity-40';

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
  const prevStop = trip.stops[currentStopIndex - 1];
  const nextStop = trip.stops[currentStopIndex + 1];

  return (
    <aside
      aria-label="Detalle de la parada"
      className="flex max-h-[60%] shrink-0 flex-col border-t border-neutral-200 bg-white md:h-full md:max-h-none md:w-[26rem] md:border-t-0 md:border-l lg:w-[30rem]"
    >
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold tracking-wide uppercase"
            style={{ color: chapter.color }}
          >
            {chapter.title} · Parada {currentStopIndex + 1} de {trip.stops.length}
          </p>
          <h2 className="mt-1 text-xl leading-tight font-semibold text-neutral-900">
            {stop.title}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
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
        className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:block ${isPanelOpen ? '' : 'hidden'}`}
      >
        {arrival !== null && (
          <p className="mb-3 text-sm text-neutral-400">Llegada {travelModeLabel(arrival.mode)}</p>
        )}

        <Markdown body={stop.body} />
        <PhotoGallery photos={stop.photos} stopName={stop.name} />
      </div>

      <footer className="flex shrink-0 gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <button
          type="button"
          onClick={() => tripStore.getState().prev()}
          disabled={prevStop === undefined}
          className={`${STEP_BUTTON} items-start border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 disabled:hover:bg-white`}
        >
          <span className="text-xs font-medium text-neutral-500">← Anterior</span>
          <span className="max-w-full truncate text-sm font-semibold">
            {prevStop?.name ?? 'Inicio del viaje'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => tripStore.getState().next()}
          disabled={nextStop === undefined}
          style={{ backgroundColor: chapter.color }}
          className={`${STEP_BUTTON} items-end text-white shadow-sm hover:brightness-110 disabled:hover:brightness-100`}
        >
          <span className="text-xs font-medium text-white/80">Siguiente →</span>
          <span className="max-w-full truncate text-sm font-semibold">
            {nextStop?.name ?? 'Fin del viaje'}
          </span>
        </button>
      </footer>
    </aside>
  );
}
