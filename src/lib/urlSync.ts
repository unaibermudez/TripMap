import type { TripStore } from '@/lib/store';

/** La URL lleva el id de la parada, nunca el índice (§3.2). */
export const STOP_PARAM = 'stop';

export function readStopId(search: string): string | null {
  const value = new URLSearchParams(search).get(STOP_PARAM);
  return value === null || value === '' ? null : value;
}

/** La misma query con `stop` puesto o quitado; el resto de parámetros se conserva. */
export function withStopId(search: string, stopId: string | null): string {
  const params = new URLSearchParams(search);
  if (stopId === null) params.delete(STOP_PARAM);
  else params.set(STOP_PARAM, stopId);

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/**
 * Conecta el store con `?stop=<id>` en los dos sentidos (§3.2): la navegación
 * discreta empuja al historial, el arrastre de la timeline no, y el botón de
 * atrás vuelve a la parada de la entrada anterior.
 *
 * Devuelve la función que deshace la conexión.
 */
export function syncStoreWithUrl(store: TripStore): () => void {
  // Mientras se aplica lo que dice la URL no se vuelve a escribir en ella.
  let applyingUrl = false;
  // URL de antes de empezar a arrastrar, para poder devolvérsela al historial.
  let scrubStartUrl: string | null = null;

  const currentUrl = (): string =>
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const urlWith = (stopId: string | null): string =>
    `${window.location.pathname}${withStopId(window.location.search, stopId)}${window.location.hash}`;

  const idAt = (index: number): string | null => store.getState().trip.stops[index]?.id ?? null;

  const indexOfId = (stopId: string | null): number =>
    stopId === null ? -1 : store.getState().trip.stops.findIndex((stop) => stop.id === stopId);

  const applyIndex = (index: number): void => {
    applyingUrl = true;
    try {
      // Un id que no existe cae a la primera parada (§3.2).
      store.getState().goToStop(index === -1 ? 0 : index);
    } finally {
      applyingUrl = false;
    }
  };

  const onPopState = (): void => {
    applyIndex(indexOfId(readStopId(window.location.search)));
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (applyingUrl) return;

    const moved = state.currentStopIndex !== previous.currentStopIndex;
    const released = previous.isScrubbing && !state.isScrubbing;
    if (!moved && !released) return;

    const url = urlWith(idAt(state.currentStopIndex));

    if (released) {
      const start = scrubStartUrl;
      scrubStartUrl = null;
      // `scrubStartUrl` solo se rellena si el cursor llegó a moverse.
      if (start === null || start === url) return;
      // El arrastre ha ido pisando la entrada actual: se le devuelve su URL y
      // se empuja la parada final, que es la única que deja rastro.
      window.history.replaceState(null, '', start);
      window.history.pushState(null, '', url);
      return;
    }

    if (state.isScrubbing) {
      scrubStartUrl ??= currentUrl();
      window.history.replaceState(null, '', url);
      return;
    }

    if (url === currentUrl()) return;
    window.history.pushState(null, '', url);
  });

  const initialId = readStopId(window.location.search);
  const initialIndex = indexOfId(initialId);
  applyIndex(initialIndex);
  if (initialId !== null && initialIndex === -1) {
    window.history.replaceState(null, '', urlWith(null));
  }

  window.addEventListener('popstate', onPopState);

  return () => {
    window.removeEventListener('popstate', onPopState);
    unsubscribe();
  };
}
