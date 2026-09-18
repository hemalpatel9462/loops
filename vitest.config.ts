import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: repositoryRoot,
  resolve: {
    alias: {
      '@loops/puzzle-format': fileURLToPath(
        new URL('./packages/puzzle-format/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'apps/web-game/src/**/*.test.ts'],
    passWithNoTests: false,
  },
});
