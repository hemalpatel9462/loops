import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const modelRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(modelRoot, '..'),
  test: {
    include: ['model/**/*.test.ts', 'state/**/*.test.ts'],
  },
});
