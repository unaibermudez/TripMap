# TripMap

Sitio estático para visualizar viajes: mapa interactivo con la ruta y las
paradas, más una línea de tiempo sincronizada. Sirve para cualquier viaje que
se pueda contar como una secuencia de paradas, desde una vuelta a un país hasta
un recorrido de varios años.

**El contenido de `src/data` es una prueba con datos reales**: los tres primeros
días (29 abr a 1 may de 2026) de un viaje a Islandia, con 9 paradas y fotos
propias. El resto del viaje se irá añadiendo; mientras tanto no hay que tomarlo
como el contenido definitivo.

La especificación completa está en [docs/SPEC.md](docs/SPEC.md). Léela antes de
tocar nada. Aquí está solo lo que hace falta para trabajar en el día a día.

Las tareas futuras (fuera del plan de slices, ya completado) se anotan en
[docs/TODO.md](docs/TODO.md).

## Al terminar cada tarea

```
npm run typecheck
npm run test
```

Las dos tienen que pasar. Después, resumir brevemente lo hecho y **parar**. No
se empieza el siguiente slice hasta que el autor lo pida. **No hacer commits
salvo petición expresa.**

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build |
| `npm run test` | Vitest, una pasada |
| `npm run test:watch` | Vitest en watch |
| `npm run test:e2e` | Playwright: layout en escritorio y móvil. Reconstruye y sirve en el 4322; deja las capturas en `e2e/screenshots` |
| `npm run typecheck` | `astro check` + `tsc --noEmit` |
| `npm run roads` | Genera `src/data/generated/road-routes.json`: pide a OSRM la ruta real de los legs en coche/bus que aún no la tengan |

## Decisiones cerradas

No las cuestiones ni las cambies.

- **Sitio estático.** Sin backend, sin base de datos, sin auth, sin usuarios.
  Todo el contenido vive en el repo y se resuelve en build time. **Si te parece
  que hace falta un servidor, para y pregunta antes de seguir.**
- **Stack:** Astro con islas de React, TypeScript estricto, MapLibre GL JS,
  Turf.js, Zustand, Zod, Vitest, Playwright, Tailwind.
- **Dos basemaps: Positron (sobrio en grises, Carto) y satélite** (teselas
  raster de Esri, sin token), elegibles desde el selector del mapa. **El de
  partida es el satélite.** Mantener la atribución de OSM/CARTO cuando el
  activo sea Positron, y la de Esri cuando sea el satélite. El catálogo está en
  `src/lib/basemap.ts` y el basemap activo, en el store.
- **La ruta no se dibuja a mano.** Se genera de la secuencia de coordenadas de
  las paradas y se suaviza con `turf.bezierSpline`. El array `via` de cada leg
  existe solo para corregir tramos donde la curva quede mal (cruza el mar,
  atraviesa un país por el que no se pasó).
- **El spline se calcula por leg** (`[from, ...via, to]`) y luego se concatena,
  nunca sobre la polilínea global. Así cada parada cae exactamente sobre la
  línea y la ruta parcial es la concatenación de los primeros N legs. Ojo al
  caso de 2 puntos sin `via`, que devuelve una recta.
- **El `mode` del leg decide la geometría** (§2.9 de la spec): avión/tren/barco
  se dibujan como arco de gran círculo; coche/bus siguen carretera real si
  `npm run roads` ya la generó; el resto cae al spline de arriba. Sea cual sea
  la fuente, el primer y último punto se fuerzan siempre a la coordenada
  exacta de la parada (`snapEndpoints` en `src/lib/route.ts`).
- **Marcadores como GeoJSON source** con circle o symbol layers. **Nunca**
  `maplibregl.Marker` de DOM: con más de 100 puntos rinde mal.
- **El orden de las paradas es su posición en el fichero de datos**, no su
  fecha. El loader valida que la cadena de legs coincida con ese orden.
- **La timeline usa escala uniforme por índice**, no proporcional al tiempo.
  Las fechas son etiquetas, no posición.

## Arquitectura: la regla más importante

Existe **un único estado central** (Zustand). El mapa, la timeline y el panel
leen de él y escriben en él. **Nunca se comunican entre sí directamente ni se
sincronizan con efectos cruzados.**

Todas las formas de navegar hacen exactamente lo mismo, cambiar
`currentStopIndex`: click en un pin, click o arrastre en la timeline, flechas
del teclado, botones anterior/siguiente, parámetro de la URL.

Si te encuentras escribiendo un `useEffect` que sincroniza dos componentes,
para: la respuesta está en el store.

**Una sola isla.** Mapa, timeline y panel viven dentro de `<App client:load>`.
No crees una isla por componente.

**URL.** El estado se refleja como `?stop=<id>` (el id, nunca el índice). La
navegación discreta hace `pushState`; el arrastre del cursor hace
`replaceState` mientras dura y `pushState` al soltar, para no inundar el
historial. Un id inexistente cae al índice 0 y limpia el parámetro.

## Reglas de código

- TypeScript estricto. **Prohibido `any`.**
- Toda la lógica pura vive en `src/lib`, se testea sin DOM y tiene tests con
  Vitest: geometría de ruta, ruta parcial, índices, agrupación por capítulos,
  formateo de fechas.
- Los componentes React **solo** renderizan y disparan acciones del store.
- Componentes pequeños, con una responsabilidad clara.
- Nada de librerías de timeline de terceros. La timeline la construimos
  nosotros.
- Nada de abstracciones especulativas. Si algo se usa una sola vez, no lo
  generalices.
- Comentarios solo donde el porqué no sea evidente. Nada de comentarios que
  repitan lo que hace la línea siguiente.

## Convenciones del proyecto

- Alias de import: `@/*` → `src/*`.
- Tests junto al código que prueban: `src/lib/route.ts` → `src/lib/route.test.ts`.
- Los tests corren en entorno `node`. El que necesite DOM lo pide por fichero
  con `// @vitest-environment jsdom` en la primera línea.
- `noUncheckedIndexedAccess` está activado: indexar un array devuelve
  `T | undefined`. Trátalo, no lo silencies con `!`.
- **TypeScript está fijado en 6.x a propósito.** `astro check` se rompe con la
  7: el compilador nativo aún no expone la API que necesita. No subirlo.

## Despliegue

GitHub Pages, con el workflow de `.github/workflows/deploy.yml` en cada push a
`main`. El sitio cuelga de `/TripMap/`, **también en local**: `npm run dev` sirve
en `http://localhost:4321/TripMap/`. Las rutas absolutas que no pasan por Astro
—las fotos de los datos— hay que prefijarlas con `withBase` (§3.9).

## Fuera del alcance de la v1

Pipeline de imágenes, página de administración, contenido real, reproducción
automática, animaciones más allá del `flyTo`.
