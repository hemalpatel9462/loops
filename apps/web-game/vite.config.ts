import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(appRoot, '../..');

export default defineConfig({
  root: appRoot,
  plugins: [react()],
  resolve: {
    // Resolve only shared runtime packages for the browser app. Development
    // tools and test workspaces are intentionally outside this alias.
    alias: {
      '@loops': resolve(repositoryRoot, 'packages'),
    },
  },
  build: {
    // Keep the deployable artifact next to the web app so Vercel can publish
    // apps/web-game/dist from the repository-root project configuration.
    outDir: resolve(appRoot, 'dist'),
    emptyOutDir: true,
  },
});
