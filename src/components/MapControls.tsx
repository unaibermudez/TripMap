import type { ReactNode } from 'react';

interface MapControlsProps {
  onFocusStop: () => void;
  onShowOverview: () => void;
}

const BUTTON =
  'flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 px-2.5 text-xs ' +
  'font-medium text-neutral-700 transition-colors hover:bg-neutral-100';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * Encuadres del mapa: volver a la parada activa o abrir el plano para ver todo
 * el viaje. Van arriba a la izquierda, que es el único rincón libre: el selector
 * de tipo está arriba a la derecha y la atribución abajo (§2.3). No navegan, solo
 * mueven la cámara, así que no pasan por el store.
 */
export function MapControls({ onFocusStop, onShowOverview }: MapControlsProps) {
  return (
    <div
      role="group"
      aria-label="Encuadre del mapa"
      className="absolute top-2 left-2 flex flex-col divide-y divide-neutral-300 overflow-hidden rounded border border-neutral-300 bg-white/90 shadow-sm backdrop-blur"
    >
      <button
        type="button"
        aria-label="Centrar en la parada actual"
        title="Centrar en la parada actual"
        onClick={onFocusStop}
        className={BUTTON}
      >
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </Icon>
        <span className="hidden md:inline">Parada actual</span>
      </button>
      <button
        type="button"
        aria-label="Vista general del viaje"
        title="Vista general del viaje"
        onClick={onShowOverview}
        className={BUTTON}
      >
        <Icon>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </Icon>
        <span className="hidden md:inline">Vista general</span>
      </button>
    </div>
  );
}
