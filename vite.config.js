import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages or any sub-path.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB
});
