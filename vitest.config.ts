/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Los tests que necesiten DOM lo piden por fichero con `// @vitest-environment jsdom`.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
});
