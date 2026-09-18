import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(repositoryRoot, 'apps/web-game'),
  plugins: [react()],
  resolve: {
    // Workspace packages are resolved from source during development and from
    // their package exports once they are built. This keeps the browser app
    // independent of generator-only tools.
    alias: {
      '@loops': resolve(repositoryRoot, 'packages'),
    },
  },
  build: {
    outDir: resolve(repositoryRoot, 'apps/web-game/dist'),
    emptyOutDir: true,
  },
});
