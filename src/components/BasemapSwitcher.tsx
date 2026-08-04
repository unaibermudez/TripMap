import { BASEMAP_LIST } from '@/lib/basemap';
import { tripStore, useTripStore } from '@/lib/tripStore';

/**
 * Elige el tipo de mapa. Va sobre el mapa, arriba a la derecha: abajo a la
 * derecha está la atribución, que tiene que verse entera (§2.3). Como todo lo
 * demás, solo lee del store y dispara una acción suya (§3).
 */
export function BasemapSwitcher() {
  const basemapId = useTripStore((state) => state.basemapId);

  return (
    <div
      role="group"
      aria-label="Tipo de mapa"
      className="absolute top-2 right-2 flex overflow-hidden rounded border border-neutral-300 bg-white/90 shadow-sm backdrop-blur"
    >
      {BASEMAP_LIST.map((basemap) => {
        const active = basemap.id === basemapId;

        return (
          <button
            key={basemap.id}
            type="button"
            aria-pressed={active}
            onClick={() => tripStore.getState().setBasemap(basemap.id)}
            className={`cursor-pointer px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-neutral-800 text-white' : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {basemap.label}
          </button>
        );
      })}
    </div>
  );
}
