import { readFile, writeFile } from 'node:fs/promises';
import type { Position } from 'geojson';
import { legs } from '../src/data/legs.ts';
import { stops } from '../src/data/stops.ts';
import type { Coords, TravelMode } from '../src/lib/schema.ts';

const OUTPUT_PATH = 'src/data/generated/road-routes.json';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

/** Solo estos modos siguen carreteras; el resto se dibuja como arco (§2.9, §9). */
const ROUTABLE_MODES: ReadonlySet<TravelMode> = new Set(['car', 'bus']);

interface OsrmResponse {
  code: string;
  routes?: { geometry: { coordinates: Position[] } }[];
}

function legKey(fromStopId: string, toStopId: string): string {
  return `${fromStopId}→${toStopId}`;
}

/**
 * Mismo criterio que `snapEndpoints` de `src/lib/route.ts`: OSRM engancha el
 * punto pedido a la carretera más cercana, no a la coordenada exacta de la
 * parada. Se corrige aquí para que el fichero generado ya quede correcto.
 */
function snapEndpoints(coordinates: Position[], from: Coords, to: Coords): Position[] {
  if (coordinates.length < 2) return [from, to];
  return [from, ...coordinates.slice(1, -1), to];
}

async function fetchRoadRoute(from: Coords, to: Coords): Promise<Position[]> {
  const url = `${OSRM_BASE}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM respondió ${response.status} ${response.statusText}.`);
  }

  const body = (await response.json()) as OsrmResponse;
  const route = body.routes?.[0];
  if (body.code !== 'Ok' || route === undefined) {
    throw new Error(`OSRM no encontró ruta (code: ${body.code}).`);
  }

  return route.geometry.coordinates;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function readExistingTable(): Promise<Record<string, Position[]>> {
  let raw: string;
  try {
    raw = await readFile(OUTPUT_PATH, 'utf8');
  } catch (error) {
    if (isNotFoundError(error)) return {};
    throw error;
  }

  return JSON.parse(raw) as Record<string, Position[]>;
}

async function main(): Promise<void> {
  const table = await readExistingTable();
  let added = 0;

  for (const [index, leg] of legs.entries()) {
    const from = stops[index];
    const to = stops[index + 1];
    if (from === undefined || to === undefined) continue;
    if (!ROUTABLE_MODES.has(leg.mode)) continue;

    const key = legKey(leg.fromStopId, leg.toStopId);
    if (key in table) continue;

    console.log(`→ ${key} (${leg.mode})`);
    try {
      const coordinates = await fetchRoadRoute(from.coords, to.coords);
      const snapped = snapEndpoints(coordinates, from.coords, to.coords);
      table[key] = snapped;
      added += 1;
      console.log(`  ✓ ${snapped.length} puntos`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`"${key}": ${reason}`);
    }
  }

  if (added === 0) {
    console.log('Nada nuevo que rutar: todos los legs por carretera ya tienen entrada.');
    return;
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(table, null, 2)}\n`, 'utf8');
  console.log(`\n${added} ruta(s) nueva(s) escrita(s) en ${OUTPUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
