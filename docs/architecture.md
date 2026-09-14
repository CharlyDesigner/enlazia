# Architecture

This document describes how Enlazia is built. For connector manifests, see [connectors.md](connectors.md).

## Overview

```
┌────────────────────────┐         ┌──────────────────────────────────────┐         ┌──────────────────────┐
│ Browser                │  HTTPS  │ Enlazia server (Node >= 22.13)       │  HTTPS  │ Providers / APIs     │
│                        │         │                                      │         │                      │
│ React 19 SPA           │ ──────► │ Hono app                             │ ──────► │ OpenAI-compatible    │
│ (apps/web/dist)        │  /api   │  ├─ auth (signed cookie)             │         │ Anthropic            │
│                        │         │  ├─ ConnectionService                │         │ Gemini               │
│ never sees secrets     │ ◄────── │  │   ├─ adapters (ai-*)              │ ◄────── │ REST APIs            │
│                        │ JSON /  │  │   └─ http.send (auth injection)   │  JSON / │                      │
│                        │ SSE     │  ├─ Registry (connector manifests)   │  SSE    │                      │
│                        │         │  ├─ Vault (AES-256-GCM)              │         │                      │
│                        │         │  └─ Store (node:sqlite)              │         │                      │
└────────────────────────┘         └──────────────┬───────────────────────┘         └──────────────────────┘
                                                  │
                                   ┌──────────────┴───────────────┐
                                   │ ENLAZIA_DATA_DIR             │
                                   │  ├─ enlazia.db               │
                                   │  ├─ .master-key (if no env)  │
                                   │  └─ connectors/*.json        │
                                   └──────────────────────────────┘
```

A single Node process serves both the JSON/SSE API under `/api` and the built single-page app. In development, Vite serves the UI on `:5173` and proxies `/api` to the server on `:8787`.

## Packages

| Package | Path | Role |
| --- | --- | --- |
| `@enlazia/shared` | `packages/shared` | zod schemas and TypeScript types shared by server and UI: connector manifest (`manifest.ts`), API inputs and outputs (`api.ts`). Its `build`/`schema` script generates `schemas/connector.schema.json`. Consumed as TypeScript source (no build step). |
| `@enlazia/server` | `packages/server` | Hono API. `build.mjs` bundles `src/index.ts` and all dependencies with esbuild into `dist/server.cjs` (CommonJS, `node22` target), so production needs no `node_modules`. |
| `@enlazia/web` | `apps/web` | React 19 + Vite 8 + Tailwind CSS 4 UI, routed with `wouter`. Strings live in `src/i18n.tsx` (es and en), and theme handling in `src/theme.tsx`. |
| root | `app.cjs` | `require('./packages/server/dist/server.cjs')`. Entry point for `pnpm start` and Passenger. |

### Server modules (`packages/server/src`)

| File | Responsibility |
| --- | --- |
| `index.ts` | Loads `.env`, builds config, enforces the startup safety check, opens the store, loads the registry, starts `@hono/node-server`, handles SIGTERM/SIGINT. |
| `config.ts` | Reads env vars, finds the project root (the first ancestor containing `connectors/`), loads or generates the master key, derives the session secret. Also honors `ENLAZIA_ROOT` and `ENLAZIA_WEB_DIR`. |
| `app.ts` | Routes, security headers, error mapping, demo guard, SSE chat endpoint, static file serving with SPA fallback. |
| `auth.ts` | Password login, signed session cookie, rate limiting, `requireAuth` middleware. |
| `services.ts` | `ConnectionService`: CRUD, secret splitting, test, model listing, chat, REST proxy, logging. |
| `registry.ts` | Loads and validates connector manifests from disk, checks field references. |
| `http.ts` | Base URL templating, request building, auth injection, URL redaction, `send()` with timeouts and `UpstreamError`. |
| `adapters/` | Protocol adapters for AI kinds (`openai.ts`, `anthropic.ts`, `gemini.ts`), the interface (`types.ts`) and the kind-to-adapter map (`index.ts`). |
| `sse.ts` | Streaming `text/event-stream` parser used to read provider streams. |
| `vault.ts` | AES-256-GCM encryption of JSON values. |
| `db.ts` | SQLite schema and queries (`node:sqlite`). |
| `errors.ts` | `HttpError`, for errors that are safe to show to clients. |

## HTTP API

| Method and path | Auth | Demo | Purpose |
| --- | --- | --- | --- |
| `GET /api/health` | public | allowed | Liveness check |
| `GET /api/meta` | public | allowed | Version, demo flag, auth state, connector count |
| `POST /api/auth/login` / `logout` | public | allowed | Session management |
| `GET /api/connectors` | public | allowed | Connector catalog |
| `GET /api/connectors/errors` | session | allowed | Manifests that failed to load |
| `GET /api/connections`, `GET /api/connections/:id` | session | allowed | List or read connections (no secrets) |
| `POST /api/connections`, `PATCH /api/connections/:id`, `DELETE /api/connections/:id` | session | **403** | Manage connections |
| `POST /api/connections/:id/test` | session | **403** | Test a connection |
| `GET /api/connections/:id/models` | session | **403** | List models |
| `POST /api/connections/:id/request` | session | **403** | REST proxy |
| `POST /api/ai/chat` | session | **403** | Streaming chat (SSE) |
| `GET /api/logs?limit=` | session | allowed | Last requests (max 500) |
| `GET /api/stats` | session | allowed | Connections, calls and errors in the last 24 hours |

"session" means a valid cookie is required only when `ENLAZIA_PASSWORD` is set.

Error mapping: `HttpError` returns its own status. `ZodError` returns `400 Invalid request` with issues, `UpstreamError` returns `502` with `details.upstreamStatus`, invalid JSON returns `400`, and anything else returns a generic `500` (details are only logged on the server).

## Request flows

### Streaming chat

```
Browser                         Server                                   Provider
   │ POST /api/ai/chat             │                                          │
   │ {connectionId, model,         │                                          │
   │  messages, system, ...}       │                                          │
   │──────────────────────────────►│ requireAuth, denyInDemo                  │
   │                               │ chatRequest.parse (zod)                  │
   │                               │ load row + manifest                      │
   │                               │ values = field defaults + config         │
   │                               │          + decrypt(secrets_enc)          │
   │                               │ adapter = getAiAdapter(kind)             │
   │                               │ http.send: render baseUrl, add           │
   │                               │ defaultHeaders + auth, 300 s timeout     │
   │                               │─────────────────────────────────────────►│
   │                               │◄──────────── text/event-stream ──────────│
   │                               │ readSse → adapter extracts text          │
   │◄── data: {"type":"delta"} ────│ onDelta(text)                            │
   │◄── data: {"type":"delta"} ────│                                          │
   │◄── data: {"type":"done"}  ────│ log(kind=chat, redacted URL, status)     │
```

- Response headers `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform` ask proxies not to buffer.
- If the browser disconnects, `stream.onAbort` aborts the upstream `fetch`.
- Errors after the stream has started are sent as `{"type":"error","message":...}` events, since the HTTP status has already been sent.
- The UI reads the stream with `fetch` + `ReadableStream` (not `EventSource`, because the request is a POST).

### Credential storage

```
POST /api/connections {connectorId, name, values}
  │
  ├─ createConnectionInput.parse (zod)
  ├─ registry.get(connectorId)                       404 if unknown
  ├─ splitValues(manifest, values)
  │    for each manifest field:
  │      secret      → secrets[key]   (empty on edit = keep stored value)
  │      text/url/select → config[key] (url and select validated)
  │      missing + required → 400
  │    values for undeclared keys are dropped
  ├─ secrets_enc = encryptJson(masterKey, secrets)   "v1:" + base64(iv[12] | tag[16] | ciphertext)
  └─ INSERT connections (config_json, secrets_enc, secret_keys)
       response: {id, config, secretsSet: [keys], ...}   no secret values
```

Secrets are decrypted only in memory, right before an outgoing request (`ConnectionService.valuesFor`).

## Database

SQLite through the built-in `node:sqlite` module, stored at `<ENLAZIA_DATA_DIR>/enlazia.db` in WAL mode. The schema is created with `CREATE TABLE IF NOT EXISTS` on startup.

### `connections`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | `randomUUID()` |
| `connector_id` | TEXT NOT NULL | Manifest `id` |
| `name` | TEXT NOT NULL | 1–80 characters |
| `config_json` | TEXT NOT NULL DEFAULT `'{}'` | Non-secret field values |
| `secrets_enc` | TEXT | Encrypted JSON of secret values, or NULL |
| `secret_keys` | TEXT NOT NULL DEFAULT `'[]'` | Names of stored secret fields (shown as "set" in the UI) |
| `last_test_json` | TEXT | Last `TestResult` plus `at` |
| `created_at`, `updated_at` | TEXT NOT NULL | ISO 8601 |

### `request_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK AUTOINCREMENT | |
| `connection_id` | TEXT | Joined to `connections.name` when listing |
| `kind` | TEXT NOT NULL | `test`, `models`, `chat`, `request` |
| `method` | TEXT NOT NULL | |
| `url` | TEXT NOT NULL | **Redacted** URL |
| `status` | INTEGER | Upstream status, or NULL on network error |
| `duration_ms` | INTEGER NOT NULL | |
| `error` | TEXT | Error message, or NULL |
| `created_at` | TEXT NOT NULL | Indexed |

Only the newest 5,000 log rows are kept. Request and response bodies are never logged.

## Security decisions

| Decision | Why |
| --- | --- |
| **Secrets never reach the browser.** The API returns only `secretsSet` (field names). Editing with an empty secret keeps the stored one. | A compromised or shared browser session cannot read keys back. |
| **AES-256-GCM at rest** with a random 12-byte IV per write, and a versioned payload (`v1:`). | Authenticated encryption, with room to rotate formats later. |
| **Master key from `ENLAZIA_MASTER_KEY`** or auto-generated at `data/.master-key` (mode `0600`). Must decode to exactly 32 bytes. | Works out of the box locally, and can be kept outside the data folder in production. |
| **Session cookie** `enlazia_session=<issuedAt>.<HMAC-SHA256>`: `HttpOnly`, `SameSite=Strict`, `Secure` over HTTPS, 30 days. The HMAC key is derived from the master key plus the password. | Stateless sessions. Changing the password invalidates every session. `SameSite=Strict` mitigates CSRF. |
| **Password comparison** by SHA-256 digests with `timingSafeEqual`. | Constant-time comparison regardless of length. |
| **Login rate limit:** 5 failed attempts per IP per minute, then `429`. The IP comes from `X-Forwarded-For` or `X-Real-IP`. | Slows brute force. Relies on a trusted reverse proxy for the client IP. |
| **Startup refusal** without a password when `HOST` is not loopback or when running under Passenger (unless demo mode). | Prevents accidentally exposing an open instance. |
| **Demo mode** blocks every route that writes data or calls upstream APIs. | Safe public showcase. |
| **Log redaction:** credentials in the query string and URL userinfo are replaced before logging, and bodies are never stored. | Logs can be shown in the UI safely. |
| **Base URL validation:** only `http`/`https` after templating. | Prevents `file:` and other schemes. |
| **Secure headers:** CSP `default-src 'self'` (inline styles and `data:` images and fonts allowed), `frame-ancestors 'none'`, plus Hono `secureHeaders` defaults. | Limits XSS impact and clickjacking. |
| **Proxy responses:** `set-cookie` headers are removed and bodies are capped at 2 MB. | Upstream cookies are not forwarded, and memory use is bounded. |
| **Upstream error messages** are trimmed to 500 characters, and internal errors return a generic `500`. | Avoids leaking stack traces. |

Known trade-off: the REST proxy can reach any host that a connection's `baseUrl` resolves to, including private networks (this is intended, for Ollama and LM Studio). Protect the instance with a password.

## Adding a new connector kind

Most integrations only need a JSON manifest. Add a new **kind** only for a new protocol, for example a chat API that isn't OpenAI-, Anthropic- or Gemini-compatible.

1. **Declare the kind** in `packages/shared/src/manifest.ts`:

   ```ts
   export const CONNECTOR_KINDS = ['ai-openai-compatible', 'ai-anthropic', 'ai-gemini', 'ai-acme', 'rest'] as const;
   ```

2. **Implement the adapter** in `packages/server/src/adapters/acme.ts`, following the interface in `adapters/types.ts`:

   ```ts
   export type AiAdapter = {
     listModels(ctx: RequestContext): Promise<string[]>;
     /** Streams the assistant reply, calling `onDelta` for every text chunk. */
     chat(ctx: RequestContext, req: ChatRequest, onDelta: (text: string) => void): Promise<void>;
   };
   ```

   Always use `send(ctx, { method, path, query, body })` from `http.ts`, so base URL templating, default headers, auth, timeouts, cancellation, tracing and redaction all work. Use `readSse(res.body)` for SSE streams. Throw `UpstreamError` for provider errors reported inside a stream.

3. **Register it** in `packages/server/src/adapters/index.ts`:

   ```ts
   const ADAPTERS: Partial<Record<ConnectorKind, AiAdapter>> = {
     // ...
     'ai-acme': acmeAdapter,
   };
   ```

   Kinds without an adapter behave like `rest` (no chat or models, generic test).

4. **Add UI labels** in `apps/web/src/i18n.tsx` for **both** languages: `'catalog.kind.ai-acme'`.

5. **Regenerate the schema:** `pnpm --filter @enlazia/shared schema`.

6. **Add tests** in `packages/server/test/` (request building and stream parsing with a mocked `ReadableStream`), and add at least one connector using the kind.

7. **Document** the endpoints the adapter calls in `docs/connectors.md` and `docs/connectors.es.md`.
