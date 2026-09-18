import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { defineConfig } from 'vitest/config';

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: packageRoot,
  test: {
    include: ['solver/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
