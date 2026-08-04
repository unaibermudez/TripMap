import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages sirve el sitio en https://unaibermudez.github.io/TripMap/, no en
// la raíz del dominio: sin `base` los assets del build apuntarían a `/` y darían
// 404 (§3.9). Se deja puesta también en local para que `dev`, `preview` y los
// tests de Playwright vean exactamente las mismas URLs que producción.
export default defineConfig({
  site: 'https://unaibermudez.github.io',
  base: '/TripMap',

  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
