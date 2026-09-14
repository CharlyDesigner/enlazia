<p align="center">
  <img src="brand/enlazia-icon.svg" width="96" alt="Enlazia">
</p>

<h1 align="center">Enlazia</h1>

<p align="center">Connect AI providers and third-party APIs from one self-hosted place.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22.13-339933.svg?logo=node.js&logoColor=white" alt="Node >= 22.13">
</p>

<p align="center"><strong>English</strong> · <a href="README.es.md">Español</a></p>

---

## What it is

Enlazia is an open-source, bilingual (Spanish / English) web platform for connecting AI providers and REST APIs. You add your credentials once, Enlazia stores them encrypted on your own server, and you can test connections, chat with models and send REST requests from the browser. Your API keys are never sent back to the browser.

Connectors are plain JSON manifests, so adding a new provider or API usually means writing a JSON file, not code.

Landing page with full project details (ES/EN): https://charlydesigner.github.io/enlazia/

## Features

- **Catalog of 22 AI connectors** out of the box: OpenAI, Anthropic, Google Gemini, Azure OpenAI, DeepSeek, Groq, Mistral AI, xAI Grok, OpenRouter, Together AI, Fireworks AI, Perplexity, Cerebras, Moonshot AI (Kimi), Qwen (Alibaba Cloud), Z.ai (GLM), Cohere, NVIDIA NIM, Hugging Face, Ollama, LM Studio, and a generic OpenAI-compatible connector (vLLM, LiteLLM, etc.).
- **REST connectors**: GitHub, Notion, Stripe, and a generic custom REST API connector.
- **Encrypted vault**: secrets are encrypted at rest with AES-256-GCM and never returned by the API.
- **Streaming playground**: chat with any configured AI model, with system prompt and temperature, streamed over Server-Sent Events.
- **REST request builder**: method, path and JSON body, with predefined actions per connector.
- **Connection tests and model listing** for every connector.
- **Request logs**: method, redacted URL, status, duration and errors for every outgoing call, plus 24-hour stats.
- **Bilingual UI** (es / en, auto-detected from the browser) with **dark, light and system themes**.
- **Connector SDK via JSON**: drop a manifest into `connectors/` or your data folder. A JSON Schema is provided for editor autocompletion.
- **Optional password protection** with a signed HttpOnly session cookie and login rate limiting.
- **Demo mode** for public, read-only instances.
- **Easy hosting**: the server is bundled into a single file, so it runs on shared cPanel hosting without Docker or root access.

## Quick start

Requirements:

- Node.js **22.13 or newer** (Enlazia uses the built-in `node:sqlite` module)
- pnpm 11 (`corepack enable` sets it up from `packageManager`)

```bash
git clone https://github.com/CharlyDesigner/enlazia.git
cd enlazia
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` starts the API on http://127.0.0.1:8787 (with `tsx watch`) and the Vite dev server on http://localhost:5173, which proxies `/api` to the API. Open http://localhost:5173.

Other scripts:

| Command | What it does |
| --- | --- |
| `pnpm build` | Generates the connector JSON Schema, bundles the server to `packages/server/dist/server.cjs` and builds the UI to `apps/web/dist` |
| `pnpm start` | Runs `node app.cjs`: API and built UI on port 8787 |
| `pnpm test` | Runs the Vitest suites (including validation of every bundled connector) |
| `pnpm typecheck` | Type-checks every workspace package |

## Production

```bash
pnpm install
pnpm build
pnpm start
```

The server reads `.env` from the project root if it exists, or uses real environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | HTTP port. cPanel/Passenger sets it for you. |
| `HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` to listen on every interface (then a password is required). |
| `ENLAZIA_DATA_DIR` | `./data` | Folder for the SQLite database, the generated master key and user connectors. Relative paths are resolved from the project root. |
| `ENLAZIA_PASSWORD` | _(empty)_ | Access password. **Required** if the instance is reachable from the network. |
| `ENLAZIA_MASTER_KEY` | _(empty)_ | 32-byte key in base64 used to encrypt credentials. If empty, one is generated in `ENLAZIA_DATA_DIR/.master-key`. Generate one with `openssl rand -base64 32`. |
| `ENLAZIA_DEMO` | `false` | Public demo mode: catalog and docs only. Creating, testing and using connections is disabled. |

> [!IMPORTANT]
> **Back up your master key.** If you lose `ENLAZIA_MASTER_KEY` or `data/.master-key`, stored credentials cannot be decrypted.
>
> The server **refuses to start** without `ENLAZIA_PASSWORD` when it is bound to a non-loopback address or running under Phusion Passenger, unless `ENLAZIA_DEMO=true`.

For a VPS, run `pnpm start` under a process manager (systemd, pm2, etc.) and put a reverse proxy with HTTPS (Caddy, Nginx, Apache) in front of it. Disable response buffering for `/api/ai/chat` so streaming works.

## Deploy on cPanel

Enlazia runs on shared hosting with cPanel "Setup Node.js App" (Phusion Passenger). The server is a single bundled file, so you don't need Docker, root access or `npm install` on the host:

1. Build locally with `pnpm build`.
2. Upload `app.cjs`, `package.json`, `packages/server/dist/`, `apps/web/dist/`, `connectors/` and `schemas/`.
3. Create the app in cPanel with startup file `app.cjs`, and set `ENLAZIA_PASSWORD` (or `ENLAZIA_DEMO=true`) and `ENLAZIA_MASTER_KEY`.
4. Restart with `touch tmp/restart.txt`.

You can also deploy automatically from GitHub Actions over SSH. The full guide, in Spanish with an English summary, is in [docs/deploy-cpanel.md](docs/deploy-cpanel.md).

## Add a connector

Create a JSON file, for example `connectors/ai/my-provider.json`:

```json
{
  "$schema": "../../schemas/connector.schema.json",
  "id": "my-provider",
  "name": "My Provider",
  "category": "ai",
  "kind": "ai-openai-compatible",
  "description": { "es": "Modelos de My Provider.", "en": "My Provider models." },
  "baseUrl": "https://api.my-provider.com/v1",
  "auth": { "type": "bearer", "field": "apiKey" },
  "fields": [
    { "key": "apiKey", "label": { "es": "Clave de API", "en": "API key" }, "type": "secret" }
  ]
}
```

Run `pnpm test` to validate it, then restart the server. Private connectors can go in `<ENLAZIA_DATA_DIR>/connectors/` instead, and they override built-in ones with the same `id`. The full reference is in [docs/connectors.md](docs/connectors.md).

## Project structure

```
enlazia/
├── app.cjs                  # Production / Passenger entry point
├── apps/
│   └── web/                 # React 19 + Vite 8 + Tailwind 4 UI
│       └── src/
│           ├── i18n.tsx     # All UI strings (es + en)
│           ├── pages/       # Dashboard, Catalog, Connections, Playground, Logs, Settings
│           └── components/
├── packages/
│   ├── shared/              # zod schemas and types shared by server and UI
│   │   ├── src/manifest.ts  # Connector manifest schema
│   │   └── src/api.ts       # API request/response types
│   └── server/              # Hono API, bundled with esbuild
│       ├── src/adapters/    # OpenAI-compatible, Anthropic and Gemini adapters
│       └── test/
├── connectors/
│   ├── ai/                  # Built-in AI connectors
│   ├── api/                 # Built-in REST connectors
│   └── SOURCES.md           # Official docs checked for each connector
├── schemas/                 # connector.schema.json (generated)
├── brand/                   # Logo and icon
└── docs/                    # Guides
```

More detail is in [docs/architecture.md](docs/architecture.md).

## Roadmap

- MCP client (connect to and manage Model Context Protocol servers)
- OpenAPI importer to generate REST connectors
- More auth types, including OAuth 2.0
- Image and audio models
- Multi-user accounts
- Desktop build

Ideas and discussion are welcome in [issues](https://github.com/CharlyDesigner/enlazia/issues).

## Contributing

Contributions are welcome, especially new connectors. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please don't report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE). © 2026 Charly Designer.

## Credits

Created by [Charly Designer](https://carlosnavarro.site) · [GitHub](https://github.com/CharlyDesigner).

Enlazia is an independent project. Some ideas (provider presets, manifest-based extensions, unified MCP management) were inspired by [AionUi](https://github.com/iOfficeAI/AionUi) (Apache-2.0). No AionUi source code or brand assets are included. See [NOTICE](NOTICE).
