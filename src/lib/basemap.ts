import type { MapLibreMap } from 'maplibre-gl';

/**
 * `maplibre-gl` no reexporta el tipo del style-spec, así que se saca de la
 * firma, igual que el de los filtros en `MapView`.
 */
type StyleSpec = Exclude<NonNullable<Parameters<MapLibreMap['setStyle']>[0]>, string>;

export type BasemapId = 'positron' | 'satellite';

export interface Basemap {
  readonly id: BasemapId;
  readonly label: string;
  /** URL del style cuando lo sirve un tercero, o el style entero si lo montamos aquí. */
  readonly style: string | StyleSpec;
  /** Color de la ruta completa. El gris de Positron se pierde sobre la foto aérea. */
  readonly routeColor: string;
  /** Color de la ruta ya recorrida. */
  readonly travelledColor: string;
}

/**
 * Style de la vista de satélite. Se escribe a mano porque las teselas de Esri
 * son un servicio de imágenes, no un style: son raster, así que no hacen falta
 * ni glyphs ni sprite. La capa de referencia va encima y trae los topónimos y
 * las fronteras, que en la foto sola no están.
 *
 * `attribution` en cada source es lo que muestra el control de atribución, que
 * es la condición de uso del servicio, igual que con Positron (§2.3).
 */
const SATELLITE_STYLE: StyleSpec = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Imágenes: <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, ' +
        'Maxar, Earthstar Geographics y la comunidad de usuarios SIG',
    },
    'esri-places': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '<a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>',
    },
  },
  layers: [
    { id: 'esri-imagery', type: 'raster', source: 'esri-imagery' },
    { id: 'esri-places', type: 'raster', source: 'esri-places' },
  ],
};

const BASEMAPS: Record<BasemapId, Basemap> = {
  positron: {
    id: 'positron',
    label: 'Mapa',
    // Positron se sirve sin token y trae en su style la atribución de OSM y CARTO (§2.3).
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    routeColor: '#a3a3a3',
    travelledColor: '#2563eb',
  },
  satellite: {
    id: 'satellite',
    label: 'Satélite',
    style: SATELLITE_STYLE,
    // Ni blanco ni nada que se le acerque: la capa de referencia dibuja las
    // fronteras y las costas en blanco y la ruta se confundiría con ellas. El
    // violeta y el ámbar no salen en la foto aérea ni en las fronteras, y
    // mantienen la jerarquía de Positron: lo recorrido es lo que más resalta.
    routeColor: '#a78bfa',
    travelledColor: '#fbbf24',
  },
};

/** El basemap sobrio en grises sigue siendo el de partida (§2.3). */
export const DEFAULT_BASEMAP_ID: BasemapId = 'positron';

/** En el orden en que los ofrece el selector. */
export const BASEMAP_LIST: readonly Basemap[] = [BASEMAPS.positron, BASEMAPS.satellite];

export function basemapById(id: BasemapId): Basemap {
  return BASEMAPS[id];
}
