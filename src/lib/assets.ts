/**
 * Prefija una ruta absoluta del sitio con la base del despliegue.
 *
 * En GitHub Pages el sitio no cuelga de la raíz del dominio sino de `/TripMap/`
 * (§3.9). Astro reescribe las rutas que ve —las de `src/` y las de sus
 * componentes—, pero las de las fotos se escriben a mano en los datos (§4) y no
 * pasan por él: sin esto, en producción todas darían 404.
 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`"${path}" no es una ruta absoluta del sitio: tiene que empezar por "/".`);
  }

  // La base llega con barra final o sin ella según cómo esté escrita en la
  // configuración, y la ruta ya trae la suya.
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
}
