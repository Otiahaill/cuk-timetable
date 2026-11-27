import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// GitHub Pages serves from /<repo-name>/
const base = process.env.GITHUB_PAGES ? '/cuk-timetable/' : '/';

export default defineConfig({
  plugins: [preact()],
  base,
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
