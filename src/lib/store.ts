import { createStore, type StoreApi } from 'zustand/vanilla';
import { DEFAULT_BASEMAP_ID, type BasemapId } from '@/lib/basemap';
import type { Chapter, Stop, Trip } from '@/lib/schema';

export interface TripState {
  /** El viaje ya validado. Constante durante toda la vida del store. */
  readonly trip: Trip;
  /** Posición en `trip.stops`, que es el orden canónico del viaje (§2.7). */
  currentStopIndex: number;
  /** Basemap elegido. El mapa lo lee de aquí como todo lo demás (§3.8). */
  basemapId: BasemapId;
  /** Cierto mientras se arrastra el cursor de la timeline (§3.2). */
  isScrubbing: boolean;
  /**
   * Hoja inferior del panel desplegada. Solo la mira el móvil: en escritorio el
   * panel está siempre abierto (§3.6).
   */
  isPanelOpen: boolean;
  goToStop: (index: number) => void;
  goToChapter: (chapterId: string) => void;
  setBasemap: (id: BasemapId) => void;
  next: () => void;
  prev: () => void;
  startScrub: () => void;
  endScrub: () => void;
  togglePanel: () => void;
}

export type TripStore = StoreApi<TripState>;

/**
 * El estado central del que leen y en el que escriben mapa, timeline y panel
 * (§3). Todas las formas de navegar acaban en `goToStop`.
 *
 * Es una factoría en vez de un módulo con estado para poder montar un store
 * limpio por test; la instancia que usa la app está en `@/lib/tripStore`.
 */
export function createTripStore(trip: Trip): TripStore {
  const lastIndex = trip.stops.length - 1;

  return createStore<TripState>()((set, get) => ({
    trip,
    currentStopIndex: 0,
    basemapId: DEFAULT_BASEMAP_ID,
    isScrubbing: false,
    // Cerrada de entrada: en un móvil el mapa es lo primero que hay que ver.
    isPanelOpen: false,

    goToStop: (index) => {
      if (!Number.isFinite(index)) return;
      const target = Math.min(Math.max(Math.trunc(index), 0), lastIndex);
      // Sin cambio no se notifica: la capa de URL cuenta cada aviso como una
      // navegación y metería entradas de historial de más.
      if (target === get().currentStopIndex) return;
      set({ currentStopIndex: target });
    },

    goToChapter: (chapterId) => {
      // Las paradas de un capítulo son contiguas (§4), así que la primera que
      // aparece es su principio.
      const index = trip.stops.findIndex((stop) => stop.chapterId === chapterId);
      if (index === -1) return;
      get().goToStop(index);
    },

    setBasemap: (id) => {
      // Repetir el basemap activo haría que el mapa recargara el style entero,
      // que es lo único que escucha este trozo de estado.
      if (id === get().basemapId) return;
      set({ basemapId: id });
    },

    next: () => get().goToStop(get().currentStopIndex + 1),
    prev: () => get().goToStop(get().currentStopIndex - 1),

    startScrub: () => {
      if (!get().isScrubbing) set({ isScrubbing: true });
    },
    endScrub: () => {
      if (get().isScrubbing) set({ isScrubbing: false });
    },

    togglePanel: () => set({ isPanelOpen: !get().isPanelOpen }),
  }));
}

function invariant(message: string): never {
  throw new Error(`${message} El store no puede llegar a este estado.`);
}

export function selectCurrentStop(state: TripState): Stop {
  const stop = state.trip.stops[state.currentStopIndex];
  if (stop === undefined) invariant(`No hay parada en el índice ${state.currentStopIndex}.`);
  return stop;
}

/** El capítulo activo se deriva de la parada activa, no se guarda aparte (§3). */
export function selectCurrentChapter(state: TripState): Chapter {
  const { chapterId } = selectCurrentStop(state);
  const chapter = state.trip.chapters.find((candidate) => candidate.id === chapterId);
  if (chapter === undefined) invariant(`La parada activa apunta al capítulo "${chapterId}".`);
  return chapter;
}
