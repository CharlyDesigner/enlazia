# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 0.1.0

First public version.

### Added

- Bilingual web UI (Spanish / English, detected from the browser) with dark, light and system themes, built with React 19, Vite 8 and Tailwind CSS 4.
- Pages: Dashboard (24-hour stats, recent activity), Catalog, Connections, Playground, Logs and Settings.
- Hono API server bundled with esbuild into a single `packages/server/dist/server.cjs`, with `app.cjs` as the entry point for `pnpm start` and cPanel/Passenger.
- JSON connector manifests validated with zod, loaded from `connectors/` and `<ENLAZIA_DATA_DIR>/connectors` (user connectors override built-in ones by `id`), plus a generated JSON Schema at `schemas/connector.schema.json`.
- Connector kinds: `ai-openai-compatible`, `ai-anthropic`, `ai-gemini` and `rest`.
- Auth types: `none`, `bearer`, `header` (fixed or user-chosen name, optional prefix), `query` and `basic`, with `{{field}}` templating in `baseUrl`.
- 22 built-in AI connectors: OpenAI, Anthropic, Google Gemini, Azure OpenAI, DeepSeek, Groq, Mistral AI, xAI Grok, OpenRouter, Together AI, Fireworks AI, Perplexity, Cerebras, Moonshot AI (Kimi), Qwen (Alibaba Cloud), Z.ai (GLM), Cohere, NVIDIA NIM, Hugging Face, Ollama, LM Studio and a generic OpenAI-compatible connector.
- 4 built-in REST connectors: GitHub, Notion, Stripe and a generic custom REST API connector.
- Encrypted credential vault (AES-256-GCM) with a master key from `ENLAZIA_MASTER_KEY` or an auto-generated `data/.master-key`. Secrets are never returned to the browser.
- Connection testing (custom test request, model listing, or a minimal chat) and model listing with suggested-model fallback.
- Streaming chat playground over Server-Sent Events, with system prompt and temperature.
- REST request builder with method, path, JSON body and predefined connector actions.
- Request logs with redacted URLs, status, duration and errors (last 5,000 entries), stored in SQLite via the built-in `node:sqlite` module.
- Optional password protection (`ENLAZIA_PASSWORD`) with a signed HttpOnly session cookie and login rate limiting.
- Startup safety check that refuses to run without a password on non-loopback hosts or under Passenger.
- Public demo mode (`ENLAZIA_DEMO=true`) that disables saving and using credentials.
- Security headers, including a restrictive Content Security Policy.
- Documentation: README (en/es), connector reference, architecture overview, cPanel deployment guide, and community files.

[Unreleased]: https://github.com/CharlyDesigner/enlazia/commits/main
