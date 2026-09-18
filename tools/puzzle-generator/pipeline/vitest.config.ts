import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pipelineRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(pipelineRoot, '..'),
  test: {
    include: ['pipeline/**/*.test.ts'],
  },
});
