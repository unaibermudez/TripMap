# TripMap — Tareas pendientes

Backlog de mejoras fuera del plan de slices de [SPEC.md](SPEC.md), que ya se
completó. Aquí se anotan tareas futuras conforme surgen; al completarlas se
borran de la lista, no se dejan tachadas acumulándose.

## Pendientes

- **Dominio propio.** El sitio cuelga de
  `https://unaibermudez.github.io/TripMap/`. Al ser un project site de GitHub
  Pages vive en una subcarpeta (`base: '/TripMap'` en `astro.config.mjs`), y
  por eso `/TripMap` sin barra final redirige a `/TripMap/`: es un directorio
  con `index.html` dentro, y la barra hace que las rutas relativas del HTML
  resuelvan bien. Para tener una URL raíz sin esa subcarpeta ni redirección
  haría falta un dominio propio apuntando al repo (registro `CNAME`), quitar
  `base` de `astro.config.mjs` y actualizar `site` y los usos de `withBase`
  (§3.9 de la spec).

## Ideas a futuro: cuentas de usuario y backend

Bloque de ideas para una posible v2 que amplía el alcance actual del
proyecto a viajes creados por usuarios, no solo el viaje propio del autor.
**Choca con la decisión cerrada de CLAUDE.md** ("sitio estático, sin
backend, sin base de datos, sin auth, sin usuarios"), que además pide
explícitamente parar y preguntar antes de meter un servidor. Nada de esto
se implementa mientras esa decisión no se revise a propósito con el autor:
se deja anotado aquí como backlog, no como plan aprobado.

### Autenticación

- **Registro e inicio de sesión.** Email/contraseña, cambio y recuperación
  de contraseña, login social (Google como mínimo).
- Valorar un proveedor gestionado (Clerk, Auth0, Supabase Auth, Auth.js...)
  en vez de construirlo a mano: gestionan verificación de email, reseteo de
  contraseña, OAuth y sesiones. Clerk encaja mejor en frameworks tipo
  Next.js/Remix; en Astro el soporte es más limitado. Si el backend acaba
  siendo Supabase (BD + storage), su Auth integrado evita meter un tercer
  proveedor.

### Backend y almacenamiento

- **Backend propio.** Hace falta en cuanto hay usuarios y viajes que
  persistir: base de datos de usuarios/viajes, y una capa de API delante.
- **Cálculo de rutas en servidor.** Ojo a no mezclar dos cosas distintas:
  la ruta real por carretera (para sugerir orden de paradas, distancia,
  tiempo estimado — necesitaría un motor de rutas tipo OSRM, GraphHopper u
  OpenRouteService) frente al spline decorativo actual
  (`turf.bezierSpline`), que es una curva estética y no sigue carreteras.
  El spline seguiría teniendo sentido como capa visual encima de la
  geometría real, no tiene por qué desaparecer.
- **Almacenamiento de imágenes.** Object storage (S3 o similar) en vez de
  guardar binarios en la base de datos. Si el backend es Supabase, su
  storage integrado cubre esto sin añadir AWS como proveedor aparte.

### Editor de viajes ("momentos")

- **Pantalla principal: crear un Viaje** (nombre por decidir: Viaje, Ruta,
  Trip...). Cada viaje es una secuencia de "momentos", cada uno con fecha y
  hora, título, mensaje y fotos.
- **Editor de contenido limitado**, estilo documento pero no un Word
  completo: solo párrafos e imágenes intercalados, sin formato de texto
  libre (negrita, colores, tamaños...). En línea con la filosofía actual
  del proyecto de "nada de librerías de timeline de terceros, se construye
  a medida": mejor un editor de bloques propio y simple (array de bloques
  `{type: 'text' | 'image', ...}`) que meter un editor de terceros pesado
  (TipTap, Editor.js...).
- **Formulario interactivo previo al login.** Se construye antes que la
  autenticación: el usuario va añadiendo momentos y ve la ruta dibujarse en
  vivo en el mapa, reusando el mapa/spline que ya existe pero alimentado
  por los momentos en construcción en vez de por los datos estáticos del
  repo.

### Modo invitado y viajes de ejemplo

- **Modo invitado.** Sin cuenta, se puede crear un viaje completo guardado
  en `localStorage`. Para persistirlo de forma permanente (o verlo desde
  otro dispositivo) hace falta crear cuenta; en ese momento se migra el
  borrador de `localStorage` al backend. Falta decidir qué pasa si el
  usuario ya tiene viajes en el backend al hacer login: ¿se añade el
  borrador, se pide elegir, se descarta?
- **Viajes predeterminados sin login.** Rutas famosas (Ruta 66, Islandia,
  Dolomitas...) con fotos genéricas, visibles sin cuenta, para que un
  visitante vea la app en funcionamiento sin fricción. Estos pueden seguir
  siendo datos estáticos en el repo, como el viaje actual del autor —
  compatible con el modelo de hoy, no necesitan backend.

### Otras cosas a tener en cuenta

- **Fasing.** No todo depende del backend a la vez: el formulario
  interactivo + modo invitado (solo `localStorage`) y los viajes de ejemplo
  (datos estáticos) se pueden construir manteniendo el sitio estático tal
  cual es hoy. Lo que realmente rompe la decisión cerrada — y merece la
  conversación explícita que pide CLAUDE.md — es la parte de cuentas y
  persistencia real en backend. Se puede secuenciar para no comprometerse a
  la reescritura grande desde el principio.
- **Privacidad/RGPD.** Cuentas con email y fotos reales de viajes de
  usuarios (potencialmente con ubicación y caras) meten obligaciones que no
  existían cuando todo el contenido era del propio autor: política de
  privacidad, derecho al borrado, exportar datos, viajes públicos vs
  privados, compartir por link.
- **Moderación y cuotas.** Si cualquiera puede registrarse y subir fotos y
  texto público, hace falta pensar en moderación de contenido y límites de
  tamaño/cuota por usuario.
- **Coste.** Backend + BD + auth + storage de imágenes (y un motor de rutas
  real, si se hace) tienen coste recurrente, a diferencia del hosting
  gratuito actual en GitHub Pages. Vale la pena fijar presupuesto y
  proveedor pronto porque condiciona el stack (p. ej. Supabase como
  BD + Auth + storage en un único proveedor, frente a piezas sueltas).
