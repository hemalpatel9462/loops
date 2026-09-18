import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const hintsRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(hintsRoot, '..'),
  test: {
    include: ['hints/**/*.test.ts'],
  },
});
