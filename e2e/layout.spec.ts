import { expect, test, type Page, type TestInfo } from '@playwright/test';

/**
 * Un PNG de un color plano se comprime a unos pocos cientos de bytes; el mapa
 * pintado pasa de cien mil. El umbral distingue las dos cosas sin decodificar
 * la imagen, que es justo lo que hace falta para detectar el riesgo conocido
 * del slice: WebGL sin GPU deja el canvas en blanco sin dar ningún error.
 */
const CANVAS_BLANK_BYTES = 15_000;

/** Lo que tarda el `flyTo` (§3.4) más un margen para que el mapa quede quieto. */
const FLY_SETTLE_MS = 2_000;

async function openTrip(page: Page): Promise<void> {
  // Relativo a propósito: `/` sería la raíz del puerto, que está fuera de la
  // base del sitio (§3.9).
  await page.goto('./');

  // La atribución la trae el style del satélite, que es el de partida (§2.3):
  // si está, el style se ha descargado y parseado, y las capas ya se han
  // añadido. Va contra un CDN, así que tarda bastante más que el resto de la
  // página.
  await expect(page.getByRole('link', { name: /Esri/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle');
}

/**
 * Se reintenta porque las teselas siguen llegando después del `networkidle` del
 * style: con varios tests tirando a la vez de los mismos CDN, una sola medida
 * pilla el canvas a medio pintar y falla sin que haya nada roto.
 */
async function expectMapPainted(page: Page, nombre: string): Promise<void> {
  const canvas = page.locator('canvas.maplibregl-canvas');

  await expect
    .poll(async () => (await canvas.screenshot()).byteLength, {
      message: `el canvas ${nombre} parece en blanco`,
      timeout: 30_000,
    })
    .toBeGreaterThan(CANVAS_BLANK_BYTES);
}

async function shoot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-${name}.png` });
}

/** Ningún elemento se sale de la ventana ni deja la página con scroll lateral. */
async function expectNothingOverflows(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (viewport === null) return;

  // El `body` es `overflow-hidden`, así que un desbordamiento no se ve como
  // scroll de la página: hay que mirar caja por caja.
  const scroll = await page.evaluate(() => {
    const track = document.querySelector('section[aria-label="Línea de tiempo del viaje"] > div');
    return {
      // La pista sí se desplaza en horizontal a propósito (§3.5); en vertical
      // no, y si lo hiciera las etiquetas de las paradas quedarían cortadas.
      timelineOverflowY: track === null ? null : track.scrollHeight - track.clientHeight,
    };
  });
  expect(scroll.timelineOverflowY).toBe(0);

  const regions = {
    mapa: page.locator('canvas.maplibregl-canvas'),
    panel: page.getByRole('complementary', { name: 'Detalle de la parada' }),
    timeline: page.getByRole('region', { name: 'Línea de tiempo del viaje' }),
    // Tiene que seguir viéndose entera: es la condición de uso del basemap
    // activo (§2.3) y la razón de que el panel no flote sobre el mapa (§3.6).
    atribucion: page.locator('.maplibregl-ctrl-attrib-inner'),
  };

  for (const [nombre, locator] of Object.entries(regions)) {
    const box = await locator.boundingBox();
    expect(box, `${nombre} no tiene caja`).not.toBeNull();
    if (box === null) continue;

    expect(box.width, `${nombre} sin ancho`).toBeGreaterThan(0);
    expect(box.height, `${nombre} sin alto`).toBeGreaterThan(0);
    expect(box.x, `${nombre} se sale por la izquierda`).toBeGreaterThanOrEqual(-1);
    expect(box.y, `${nombre} se sale por arriba`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${nombre} se sale por la derecha`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(box.y + box.height, `${nombre} se sale por abajo`).toBeLessThanOrEqual(
      viewport.height + 1,
    );
  }
}

test.describe('layout del viaje', () => {
  test('el mapa se pinta y nada se desborda', async ({ page }, testInfo) => {
    await openTrip(page);

    await expectMapPainted(page, 'del mapa');

    await expectNothingOverflows(page);
    await shoot(page, testInfo, '01-inicial');
  });

  test('la timeline muestra el capítulo activo y navega', async ({ page }, testInfo) => {
    await openTrip(page);

    const timeline = page.getByRole('region', { name: 'Línea de tiempo del viaje' });
    const slider = timeline.getByRole('slider', { name: 'Parada actual' });

    // El capítulo activo expande sus paradas con nombre y fecha (§3.5).
    await expect(timeline.getByText('Aeropuerto de Keflavík')).toBeVisible();
    await expect(timeline.getByText('Camping de Úthlíð')).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuenow', '0');

    // Cruzar al segundo capítulo: se expande solo, sin estado aparte (§3.5).
    await page.getByRole('button', { name: /Siguiente/ }).click({ clickCount: 6 });
    await expect(slider).toHaveAttribute('aria-valuenow', '6');
    await expect(page).toHaveURL(/\?stop=seljalandsfoss$/);
    await expect(timeline.getByText('Glaciar Sólheimajökull')).toBeVisible();

    await page.waitForTimeout(FLY_SETTLE_MS);
    await expectNothingOverflows(page);
    await shoot(page, testInfo, '02-segundo-capitulo');

    // Recorte de la pista sola: es donde se ve si las etiquetas se leen y si el
    // cursor tapa la marca de la parada activa en vez de duplicarla.
    await timeline.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-04-timeline.png` });
  });
});

test.describe('tipo de mapa', () => {
  test('empieza en satélite, cambia a Positron y vuelve, sin perder las capas del viaje', async ({
    page,
  }, testInfo) => {
    // Volver a poner sources y capas sobre el style nuevo es lo que puede
    // fallar aquí (§3.8), y falla como excepción al filtrar una capa que ya no
    // existe.
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));

    await openTrip(page);
    const selector = page.getByRole('group', { name: 'Tipo de mapa' });

    // El satélite es el basemap de partida (§2.3).
    await expect(selector.getByRole('button', { name: 'Satélite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await selector.getByRole('button', { name: 'Mapa' }).click();

    // La atribución de OSM/CARTO es la señal de que el style de Positron ha
    // cargado, igual que la de Esri lo es para el satélite.
    await expect(page.getByRole('link', { name: /CARTO/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: /OpenStreetMap/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Esri/i })).toHaveCount(0);
    await expect(selector.getByRole('button', { name: 'Mapa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.waitForLoadState('networkidle');

    await expectMapPainted(page, 'de Positron');

    // Navegar después del cambio toca el filtro de la parada activa y la source
    // de la ruta recorrida: si no se hubieran vuelto a añadir, reventaría aquí.
    await page.getByRole('button', { name: /Siguiente/ }).click();
    await expect(page).toHaveURL(/\?stop=hveragerdi$/);
    await page.waitForTimeout(FLY_SETTLE_MS);

    await expectNothingOverflows(page);
    await shoot(page, testInfo, '05-positron');

    await selector.getByRole('button', { name: 'Satélite' }).click();
    await expect(page.getByRole('link', { name: /Esri/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /Siguiente/ }).click();
    await expect(page).toHaveURL(/\?stop=kerid$/);

    expect(errores, `errores en la página: ${errores.join(' | ')}`).toEqual([]);
  });
});

test.describe('hoja inferior en móvil', () => {
  test.skip(({ isMobile }) => isMobile !== true, 'solo aplica a la variante de móvil');

  test('empieza cerrada y al abrirse no tapa la timeline', async ({ page }, testInfo) => {
    await openTrip(page);

    const panel = page.getByRole('complementary', { name: 'Detalle de la parada' });
    const cuerpo = panel.locator('#stop-panel-content');

    // La cabecera y los botones se ven siempre; el cuerpo empieza plegado (§3.6).
    await expect(
      panel.getByRole('heading', { name: 'Aterrizamos y recogemos el coche' }),
    ).toBeVisible();
    await expect(panel.getByRole('button', { name: /Siguiente/ })).toBeVisible();
    await expect(cuerpo).toBeHidden();

    await panel.getByRole('button', { name: 'Ver más' }).click();
    await expect(cuerpo).toBeVisible();
    await expect(cuerpo.getByRole('img', { name: /Jeep con tienda de techo/i })).toBeVisible();

    await expectNothingOverflows(page);
    await shoot(page, testInfo, '03-hoja-abierta');
  });
});
