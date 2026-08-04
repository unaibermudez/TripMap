import { useEffect } from 'react';
import { MapView } from '@/components/MapView';
import { StopPanel } from '@/components/StopPanel';
import { Timeline } from '@/components/Timeline';
import { tripStore } from '@/lib/tripStore';
import { syncStoreWithUrl } from '@/lib/urlSync';

/**
 * La única isla de la página (§3.1). Mapa, timeline y panel viven aquí dentro y
 * se hablan solo a través del store.
 */
export function App() {
  // `?stop=<id>` en los dos sentidos (§3.2). Al ser un sitio estático, la URL se
  // aplica en cliente durante la hidratación.
  useEffect(() => syncStoreWithUrl(tripStore), []);

  return (
    <div className="flex h-full w-full flex-col">
      {/* El panel se apila bajo el mapa en móvil y se pone a su lado en
          escritorio; la timeline cruza todo el ancho en los dos casos. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <MapView />
        </div>
        <StopPanel />
      </div>
      <Timeline />
    </div>
  );
}
