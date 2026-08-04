import { describe, expect, it } from 'vitest';
import { BASEMAP_LIST, basemapById, DEFAULT_BASEMAP_ID } from '@/lib/basemap';

describe('catálogo de basemaps', () => {
  it('empieza en el satélite', () => {
    expect(DEFAULT_BASEMAP_ID).toBe('satellite');
  });

  it('el satélite está en el catálogo aunque no vaya primero en el selector', () => {
    expect(BASEMAP_LIST[0]?.id).toBe('positron');
    expect(BASEMAP_LIST.some((basemap) => basemap.id === DEFAULT_BASEMAP_ID)).toBe(true);
  });

  it('ofrece el mapa y el satélite, cada uno con su etiqueta', () => {
    expect(BASEMAP_LIST.map((basemap) => basemap.id)).toEqual(['positron', 'satellite']);
    for (const basemap of BASEMAP_LIST) {
      expect(basemap.label.length, `"${basemap.id}" sin etiqueta`).toBeGreaterThan(0);
    }
  });

  it('devuelve cada basemap por su id', () => {
    for (const basemap of BASEMAP_LIST) {
      expect(basemapById(basemap.id)).toBe(basemap);
    }
  });

  it('pinta la ruta de un color distinto en cada uno', () => {
    const positron = basemapById('positron');
    const satellite = basemapById('satellite');

    expect(satellite.routeColor).not.toBe(positron.routeColor);
    expect(satellite.travelledColor).not.toBe(positron.travelledColor);
  });

  it('no pinta la ruta del satélite en blanco, que es el color de las fronteras', () => {
    const satellite = basemapById('satellite');

    for (const color of [satellite.routeColor, satellite.travelledColor]) {
      expect(Math.min(...channels(color)), `"${color}" es casi blanco`).toBeLessThan(0xdd);
    }
  });
});

/** Los tres canales de un color `#rrggbb`, que es como los escribe el catálogo. */
function channels(color: string): number[] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (match === null) throw new Error(`"${color}" no es un color hex de seis dígitos.`);
  return match.slice(1).map((part) => Number.parseInt(part, 16));
}

describe('style de Positron', () => {
  it('es la URL del style JSON de Carto, sin token', () => {
    const { style } = basemapById('positron');

    expect(style).toBe('https://basemaps.cartocdn.com/gl/positron-gl-style/style.json');
  });
});

describe('style de satélite', () => {
  it('es un style raster completo, sin dependencias de glyphs ni sprite', () => {
    const { style } = basemapById('satellite');
    expect(typeof style).not.toBe('string');
    if (typeof style === 'string') return;

    expect(style.version).toBe(8);
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(style.layers.length).toBeGreaterThan(0);
    for (const layer of style.layers) {
      expect(layer.type, `la capa "${layer.id}" no es raster`).toBe('raster');
    }
  });

  it('cada capa apunta a una source declarada', () => {
    const { style } = basemapById('satellite');
    if (typeof style === 'string') return;

    for (const layer of style.layers) {
      expect('source' in layer && typeof layer.source === 'string', `"${layer.id}" sin source`).toBe(
        true,
      );
      if (!('source' in layer) || typeof layer.source !== 'string') continue;
      expect(Object.keys(style.sources)).toContain(layer.source);
    }
  });

  it('pide las teselas a Esri en el orden z/y/x que usa ArcGIS', () => {
    const { style } = basemapById('satellite');
    if (typeof style === 'string') return;

    for (const [id, source] of Object.entries(style.sources)) {
      expect(source.type, `la source "${id}" no es raster`).toBe('raster');
      if (source.type !== 'raster') continue;

      expect(source.tiles?.length, `la source "${id}" no trae teselas`).toBeGreaterThan(0);
      for (const url of source.tiles ?? []) {
        expect(url.startsWith('https://server.arcgisonline.com/'), url).toBe(true);
        expect(url.endsWith('/tile/{z}/{y}/{x}'), url).toBe(true);
      }
    }
  });

  it('lleva la atribución de Esri en cada source, que es su condición de uso', () => {
    const { style } = basemapById('satellite');
    if (typeof style === 'string') return;

    for (const [id, source] of Object.entries(style.sources)) {
      if (source.type !== 'raster') continue;
      expect(source.attribution, `la source "${id}" no atribuye`).toMatch(/Esri/);
    }
  });
});
