import { loadTrip } from '@/lib/loader';
import { chapters } from '@/data/chapters';
import { legs } from '@/data/legs';
import { stops } from '@/data/stops';

/**
 * Se valida al importar el módulo, es decir en build time: si los datos están
 * mal, el build falla en vez de romperse en el navegador.
 */
export const trip = loadTrip({ stops, chapters, legs });
