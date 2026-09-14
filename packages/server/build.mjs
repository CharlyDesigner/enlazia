// Bundles the server into a single CommonJS file so it runs on cPanel/Passenger
// without installing node_modules on the host.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const rootPkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/server.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: true,
  legalComments: 'external',
  define: { __ENLAZIA_VERSION__: JSON.stringify(rootPkg.version) },
  logLevel: 'info',
});
