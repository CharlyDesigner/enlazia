import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import {
  chatRequest,
  createConnectionInput,
  proxyRequest,
  updateConnectionInput,
  type ChatStreamEvent,
  type Meta,
} from '@enlazia/shared';
import { Hono, type MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { streamSSE } from 'hono/streaming';
import { ZodError } from 'zod';
import { createAuth } from './auth.js';
import type { Config } from './config.js';
import type { Store } from './db.js';
import { HttpError } from './errors.js';
import { UpstreamError } from './http.js';
import type { Registry } from './registry.js';
import { ConnectionService } from './services.js';

export type AppDeps = { config: Config; store: Store; registry: Registry };

export function createApp({ config, store, registry }: AppDeps) {
  const app = new Hono();
  const service = new ConnectionService(store, registry, config);
  const auth = createAuth(config);

  const denyInDemo: MiddlewareHandler = async (c, next) => {
    if (config.demo) throw new HttpError(403, 'Disabled in the public demo. Install Enlazia to use this feature.');
    await next();
  };

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }),
  );

  app.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ error: error.message, details: error.details }, error.status);
    if (error instanceof ZodError) return c.json({ error: 'Invalid request', details: error.issues }, 400);
    if (error instanceof UpstreamError) {
      return c.json({ error: error.message, details: { upstreamStatus: error.status } }, 502);
    }
    if (error instanceof SyntaxError) return c.json({ error: 'Invalid JSON body' }, 400);
    console.error('[enlazia]', error);
    return c.json({ error: 'Internal server error' }, 500);
  });

  const api = new Hono();

  // Public routes
  api.get('/health', (c) => c.json({ ok: true }));
  api.get('/meta', (c) =>
    c.json<Meta>({
      name: 'Enlazia',
      version: config.version,
      demo: config.demo,
      authRequired: Boolean(config.password),
      authenticated: auth.isAuthenticated(c),
      connectorsLoaded: registry.list().length,
    }),
  );
  api.post('/auth/login', auth.login);
  api.post('/auth/logout', auth.logout);
  api.get('/connectors', (c) => c.json(registry.list()));

  // Everything below requires a session when a password is configured
  api.use('*', auth.requireAuth);

  api.get('/connectors/errors', (c) =>
    c.json(registry.errors.map((e) => ({ file: path.relative(config.rootDir, e.file), message: e.message }))),
  );

  api.get('/connections', (c) => c.json(service.list()));
  api.get('/connections/:id', (c) => c.json(service.get(c.req.param('id'))));
  api.post('/connections', denyInDemo, async (c) => {
    const input = createConnectionInput.parse(await c.req.json());
    return c.json(service.create(input), 201);
  });
  api.patch('/connections/:id', denyInDemo, async (c) => {
    const input = updateConnectionInput.parse(await c.req.json());
    return c.json(service.update(c.req.param('id'), input));
  });
  api.delete('/connections/:id', denyInDemo, (c) => {
    service.delete(c.req.param('id'));
    return c.body(null, 204);
  });
  api.post('/connections/:id/test', denyInDemo, async (c) => c.json(await service.test(c.req.param('id'))));
  api.get('/connections/:id/models', denyInDemo, async (c) => c.json(await service.listModels(c.req.param('id'))));
  api.post('/connections/:id/request', denyInDemo, async (c) => {
    const input = proxyRequest.parse(await c.req.json());
    return c.json(await service.proxy(c.req.param('id'), input));
  });

  api.post('/ai/chat', denyInDemo, async (c) => {
    const input = chatRequest.parse(await c.req.json());
    // Hint proxies (Apache/Nginx) not to buffer the stream.
    c.header('X-Accel-Buffering', 'no');
    c.header('Cache-Control', 'no-cache, no-transform');

    return streamSSE(c, async (stream) => {
      const controller = new AbortController();
      stream.onAbort(() => controller.abort());
      const emit = (event: ChatStreamEvent) => stream.writeSSE({ data: JSON.stringify(event) });
      const started = performance.now();
      try {
        await service.chat(input, (text) => void emit({ type: 'delta', text }), controller.signal);
        await emit({ type: 'done', durationMs: Math.round(performance.now() - started) });
      } catch (error) {
        await emit({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    });
  });

  api.get('/logs', (c) => c.json(store.listLogs(Math.min(Number(c.req.query('limit')) || 100, 500))));
  api.get('/stats', (c) => c.json(store.stats()));

  api.all('*', (c) => c.json({ error: 'Not found' }, 404));
  app.route('/api', api);

  // Web UI (single-page app)
  const indexFile = path.join(config.webDir, 'index.html');
  if (existsSync(indexFile)) {
    const indexHtml = readFileSync(indexFile, 'utf8');
    app.use(
      '/*',
      serveStatic({
        root: path.relative(process.cwd(), config.webDir) || '.',
        onFound: (filePath, c) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
            c.header('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('*', (c) => c.html(indexHtml));
  } else {
    app.get('/', (c) => c.text('Enlazia API is running. Build the web UI with `pnpm build`.'));
  }

  return app;
}
