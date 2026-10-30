# TripMap — Especificación

Sitio web para narrar un viaje como una secuencia de paradas sobre un mapa.
Documento de referencia para futuras sesiones: recoge el contexto y todas las
decisiones tomadas.

> El encargo original era un viaje concreto de varios años por África. El
> proyecto se reenfocó a viajes en general, pero **la escala de aquel encargo se
> mantiene como objetivo de diseño**, porque es la que justifica buena parte de
> las decisiones de este documento (§2.5, §3.5 y §9). No es una
> descripción del contenido que hay hoy en el repo, que es una prueba de tres días.

## 1. Producto

Interfaz de dos zonas:

- **Mapa interactivo**, ocupando la mayor parte de la pantalla. Dibuja la ruta
  aproximada del viaje y marca las paradas. Al seleccionar una parada se
  muestra un panel con fotos, texto y fechas.
- **Línea de tiempo**, en la parte inferior. Permite avanzar y retroceder por
  el viaje. Está sincronizada con el mapa en ambos sentidos.

Volumen objetivo: más de 100 paradas agrupadas en capítulos (por país o por
bloque narrativo), y varios cientos de fotos. **Es la escala para la que se
diseña, no la que hay cargada**: el contenido actual son 30 paradas reales de un viaje de once días a Islandia.
Lo introduce el autor a mano en el repositorio.

## 2. Decisiones cerradas

No se cuestionan ni se cambian sin acuerdo explícito. Las secciones 2.1 a 2.5
vienen del encargo original; de la 2.6 en adelante se resolvieron durante el
diseño y se documenta el porqué.

### 2.1 Sitio estático

No hay backend, ni base de datos, ni auth, ni usuarios. Todo el contenido vive
en el repo y se resuelve en build time. **Si en algún momento parece que hace
falta un servidor, hay que parar y preguntar antes de seguir.**

### 2.2 Stack

| Pieza | Elección |
| --- | --- |
| Framework | Astro con islas de React |
| Lenguaje | TypeScript estricto |
| Mapa | MapLibre GL JS |
| Geometría | Turf.js |
| Estado | Zustand |
| Validación | Zod |
| Tests unitarios | Vitest |
| Verificación visual | Playwright |
| Estilos | Tailwind |

### 2.3 Basemap

Dos basemaps: Positron, estilo sobrio en tonos grises (Carto, o equivalente sin
token), y una vista de satélite (§3.8). Carto Positron sirve su style JSON sin
token, pero **exige mantener la atribución de OpenStreetMap y CARTO** mientras
esté activo; el satélite exige la atribución de Esri.

**El basemap de partida es el satélite.** Positron sigue disponible como
alternativa desde el selector.

### 2.4 Ruta

La ruta **no** se dibuja a mano tramo a tramo. Se genera a partir de la
secuencia de coordenadas de las paradas, suavizada con `turf.bezierSpline`.

Cada leg admite un array opcional `via` con waypoints intermedios. Se usa
**solo** para corregir los tramos donde la curva quede mal: cruza el mar,
atraviesa un país por el que no se pasó.

### 2.5 Marcadores

Se pintan como GeoJSON source con circle o symbol layers. **Nunca**
`maplibregl.Marker` de DOM: con más de 100 puntos rinde mal.

### 2.6 El spline se calcula por leg, no sobre la ruta global

Cada leg genera su propia geometría (`[from, ...via, to]` → `bezierSpline`) y
después se concatenan.

**Por qué.** Aplicar el spline a la polilínea completa de las 100+ paradas como
una sola línea tiene dos problemas: la curva resultante deja de pasar
exactamente por las paradas, y "ruta parcial hasta el índice N" pierde su punto
de corte exacto. Con el spline por leg, cada parada cae exactamente sobre la
línea, la ruta parcial es la concatenación de los primeros N legs, y un `via`
mal puesto solo estropea su tramo en vez de deformar la curva global.

**Coste aceptado.** Las uniones entre legs tienen un pequeño quiebre angular en
vez de ser suaves. A la escala de un mapa continental no se aprecia.

**Caso a tratar explícitamente.** Un leg sin `via` son 2 puntos, y
`bezierSpline` con 2 coordenadas devuelve una recta. Tiene que estar cubierto
por un test: con el fixture de 8 paradas es el caso mayoritario.

### 2.7 El orden canónico de las paradas es su posición en el fichero

`currentStopIndex` indexa el array de stops tal como está escrito en
`src/data`. **No** se reordena por `dateStart`.

**Por qué.** El autor controla el orden narrativo directamente, sin depender de
que las fechas sean exactas ni de cómo se resuelven los empates. Un viaje real
tiene idas y vueltas, solapamientos y fechas aproximadas; el orden del fichero
es explícito y editable.

**El loader valida** que exista exactamente un leg entre cada par de paradas
consecutivas, y que su `fromStopId`/`toStopId` coincidan con ese orden. Si la
cadena está rota, duplicada o desordenada, falla con un error que nombra las
paradas implicadas.

### 2.8 La timeline usa escala uniforme por índice

Cada parada ocupa el mismo ancho, independientemente de cuánto se estuvo en
ella. Las fechas aparecen como etiquetas, no como métrica de posición.

**Por qué.** Con un viaje de varios años, una escala temporal real deja huecos
enormes: tres meses en un sitio y dos días en el siguiente harían la mayoría de
paradas inclicables. La timeline es un control de navegación, no un gráfico.

### 2.9 El `mode` del leg decide cómo se dibuja el tramo

Revierte la decisión original de la v1 ("el `mode` no cambia el render"), a
petición explícita del autor. No hace falta ningún campo nuevo en los datos:
`leg.mode` ya era "cómo se llegó a esta parada"; lo que cambia es que ahora el
mapa lo lee.

Tres fuentes de geometría por leg, en este orden de prioridad (detalle técnico
en §9):

1. **Avión, tren o barco → arco de gran círculo.** Ninguno de los tres sigue
   una carretera, así que se dibujan como una curva suave entre las dos
   paradas en vez del spline decorativo.
2. **Coche o bus → carretera real**, si `npm run roads` ya generó la geometría
   para ese leg (§9). Si no la ha generado todavía, cae al punto 3.
3. **El resto → el spline decorativo de siempre** (§2.4, §2.6), sin cambios.

**Por qué el arco también en tren y barco.** Ninguno de los dos sigue una
carretera, y el motor de rutas usado (§9) solo tiene perfil de conducción: no
hay una alternativa mejor sin montar infraestructura propia.

Sea cual sea la fuente, el primer y último punto se fuerzan siempre a la
coordenada exacta de la parada (`snapEndpoints` en `src/lib/route.ts`): la
garantía de §2.6 de que cada parada cae exactamente sobre la línea no depende
de qué generó el tramo.

## 3. Arquitectura

**Esta es la regla más importante.**

Existe **un único estado central**. El mapa, la timeline y el panel de
contenido leen de él y escriben en él. Nunca se comunican entre sí
directamente ni se sincronizan con efectos cruzados.

El estado contiene como mínimo:

- `currentStopIndex`
- `currentChapterId` (derivado de `stops[currentStopIndex].chapterId`)
- estado de UI del panel

Todas las formas de navegar hacen exactamente lo mismo, cambiar
`currentStopIndex`:

- click en un pin del mapa
- click o arrastre en la timeline
- flechas del teclado
- botones de anterior y siguiente
- parámetro de la URL

### 3.1 Una isla raíz, no tres

Mapa, timeline y panel viven dentro de una única isla `<App client:load>`.

**Por qué.** Tres islas separadas sí compartirían el módulo de Zustand (mismo
grafo ESM en la misma página), pero son tres hidrataciones para lo que es una
sola app interactiva, y una fuente de fallos sutiles si alguna vez cambia la
estrategia de bundling. No cambia nada de la arquitectura de estado único.

### 3.2 La URL refleja el estado como `?stop=<id>`

Se usa el `id` de la parada, no el índice: los índices se desplazan al insertar
contenido y romperían los enlaces compartidos.

**Historial.** La navegación discreta (click en un pin, click en la timeline,
flechas, botones anterior/siguiente) hace `pushState`. El arrastre del cursor
de la timeline hace `replaceState` mientras dura, y `pushState` al soltar.

**Por qué.** Si cada cambio de `currentStopIndex` empujara al historial,
arrastrar el cursor metería decenas de entradas y el botón atrás quedaría
inservible.

**Al cargar**, si `?stop=` trae un id que no existe se cae al índice 0 y se
limpia el parámetro. Al ser un sitio estático, esto se resuelve en cliente
durante la hidratación.

### 3.3 Las acciones navegan por índice; la URL traduce

Decisiones del SLICE 3.

- **`goToStop` recibe el índice**, no el id. El índice es el estado, y tanto el
  mapa como la timeline lo tienen a mano. La traducción id ↔ índice ocurre solo
  en la capa que habla con la URL, que es la única que necesita ids (§3.2).
- **Una acción que no mueve el índice no avisa a los suscriptores.** Si lo
  hiciera, cada click en la parada ya activa metería una entrada de historial.
- **El arrastre es estado, no un argumento.** `isScrubbing`, con
  `startScrub`/`endScrub`, en vez de pasarle a `goToStop` cómo debe escribir en
  el historial. Así el mapa también podrá saltarse el `flyTo` mientras dura el
  arrastre sin que la timeline se lo tenga que contar.
- **Al soltar el cursor se restaura la URL previa antes de empujar la final.**
  Los `replaceState` del arrastre han ido pisando la entrada desde la que se
  empezó; devolvérsela y empujar encima la parada final deja el historial en
  `[donde estaba] [donde ha soltado]`, que es lo que hace útil al botón de
  atrás. Un arrastre que acaba donde empezó no deja rastro.

### 3.4 El mapa es un suscriptor del store, nunca una fuente de verdad

Decisiones del SLICE 4.

- **La instancia de MapLibre se crea una sola vez** y vive en una ref. React
  renderiza un `div` vacío; todo lo demás son llamadas imperativas desde
  efectos. Los datos que alimentan las capas (`legGeometries`, `stopsCollection`)
  se calculan una vez por viaje con `useMemo`, no por render.
- **El punto activo es una capa filtrada por `index`**, no una reescritura de la
  source de paradas. Las dos capas comparten la misma source: cambiar de parada
  es un `setFilter`, no volver a enviar 100+ features al worker.
- **El índice viaja en las propiedades del feature.** MapLibre las entrega sin
  tipar, así que se validan en `stopIndexOf` (`src/lib/mapData.ts`, con tests)
  antes de llamar a `goToStop`. Así no entra ningún `any` en el componente.
- **Solo la navegación discreta vuela.** El primer encuadre y el arrastre de la
  timeline hacen `jumpTo`; el resto, `flyTo` de 1500 ms. El componente lee
  `isScrubbing` del store de forma imperativa en el momento de mover la cámara,
  no como estado de React: un cambio de `isScrubbing` no debe repintar el mapa.
- **El `flyTo` no es `essential`**, de modo que quien tenga activado
  `prefers-reduced-motion` obtiene un salto en vez de un vuelo.
- **Encuadres del mapa (`MapControls`).** Dos botones arriba a la izquierda:
  "Parada actual" hace `flyTo` a la parada activa con zoom 9, y "Vista general"
  hace `fitBounds` de `tripBounds` (todas las paradas y todos los tramos). No
  navegan, solo mueven la cámara, así que no pasan por el store: los callbacks
  viven en `MapView`, que es quien tiene la instancia.
- **La atribución la pone el style de Positron.** No se duplica a mano: basta
  con no desactivar el control de atribución (§2.3).

### 3.5 La timeline abre un solo capítulo y colapsa el resto

Decisiones del SLICE 5, revisadas después a petición del autor: la versión
inicial repartía todos los capítulos en una pista única; con varios capítulos
largos las paradas dejaban de caber.

- **El capítulo activo se abre; los demás se colapsan a los lados.** Cada
  capítulo anterior o posterior es un botón estrecho con su título, sus fechas y
  un punto por parada (de su color si ya se ha recorrido, gris si no). El capítulo
  abierto se queda con el ancho sobrante, con cabecera y todas sus paradas
  etiquetadas. Los colapsados se encogen antes que el abierto.
- **La escala sigue siendo uniforme por índice (§2.8), dentro del capítulo
  abierto.** Cada parada mide lo mismo; las marcas se sitúan en
  `(índice local + 0.5) / paradas del capítulo`.
- **El arrastre cubre solo el capítulo abierto.** Para cambiar de capítulo están
  los capítulos colapsados, las flechas del teclado y los botones del panel;
  entonces el capítulo abierto cambia solo, porque se deriva de la parada activa
  (§3). No hay un estado de "capítulo abierto" aparte. El cursor y el
  `aria-valuemin`/`aria-valuemax` del `slider` se expresan en índices globales.
- **Un click es un arrastre de longitud cero.** El mismo `pointerdown` hace
  `startScrub` y el salto, y el `pointerup` hace `endScrub`; la capa de URL ya
  convierte eso en una única entrada de historial (§3.3). No hace falta un
  manejador de click aparte que duplique la traducción de posición a índice.
- **La navegación por teclado es un listener de `window`, y el mapa deja de
  atender las flechas** (`keyboard: false`). El canvas de MapLibre las procesa
  antes de que lleguen a `window` en cuanto tiene el foco, así que después de
  hacer click en un pin las flechas habrían desplazado el mapa en vez de cambiar
  de parada.
- **La pista de paradas es un `slider` de ARIA, y los capítulos botones.** Con
  más de 100 paradas, un botón por parada llenaría el tabulador de paradas; el
  `slider` es una sola parada de foco y las flechas ya son su interacción
  natural. Los capítulos son una docena y sí son botones.
- **El desplazamiento automático solo corrige cuando hace falta**
  (`scrollLeftFor`): si la parada activa ya está a la vista con un hueco de una
  franja a los lados, no se toca nada. Centrar en cada cambio movería la pista
  bajo el dedo durante el arrastre.
- **Las fechas se parten a mano en `src/lib/dates.ts`.** Son días de calendario:
  pasarlas por `Date` las interpreta como medianoche UTC y las muestra corridas
  un día en cualquier huso al oeste de Greenwich.

### 3.6 El panel es el mismo marcado en escritorio y en móvil

Decisiones del SLICE 6.

- **Panel lateral y hoja inferior son el mismo componente**, con variantes `md:`
  de Tailwind. No hay media query en JavaScript: consultarla en el cliente
  obligaría a un primer render sin saber el ancho y a arrastrar un listener de
  `resize`, y la diferencia entre los dos modos es puramente de disposición.
- **El panel no flota sobre el mapa: ocupa su sitio en el flujo.** En móvil se
  apila entre el mapa y la timeline, y el mapa se encoge. Una hoja superpuesta
  taparía la atribución de OSM y CARTO, que va abajo a la derecha del mapa y
  tiene que seguir viéndose (§2.3). MapLibre observa el tamaño de su contenedor,
  así que el cambio de alto no necesita ningún `resize` a mano.
- **La hoja empieza cerrada y su estado vive en el store**, que es donde se
  guarda el estado de UI del panel (§3). En un móvil lo primero que hay que ver
  es el mapa; la cabecera con el título y las fechas queda siempre visible y el
  botón despliega el resto. En escritorio nadie mira ese estado.
- **Los botones de anterior y siguiente están fuera de la parte plegable.** Se
  puede recorrer el viaje con la hoja cerrada, sin perder el mapa de vista.
- **El markdown se resuelve en `src/lib/markdown.ts` y se pinta como elementos
  de React**, nunca con HTML inyectado. Es un subconjunto deliberado —párrafos,
  negrita, cursiva y enlaces— en vez de una dependencia de markdown: es lo que
  necesita el cuerpo de una parada, es lógica pura y se testea sin DOM (§5). Lo
  que no reconoce se queda literal.
- **La llegada a la parada se saca del leg anterior** (`arrivalLeg`), que es el
  que termina en ella según el orden canónico (§2.7). La primera parada no tiene
  llegada.

### 3.7 La verificación visual va contra el build, en su propio puerto

Decisiones del SLICE 7.

- **El servidor de e2e usa el puerto 4322 y siempre reconstruye**
  (`reuseExistingServer: false`). Con el 4321 por defecto, Playwright encontraba
  el `astro dev` que el autor ya tenía abierto, lo reutilizaba y verificaba ese:
  las capturas salían con la barra de herramientas de Astro tapando la timeline
  y el build de producción no llegaba a ejecutarse nunca.
- **Chromium se lanza con `--enable-unsafe-swiftshader`.** Sin GPU, Chrome cae
  en SwiftShader, pero desde la 125 lo considera inseguro y no llega a crear el
  contexto: MapLibre no pinta nada y el mapa sale en blanco sin ningún error.
  Es el riesgo conocido del slice, y este flag es lo que lo evita.
- **El mapa en blanco se detecta por el peso del PNG del canvas.** Un color
  plano se comprime a unos cientos de bytes y el mapa pintado pasa de cien mil,
  así que el umbral separa los dos casos sin decodificar la imagen ni depender
  de `preserveDrawingBuffer`, que MapLibre no activa.
- **La atribución es la señal de que el style ha cargado.** Aparece cuando
  Positron se ha descargado y parseado, o sea cuando las capas ya están puestas.
  Además se comprueba que su caja quede dentro de la ventana, que es la
  condición de uso del basemap (§2.3) y la razón de que el panel no flote
  (§3.6).
- **El desbordamiento se mide caja por caja, no por el scroll de la página.** El
  `body` es `overflow-hidden`: ahí `scrollWidth` nunca delata nada.

**Lo que encontró la revisión de capturas.** El cursor de la timeline dibujaba
su tirador justo encima de la marca de la parada activa, y las dos se solapaban
como un muñeco de nieve. Ahora el tirador es concéntrico con la marca y algo
mayor, de modo que la tapa en vez de duplicarla.

### 3.8 El tipo de mapa es otro trozo del estado central

- **`basemapId` vive en el store**, como el índice de parada. El selector solo
  dispara `setBasemap`; el mapa es quien reacciona (§3). Repetir el basemap
  activo no avisa a los suscriptores, igual que `goToStop` con el índice ya
  puesto (§3.3): recargaría el style entero para nada.
- **Cambiar de basemap es `setStyle` con `diff: false`.** Con el diff por
  defecto MapLibre intenta parchear el style anterior: no dispara `style.load`
  y deja las capas del viaje colgando de sources que ya no existen.
- **Las capas del viaje se añaden en `style.load`, no en `load`.** `style.load`
  salta con el primer style y con cada uno posterior, así que el mismo código
  sirve para montar el mapa y para reponerlo tras el cambio. Lee el índice
  activo del store en ese momento: el style tarda en descargarse y mientras
  tanto se puede haber navegado.
- **Los listeners de las capas se registran una sola vez**, fuera de ese
  manejador. Van por id de capa, no por instancia, así que sobreviven al cambio
  de style; registrarlos dentro los iría duplicando.
- **El satélite son teselas raster de Esri**, sin token, con la capa de
  referencia encima para los topónimos y las fronteras, que la foto sola no
  trae. Al ser raster no hace falta ni glyphs ni sprite, y la atribución de Esri
  va en cada source: es su condición de uso, igual que la de CARTO (§2.3). Ojo
  al orden `{z}/{y}/{x}` de la URL, que es el de ArcGIS y no el habitual.
- **Cada basemap trae los colores de la ruta.** El gris de Positron desaparece
  sobre la foto aérea, y el blanco se confunde con las fronteras y las costas
  que dibuja la capa de referencia de Esri: en satélite la ruta pendiente es
  violeta y la recorrida ámbar.
- **El selector va arriba a la derecha del mapa.** Abajo a la derecha está la
  atribución, que tiene que verse entera (§2.3, §3.6).

### 3.9 El sitio cuelga de `/TripMap/`, también en local

Decisiones del despliegue en GitHub Pages.

- **`base` está puesta siempre, no solo en el build de CI.** Pages sirve el
  sitio en `https://unaibermudez.github.io/TripMap/`, así que el build necesita
  ese prefijo. Ponerlo solo en CI dejaría el único entorno que se parece a
  producción sin verificar nunca: el desarrollo y los tests seguirían en la raíz
  y un enlace roto solo aparecería una vez publicado. El precio es que
  `npm run dev` sirve en `/TripMap/` y que Playwright navega con rutas
  relativas.
- **Las rutas de las fotos pasan por `withBase`.** Astro reescribe las rutas que
  ve, pero las de las fotos las escribe el autor a mano en los datos (§4) y no
  pasan por él. Sin el prefijo, en producción darían 404 y el resto del sitio
  funcionaría, que es la peor manera de romperse.
- **CI ejecuta `typecheck` y los tests antes de construir.** Son las dos
  condiciones de tarea terminada del proyecto; si no pasan, no se publica.
- **Playwright no va en CI.** Necesita navegador y descarga el basemap de un CDN
  en cada pasada: es verificación visual para cuando se toca el layout, no una
  puerta de despliegue.

## 4. Modelo de datos

Tres entidades más `Photo`. Definidas con Zod y validadas al cargar.

### Stop

```
id, name, country (ISO2), coords [lng, lat], dateStart,
dateEnd (opcional), chapterId, title, body (markdown), photos[]
```

`country` no se usa en ninguna parte de la v1; se guarda como dato y se valida
como dos letras mayúsculas.

### Photo

```
src, caption (opcional), date (opcional), width, height
```

`width` y `height` son obligatorios para reservar espacio y evitar layout
shift. Sin pipeline de imágenes (fuera del alcance de la v1) hay que
escribirlos a mano.

### Leg

```
fromStopId, toStopId,
mode ("bus" | "train" | "car" | "boat" | "plane" | "foot"),
via (array de coordenadas, por defecto vacío)
```

### Chapter

```
id, title, subtitle (opcional), dateStart, dateEnd, color
```

### Qué valida el loader

Además de los esquemas de cada entidad:

- Ids únicos en stops, chapters y legs.
- El `chapterId` de cada stop existe.
- Todo chapter tiene al menos un stop.
- Las paradas de un mismo capítulo son **contiguas** en el array: un capítulo
  no puede abrirse, cerrarse y volver a abrirse, porque la timeline lo
  representa como una banda continua.
- La cadena de legs es coherente con el orden de las paradas (§2.7).
- `dateStart <= dateEnd` donde ambas existan.

**No valida** que las fechas de las paradas caigan dentro del rango de fechas
de su capítulo. Las fechas de capítulo son editoriales y las de las paradas
factuales; forzar que encajen estorbaría al introducir contenido real sin
detectar ningún error de verdad.

## 5. Reglas de código

- TypeScript estricto. **Prohibido `any`.**
- Toda la lógica pura vive en `src/lib`, es testeable sin DOM y tiene tests con
  Vitest: cálculo de geometría de ruta, ruta parcial, índices, agrupación por
  capítulos, formateo de fechas.
- Los componentes React **solo** renderizan y disparan acciones del store.
- Componentes pequeños y con una responsabilidad clara.
- Nada de librerías de timeline de terceros. La timeline la construimos
  nosotros.
- Nada de abstracciones especulativas. Si algo se usa una sola vez, no se
  generaliza.
- Comentarios solo donde el porqué no sea evidente. Nada de comentarios que
  repitan lo que hace la línea siguiente.

## 6. Configuración del toolchain

Decisiones tomadas en el SLICE 0.

- **Scaffold manual** en vez de `create-astro`: el asistente interactivo no
  puede ejecutarse sin stdin en este entorno.
- **Tailwind v4 vía `@tailwindcss/vite`**, no `@astrojs/tailwind`, que está
  deprecada.
- **Submódulos sueltos de Turf** (`@turf/bezier-spline`, `@turf/bbox`,
  `@turf/helpers`) en vez del bundle `@turf/turf`, que arrastra todo el
  paquete.
- **`noUncheckedIndexedAccess` activado**, además de `astro/tsconfigs/strict`.
  El proyecto vive de indexar arrays por `currentStopIndex`.
- **TypeScript fijado en 6.x.** `astro check` no funciona con TypeScript 7: el
  compilador nativo todavía no expone la API programática de la que depende
  (ver [withastro/roadmap#1321](https://github.com/withastro/roadmap/discussions/1321)).
  No subir a 7 hasta que Astro lo soporte.
- **Alias `@/*` → `./src/*`**, sin `baseUrl`, que está deprecado desde TS 6.
- **Vitest en entorno `node` por defecto.** Los tests que necesiten DOM lo
  piden por fichero con `// @vitest-environment jsdom`. `environmentMatchGlobs`
  se eliminó en Vitest 4.
- **El repositorio se inicializó al final**, con el historial partido por
  slices en vez de un único commit inicial.
- **La URL del worker de MapLibre se le pasa a mano** con `setWorkerUrl` y un
  import `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url`. MapLibre 6 la
  resuelve con `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, que una
  vez empaquetado apunta al directorio del bundle (`.vite/deps` en desarrollo,
  `_astro` en el build), donde ese fichero no está. Sin worker no se procesa
  ningún tile y **el mapa sale en blanco sin ningún error en consola**, solo un
  404. Con `?worker&url` lo empaqueta Vite y la URL es correcta en los dos
  modos.

## 7. Plan de slices

Un slice por vez. Al terminar cada uno: ejecutar typecheck y tests, resumir y
**parar**. No se empieza el siguiente hasta que el autor lo diga. No se hacen
commits salvo petición expresa.

- **SLICE 0 — Preparación.** Scaffold, dependencias, `docs/SPEC.md`,
  `CLAUDE.md`, Vitest y scripts de npm. ✅
- **SLICE 1 — Datos.** Esquemas Zod en `src/lib/schema.ts`. Loader que lee
  `src/data`, valida (§4) y falla con error claro. Fixture de 8 paradas
  plausibles en 2 capítulos, con sus legs y fotos apuntando a placeholders
  locales. Tests del loader, incluyendo datos inválidos. ✅
- **SLICE 2 — Geometría.** `src/lib/route.ts`, sin React. GeoJSON LineString de
  la ruta completa, con el spline por leg de §2.6; ruta parcial hasta un
  índice; bounding box de un capítulo. Tests de las tres. ✅
- **SLICE 3 — Store.** Zustand con `currentStopIndex`, capítulo derivado y las
  acciones `next`, `prev`, `goToStop`, `goToChapter`. Sincronización
  bidireccional con `?stop=<id>` según §3.2, incluyendo el botón de atrás.
  Tests de las transiciones y de los límites. ✅
- **SLICE 4 — Mapa.** Componente de React con MapLibre. Capa de ruta completa
  en gris tenue; capa de ruta recorrida en color por encima; capa de paradas
  como GeoJSON source con el punto activo diferenciado. Click en un punto
  cambia `currentStopIndex`. Al cambiar, `flyTo` de ~1500 ms. Limpieza de
  listeners y de la instancia al desmontar. ✅
- **SLICE 5 — Timeline.** Dos niveles: banda de capítulos siempre visible, con
  las paradas del capítulo activo expandidas dentro. Escala uniforme por índice
  (§2.8). Cursor arrastrable. Click en parada o capítulo navega. Scroll
  automático. Flechas del teclado. ✅
- **SLICE 6 — Panel.** Título, fechas, cuerpo en markdown y galería de la
  parada activa. Botones anterior y siguiente. Panel lateral en escritorio,
  hoja inferior desplegable en móvil. ✅
- **SLICE 7 — Verificación visual.** Configurar Playwright. Capturas en
  escritorio y móvil, revisarlas e iterar hasta que el layout sea correcto en
  ambos: nada desbordado, timeline legible, punto activo visible. Riesgo
  conocido: WebGL en headless puede capturar el mapa en blanco. ✅
- **SLICE 8 — Tipo de mapa.** `basemapId` en el store, catálogo de basemaps en
  `src/lib/basemap.ts` con Positron y satélite, selector sobre el mapa y
  reposición de las capas del viaje al cambiar de style (§3.8). ✅
- **SLICE 9 — Repositorio y despliegue.** `git init`, README, `base` del sitio y
  workflow de GitHub Actions que publica en Pages (§3.9). ✅

## 8. Fuera del alcance de la v1

- Pipeline de procesado de imágenes
- Página de administración para capturar puntos
- Contenido real
- Modo de reproducción automática
- Animaciones y transiciones más allá del `flyTo`

El deploy estaba aquí y salió del cajón en el SLICE 9 (§3.9); el cálculo de
rutas reales por carretera, en el §9.

## 9. Pipeline de rutas por carretera

Herramienta de autor, no parte del sitio ni del build de Astro: se ejecuta a
mano con `npm run roads` cada vez que se añaden legs por carretera nuevos.
Resuelve la parte de "ruta real por carretera" que `docs/TODO.md` tenía
anotada como idea de backend — no hace falta backend: basta con precalcular
una vez y comitear el resultado.

- **`scripts/generate-road-routes.ts`**, no una llamada en vivo desde el
  sitio desplegado. Lee `stops`/`legs` de `src/data` por ruta relativa (no
  puede usar el alias `@/`: fuera de Vite, Node no lo resuelve), pide a OSRM
  la ruta de cada leg en coche o bus que todavía no tenga entrada, y escribe
  el resultado en `src/data/generated/road-routes.json`, que sí se comitea
  (igual que las fotos procesadas en `public/photos/`).
- **OSRM público (`router.project-osrm.org`), sin registro ni clave.** El
  repo no tiene hoy ningún mecanismo de secretos (`.env`, `secrets` en el
  workflow de CI), y añadirlo solo para esto no compensaba. Su aviso de "no
  usar en producción" no aplica: nunca lo llama el sitio desplegado, solo el
  script en local. Limitación real: solo ofrece perfil de conducción, lo que
  fija la decisión de tren/barco → arco en vez de ruta real (§2.9).
- **Incremental.** Si el leg ya tiene entrada en el JSON, no repite la
  llamada — importante para no agotar el límite de peticiones del servidor
  de demo al volver a ejecutar el script tras añadir una sola parada nueva.
- **`snapEndpoints` fuerza los extremos** a la coordenada exacta de la parada
  antes de guardar: OSRM devuelve el punto "enganchado" a la carretera más
  cercana, no el pedido. La misma función (misma lógica, duplicada a
  propósito para que el script no dependa de `src/lib`) se aplica también en
  `src/lib/route.ts` sobre el resultado ya leído, así que la garantía no
  depende de que el JSON esté bien generado.
- **Falla alto.** Si OSRM no encuentra ruta o la petición falla, el script
  para con un error que nombra el leg, sin escribir una entrada a medias ni
  caer a ningún fallback silencioso.
- **Coste conocido.** El JSON generado se importa como módulo (no se sirve
  como asset aparte), así que su contenido se empaqueta dentro del JS de la
  app: con los 7 legs de prueba de Islandia ya añade unos 760&nbsp;KB y deja
  el bundle principal por encima de 1&nbsp;MB. Aceptable con el volumen
  actual; si con el contenido real (100+ paradas) se vuelve un problema, la
  vía natural es mover el JSON a `public/` y pedirlo con `fetch` en cliente
  en vez de importarlo, a costa de que `legGeometries` deje de ser síncrona.
