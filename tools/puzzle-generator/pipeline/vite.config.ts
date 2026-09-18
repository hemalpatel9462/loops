import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const pipelineRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@loops/puzzle-format': resolve(pipelineRoot, '../../../packages/puzzle-format/src/index.ts'),
      '@loops/puzzle-validator': resolve(pipelineRoot, '../../puzzle-validator/src/index.ts'),
    },
  },
});
