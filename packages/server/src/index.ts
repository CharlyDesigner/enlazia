import { existsSync } from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { findRoot, loadConfig } from './config.js';
import { openStore } from './db.js';
import { loadRegistry } from './registry.js';

const envFile = path.join(process.env.ENLAZIA_ROOT ?? findRoot(process.cwd()), '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = loadConfig();
const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(config.host);

if (!config.password && !config.demo && (config.behindPassenger || !isLoopback)) {
  console.error(
    '[enlazia] Refusing to start: this instance is reachable from the network without ENLAZIA_PASSWORD.\n' +
      '          Set ENLAZIA_PASSWORD, or ENLAZIA_DEMO=true for a read-only public demo.',
  );
  process.exit(1);
}

const store = openStore(path.join(config.dataDir, 'enlazia.db'));
const registry = loadRegistry(config.connectorDirs);
for (const error of registry.errors) {
  console.warn(`[enlazia] Skipped connector ${path.relative(config.rootDir, error.file)}: ${error.message}`);
}

const app = createApp({ config, store, registry });
const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(
    `[enlazia] v${config.version} · ${registry.list().length} connectors · http://${config.host}:${info.port}` +
      (config.demo ? ' · demo mode' : ''),
  );
});

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
