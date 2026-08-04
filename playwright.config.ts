import { defineConfig, devices } from '@playwright/test';

// No es el 4321 de `astro dev` a propósito: si el autor tiene el servidor de
// desarrollo abierto, Playwright lo reutilizaría y acabaría verificando ese, con
// su barra de herramientas encima de la timeline y sin pasar por el build.
const PORT = 4322;

// El sitio cuelga de `/TripMap/`, no de la raíz (§3.9). Con la barra final, los
// `goto('./')` de los tests caen dentro de la base en vez de saltar a la raíz.
const BASE = '/TripMap/';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.output',
  fullyParallel: true,
  reporter: [['list']],
  // El basemap se descarga de un CDN en cada test, y eso no cabe en los 30 s
  // por defecto cuando la red va lenta.
  timeout: 60_000,

  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    launchOptions: {
      // Headless no tiene GPU. Chromium cae en SwiftShader, pero desde la 125
      // lo considera inseguro y deja el contexto WebGL sin crear: MapLibre no
      // pinta nada y el mapa sale en blanco sin ningún error (§7, riesgo
      // conocido del slice).
      args: ['--enable-unsafe-swiftshader'],
    },
  },

  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    // Se verifica el build de producción, que es donde la URL del worker de
    // MapLibre se resuelve distinto que en desarrollo (§6).
    command: `npm run build && npm run preview -- --port ${PORT}`,
    // Con la base puesta, la raíz del puerto responde 404 y Playwright no lo
    // daría por levantado.
    url: `http://localhost:${PORT}${BASE}`,
    // Siempre se reconstruye: reutilizar un servidor levantado antes verificaría
    // un build viejo, que es justo lo contrario de lo que busca este slice.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
