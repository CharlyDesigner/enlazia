# Connector reference

**English** · [Español](connectors.es.md)

A connector is a JSON manifest that tells Enlazia how to reach an AI provider or a REST API: its base URL, how to authenticate, which fields the user fills in, and how to test it. You don't need to write code unless you want to support a completely new API protocol (see [architecture.md](architecture.md#adding-a-new-connector-kind)).

The source of truth is the zod schema in [`packages/shared/src/manifest.ts`](../packages/shared/src/manifest.ts). This page describes it exactly.

## Where connector files live

| Location | Purpose |
| --- | --- |
| `connectors/**/*.json` | Built-in connectors shipped with Enlazia (`connectors/ai/`, `connectors/api/`). Subfolders are scanned recursively. |
| `<ENLAZIA_DATA_DIR>/connectors/**/*.json` | Your own connectors (default `data/connectors/`). Not tracked by git. |

- Both folders are loaded **on server start**. Restart after adding or editing a file.
- The data folder is loaded after the built-in one, so a user connector **with the same `id` replaces** the built-in one.
- Invalid files are skipped. The server prints `Skipped connector <file>: <reason>` and lists them at `GET /api/connectors/errors`.
- The catalog is sorted by `category`, then by `name`.

## Validation

- **Editor autocompletion:** add `"$schema": "../../schemas/connector.schema.json"` (adjust the relative path). The schema is generated with `pnpm --filter @enlazia/shared schema` (also part of `pnpm build`).
- **Tests:** `pnpm test` runs a registry test that loads every file in `connectors/` and fails on any schema error or undeclared field reference.
- **At runtime:** the server applies the same zod validation, plus reference checks (see [Reference checks](#reference-checks)).

## Manifest properties

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `$schema` | string | no | | Path or URL of the JSON Schema. Ignored by the server. |
| `id` | string | yes | | Unique slug: `^[a-z0-9][a-z0-9-]*$` (lowercase letters, numbers, dashes). |
| `name` | string | yes | | Display name, not localized (for example `"OpenAI"`). Minimum 1 character. |
| `category` | `"ai"` \| `"api"` | yes | | Catalog filter. **Also decides which Playground panel is shown**: `ai` shows the chat panel and `api` shows the REST builder. Use `ai` with `ai-*` kinds and `api` with `rest`. |
| `kind` | `"ai-openai-compatible"` \| `"ai-anthropic"` \| `"ai-gemini"` \| `"rest"` | yes | | Protocol used by the server. See [Kinds](#kinds). |
| `description` | [LocalizedText](#localizedtext) | yes | | Short description in both languages. |
| `website` | URL string | no | | Provider website. |
| `docs` | URL string | no | | Link to the API documentation, shown in the UI. |
| `color` | string | no | | Brand color for the catalog avatar, `#RRGGBB` (`^#[0-9a-fA-F]{6}$`). |
| `tags` | string[] | no | `[]` | Free-form tags. |
| `baseUrl` | string | yes | | Base URL with no trailing slash (trailing slashes are removed anyway). May contain `{{fieldKey}}` placeholders. See [Templating](#templating-in-baseurl). |
| `auth` | [Auth](#auth-types) | yes | | How credentials are injected. |
| `fields` | [Field](#fields)[] | no | `[]` | Inputs the user fills in when creating a connection. |
| `defaultHeaders` | `Record<string, string>` | no | | Headers added to every request (for example API version headers). Per-request headers override them, and auth headers override both. |
| `test` | [Test](#test) | no | | Request used by "Test connection". |
| `models` | [Models](#models) | no | | Model listing behavior for AI kinds. |
| `actions` | [Action](#actions)[] | no | `[]` | Predefined requests for the REST builder. |

### LocalizedText

```json
{ "es": "Texto en español", "en": "English text" }
```

Both keys are required and must be non-empty strings.

### Fields

Each field becomes a form input in the "Connect" dialog.

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `key` | string | yes | | Identifier referenced by `auth` and `baseUrl`. Pattern `^[a-zA-Z][a-zA-Z0-9_]*$`. |
| `label` | LocalizedText | yes | | Input label. |
| `type` | `"text"` \| `"secret"` \| `"url"` \| `"select"` | yes | | See the table below. |
| `required` | boolean | no | **`true`** | Whether a value is required. Set `false` explicitly for optional fields. |
| `default` | string | no | | Default value. Used when the user leaves the input empty, and at request time if no value is stored. |
| `placeholder` | string | no | | Input placeholder (not localized). |
| `help` | LocalizedText | no | | Help text under the input. |
| `options` | `{ value: string, label: string }[]` | no | | Choices for `select`. Submitted values must match an option `value`. |

| `type` | Stored as | Server validation |
| --- | --- | --- |
| `text` | Plain config (visible in the API) | none |
| `secret` | **Encrypted** (AES-256-GCM), never returned. On edit, an empty value keeps the stored secret. | none |
| `url` | Plain config | Must parse as an `http:` or `https:` URL |
| `select` | Plain config | Must be one of `options[].value` (when `options` is set) |

Values are trimmed. Missing required values return `400 Field "<key>" is required`.

### Auth types

`auth` is a discriminated union on `type`. Every `*Field` property must name a declared field `key`.

| `type` | Properties | What the server sends |
| --- | --- | --- |
| `none` | | Nothing |
| `bearer` | `field` | `Authorization: Bearer <value>` |
| `header` | `field`, and either `header` (fixed name) or `headerField` (field that holds the name), optional `prefix` | `<header>: <prefix><value>` |
| `query` | `param`, `field` | `?<param>=<value>` on the URL |
| `basic` | `usernameField`, `passwordField` | `Authorization: Basic base64(user:pass)` |

If the credential value is empty, no auth is added (useful for optional keys).

```jsonc
// Bearer token
"auth": { "type": "bearer", "field": "apiKey" }

// Fixed header name (Anthropic, Gemini, Azure)
"auth": { "type": "header", "header": "x-api-key", "field": "apiKey" }

// Header with prefix
"auth": { "type": "header", "header": "Authorization", "prefix": "Token ", "field": "apiKey" }

// Header name chosen by the user (custom REST)
"auth": { "type": "header", "headerField": "authHeader", "field": "authValue" }

// Query parameter
"auth": { "type": "query", "param": "api_key", "field": "apiKey" }

// HTTP Basic
"auth": { "type": "basic", "usernameField": "username", "passwordField": "password" }
```

Query credentials, and any query parameter named `key`, `api_key`, `api-key`, `apikey`, `token`, `access_token`, `access-token` or `secret`, are replaced with `***` in logs.

### Test

```json
"test": { "method": "GET", "path": "/v1/balance", "expectStatus": 200 }
```

| Property | Type | Required | Default |
| --- | --- | --- | --- |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` | no | `GET` |
| `path` | string starting with `/` | yes | |
| `expectStatus` | integer | no | |

### Models

```json
"models": { "listable": true, "suggested": ["model-a", "model-b"] }
```

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `listable` | boolean | `true` | Whether the provider has a model listing endpoint. |
| `suggested` | string[] | `[]` | Models shown when listing is disabled or returns nothing. The first one is used by "Test connection" when `listable` is `false`. |

Omitting `models` entirely behaves like `listable: true` with no suggestions.

### Actions

Predefined requests shown in the REST builder. Selecting one fills in method, path and body.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | slug | yes | `^[a-z0-9][a-z0-9-]*$` |
| `name` | LocalizedText | yes | Label in the action selector |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` | yes | |
| `path` | string starting with `/` | yes | May include a query string, e.g. `/user/repos?per_page=30` |
| `description` | LocalizedText | no | |
| `sampleBody` | any JSON | no | Pre-filled request body (pretty-printed) |

```json
"actions": [
  {
    "id": "search",
    "name": { "es": "Buscar", "en": "Search" },
    "method": "POST",
    "path": "/v1/search",
    "sampleBody": { "query": "", "page_size": 10 }
  }
]
```

## Kinds

The `kind` decides which server adapter handles the connection. Paths are appended to the resolved `baseUrl`.

### `ai-openai-compatible`

For any API that implements OpenAI's Chat Completions (OpenAI, Groq, Mistral, OpenRouter, Ollama, vLLM, and many more). **`baseUrl` must include the version prefix** (for example `https://api.openai.com/v1`).

| Operation | Request |
| --- | --- |
| List models | `GET {baseUrl}/models` and reads `data[].id` (sorted) |
| Chat | `POST {baseUrl}/chat/completions` with `{ model, messages, stream: true, temperature, max_tokens }`. The system prompt is sent as a leading `system` message. Reads `choices[0].delta.content` from SSE until `[DONE]`. |

### `ai-anthropic`

For the Anthropic Messages API. `baseUrl` has **no** version prefix (`https://api.anthropic.com`). Typically uses `header` auth with `x-api-key` and `defaultHeaders: { "anthropic-version": "2023-06-01" }`.

| Operation | Request |
| --- | --- |
| List models | `GET {baseUrl}/v1/models?limit=1000` and reads `data[].id` |
| Chat | `POST {baseUrl}/v1/messages` with `{ model, max_tokens (default 4096), system, messages, temperature, stream: true }`. Reads `content_block_delta` / `text_delta` events until `message_stop`. |

### `ai-gemini`

For the Google Gemini API. `baseUrl` has **no** version prefix (`https://generativelanguage.googleapis.com`). Typically uses `header` auth with `x-goog-api-key`.

| Operation | Request |
| --- | --- |
| List models | `GET {baseUrl}/v1beta/models?pageSize=1000` and keeps models whose `supportedGenerationMethods` include `generateContent` (strips `models/`, sorted) |
| Chat | `POST {baseUrl}/v1beta/models/{model}:streamGenerateContent?alt=sse` with `contents` (`assistant` becomes `model`), `systemInstruction` and `generationConfig { temperature, maxOutputTokens }`. |

### `rest`

Generic REST API. There is no chat or model listing (`GET /api/connections/:id/models` returns `400`). Requests are built in the REST builder (`POST /api/connections/:id/request`) as `{baseUrl}{path}` with the connector's default headers and auth.

- A JSON `content-type` is added automatically when a body is sent and no `content-type` header is given. Bodies are ignored for `GET`.
- Response bodies are truncated at 2 MB, and `set-cookie` headers are hidden.

> The REST builder endpoint works for any connection, but the UI only shows it for `category: "api"` connectors.

## Templating in `baseUrl`

`baseUrl` can reference field values with `{{fieldKey}}` (letters, numbers and `_`):

```json
"baseUrl": "https://{{resourceName}}.openai.azure.com/openai/v1"
```

```json
"baseUrl": "{{baseUrl}}"
```

At request time:

1. Values are resolved from the stored config and decrypted secrets, falling back to each field's `default`.
2. Each placeholder is replaced. A missing or empty value fails with `Missing value for "<key>"`.
3. Trailing slashes are removed, and the result must be a valid `http` or `https` URL (`Invalid base URL` / `Base URL must use http or https`).

## Reference checks

In addition to the schema, the registry rejects a manifest when:

- `auth.field`, `auth.headerField`, `auth.usernameField`, `auth.passwordField` or any `{{placeholder}}` in `baseUrl` names a field `key` that is not declared (`Undeclared fields referenced: ...`).
- `auth.type` is `header` without either `header` or `headerField`.

## "Test connection" behavior

`POST /api/connections/:id/test` follows the first rule that matches (see `ConnectionService.test()` in `packages/server/src/services.ts`):

| # | Condition | What happens | Success when |
| --- | --- | --- | --- |
| 1 | `test` is defined (any kind) | Sends `test.method test.path` (no body) | `status === expectStatus` if set, otherwise any 2xx |
| 2 | AI kind and `models.listable !== false` | Lists models | The listing request returns 2xx. Message: `N models` |
| 3 | AI kind and `models.listable === false` | Sends a real chat request to `models.suggested[0]` with the message `ping` and `maxTokens: 1` (**this may consume a tiny amount of credits**) | The request returns 2xx. Fails with `No model available to test this connection` if `suggested` is empty |
| 4 | `rest` without `test` | `GET {baseUrl}/` | Any status below 500 |

The result (`ok`, `status`, `durationMs`, `message`) is saved as the connection's last test and logged. For REST APIs, always define a `test` against an authenticated endpoint. Otherwise a wrong key can still "pass" rule 4.

Timeouts: 60 seconds for tests, model listing and REST requests, and 300 seconds for chat.

## Worked example: OpenAI-compatible provider

`connectors/ai/acme-ai.json`, for a hypothetical provider with an OpenAI-compatible API at `https://api.acme.ai/v1`, a regional endpoint and a models endpoint:

```json
{
  "$schema": "../../schemas/connector.schema.json",
  "id": "acme-ai",
  "name": "Acme AI",
  "category": "ai",
  "kind": "ai-openai-compatible",
  "description": {
    "es": "Modelos de lenguaje de Acme AI con API compatible con OpenAI.",
    "en": "Acme AI language models with an OpenAI-compatible API."
  },
  "website": "https://acme.ai",
  "docs": "https://docs.acme.ai/api",
  "color": "#FF5A1F",
  "tags": ["llm", "chat"],
  "baseUrl": "https://{{region}}.api.acme.ai/v1",
  "auth": { "type": "bearer", "field": "apiKey" },
  "fields": [
    {
      "key": "region",
      "label": { "es": "Región", "en": "Region" },
      "type": "select",
      "default": "us",
      "options": [
        { "value": "us", "label": "United States" },
        { "value": "eu", "label": "Europe" }
      ]
    },
    {
      "key": "apiKey",
      "label": { "es": "Clave de API", "en": "API key" },
      "type": "secret",
      "placeholder": "acme-...",
      "help": {
        "es": "Créala en console.acme.ai/keys.",
        "en": "Create one at console.acme.ai/keys."
      }
    }
  ],
  "models": {
    "listable": true,
    "suggested": ["acme-large", "acme-small"]
  }
}
```

What Enlazia does with it:

- **Connect:** asks for Region (defaults to `us`) and API key (encrypted).
- **Test:** `GET https://us.api.acme.ai/v1/models` with `Authorization: Bearer ...`.
- **Playground:** `POST https://us.api.acme.ai/v1/chat/completions` with streaming.

If the provider had no `/models` endpoint, set `"listable": false` and put at least one model in `suggested`.

## Worked example: REST API

`connectors/api/acme-crm.json`, for a hypothetical CRM that uses an `X-Api-Key` header and a version header:

```json
{
  "$schema": "../../schemas/connector.schema.json",
  "id": "acme-crm",
  "name": "Acme CRM",
  "category": "api",
  "kind": "rest",
  "description": {
    "es": "API de Acme CRM: contactos y oportunidades.",
    "en": "Acme CRM API: contacts and deals."
  },
  "website": "https://acmecrm.com",
  "docs": "https://developers.acmecrm.com/reference",
  "color": "#2563EB",
  "tags": ["crm", "sales", "rest"],
  "baseUrl": "https://api.acmecrm.com",
  "auth": { "type": "header", "header": "X-Api-Key", "field": "apiKey" },
  "fields": [
    {
      "key": "apiKey",
      "label": { "es": "Clave de API", "en": "API key" },
      "type": "secret",
      "help": {
        "es": "En Acme CRM: Ajustes > Integraciones > API.",
        "en": "In Acme CRM: Settings > Integrations > API."
      }
    }
  ],
  "defaultHeaders": {
    "Accept": "application/json",
    "Acme-Version": "2026-01-01"
  },
  "test": { "method": "GET", "path": "/v2/me", "expectStatus": 200 },
  "actions": [
    {
      "id": "list-contacts",
      "name": { "es": "Contactos", "en": "Contacts" },
      "method": "GET",
      "path": "/v2/contacts?limit=20"
    },
    {
      "id": "create-contact",
      "name": { "es": "Crear contacto", "en": "Create contact" },
      "description": {
        "es": "Crea un contacto de prueba.",
        "en": "Creates a test contact."
      },
      "method": "POST",
      "path": "/v2/contacts",
      "sampleBody": { "name": "Ada Lovelace", "email": "ada@example.com" }
    }
  ]
}
```

- **Test:** `GET https://api.acmecrm.com/v2/me` must return exactly `200`.
- **REST builder:** the "Contacts" and "Create contact" actions pre-fill the request, and the user can still edit method, path and body.

## Checklist for new connector PRs

- [ ] File is in `connectors/ai/` or `connectors/api/`, named `<id>.json`, with `$schema` set.
- [ ] `category` matches `kind` (`ai` with `ai-*`, `api` with `rest`).
- [ ] Base URL, auth scheme, model listing and test endpoints are **verified in the provider's official docs** (not blog posts or memory).
- [ ] Model IDs in `suggested` are current according to the official docs.
- [ ] `listable: false` is set if there is no documented models endpoint.
- [ ] REST connectors define a `test` against an endpoint that requires authentication.
- [ ] Actions are read-only or clearly harmless by default.
- [ ] Both `es` and `en` texts are natural and accurate.
- [ ] A section was added to [`connectors/SOURCES.md`](../connectors/SOURCES.md) with the links you checked.
- [ ] `pnpm test` passes.
- [ ] Tested manually with a real credential if possible (test, models, one request or chat).
