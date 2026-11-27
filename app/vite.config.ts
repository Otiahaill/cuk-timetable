import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const dataDir = path.join(repoRoot, 'data');

/**
 * The timetable data lives at /data in the repository root (per AGENTS.md §3.1)
 * but Vite only copies `app/public/` into the build output. This plugin:
 *  - dev:  serves /data/* straight from the repo root
 *  - build: copies /data into dist/data so the deployed app can fetch it
 */
function timetableDataPlugin(): Plugin {
  return {
    name: 'cuk-timetable-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const match = url.match(/(?:^|\/)data\/([^/]+)$/);
        if (!match) return next();

        const filePath = path.join(dataDir, match[1]);
        if (!existsSync(filePath)) return next();

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(filePath));
      });
    },
    closeBundle() {
      const outDir = path.join(here, 'dist', 'data');
      if (!existsSync(dataDir)) {
        this.warn('No /data directory found — timetable data will not be deployed');
        return;
      }
      mkdirSync(outDir, { recursive: true });
      cpSync(dataDir, outDir, { recursive: true });
      this.info(`Copied timetable data to ${path.relative(repoRoot, outDir)}`);
    },
  };
}

// GitHub Pages serves the app from /<repo-name>/, Cloudflare from /
const base = process.env.GITHUB_PAGES ? '/cuk-timetable/' : '/';

export default defineConfig({
  base,
  plugins: [preact(), timetableDataPlugin()],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    host: true,
  },
});
