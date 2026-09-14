# Referencia de conectores

[English](connectors.md) · **Español**

Un conector es un manifiesto JSON que le indica a Enlazia cómo llegar a un proveedor de IA o a una API REST: su URL base, cómo autenticarse, qué campos llena la persona usuaria y cómo probar la conexión. No necesitas escribir código, salvo que quieras soportar un protocolo de API totalmente nuevo (consulta [architecture.md](architecture.md#adding-a-new-connector-kind)).

La fuente de verdad es el esquema zod de [`packages/shared/src/manifest.ts`](../packages/shared/src/manifest.ts). Esta página lo describe con exactitud.

## Dónde van los archivos

| Ubicación | Uso |
| --- | --- |
| `connectors/**/*.json` | Conectores incluidos con Enlazia (`connectors/ai/`, `connectors/api/`). Las subcarpetas se recorren de forma recursiva. |
| `<ENLAZIA_DATA_DIR>/connectors/**/*.json` | Tus conectores propios (por defecto `data/connectors/`). No se versionan en git. |

- Ambas carpetas se cargan **al iniciar el servidor**. Reinícialo después de agregar o editar un archivo.
- La carpeta de datos se carga después de la de conectores incluidos, así que un conector propio **con el mismo `id` reemplaza** al incluido.
- Los archivos inválidos se omiten. El servidor muestra `Skipped connector <archivo>: <motivo>` y los lista en `GET /api/connectors/errors`.
- El catálogo se ordena por `category` y luego por `name`.

## Validación

- **Autocompletado en el editor:** agrega `"$schema": "../../schemas/connector.schema.json"` (ajusta la ruta relativa). El schema se genera con `pnpm --filter @enlazia/shared schema` (también forma parte de `pnpm build`).
- **Pruebas:** `pnpm test` ejecuta una prueba del registro que carga todos los archivos de `connectors/` y falla ante cualquier error de esquema o referencia a un campo no declarado.
- **En ejecución:** el servidor aplica la misma validación zod y además revisa las referencias (consulta [Revisión de referencias](#revisión-de-referencias)).

## Propiedades del manifiesto

| Propiedad | Tipo | Obligatoria | Por defecto | Descripción |
| --- | --- | --- | --- | --- |
| `$schema` | string | no | | Ruta o URL del JSON Schema. El servidor la ignora. |
| `id` | string | sí | | Slug único: `^[a-z0-9][a-z0-9-]*$` (minúsculas, números y guiones). |
| `name` | string | sí | | Nombre visible, sin traducir (por ejemplo `"OpenAI"`). Mínimo 1 carácter. |
| `category` | `"ai"` \| `"api"` | sí | | Filtro del catálogo. **También define qué panel muestra el Playground**: `ai` muestra el chat y `api` el constructor REST. Usa `ai` con los tipos `ai-*` y `api` con `rest`. |
| `kind` | `"ai-openai-compatible"` \| `"ai-anthropic"` \| `"ai-gemini"` \| `"rest"` | sí | | Protocolo que usa el servidor. Consulta [Tipos](#tipos-kind). |
| `description` | [LocalizedText](#localizedtext) | sí | | Descripción corta en ambos idiomas. |
| `website` | string URL | no | | Sitio web del proveedor. |
| `docs` | string URL | no | | Enlace a la documentación de la API, visible en la interfaz. |
| `color` | string | no | | Color de marca del avatar en el catálogo, `#RRGGBB` (`^#[0-9a-fA-F]{6}$`). |
| `tags` | string[] | no | `[]` | Etiquetas libres. |
| `baseUrl` | string | sí | | URL base sin barra final (de todos modos se eliminan las barras finales). Puede contener `{{claveCampo}}`. Consulta [Plantillas](#plantillas-en-baseurl). |
| `auth` | [Auth](#tipos-de-autenticación) | sí | | Cómo se inyectan las credenciales. |
| `fields` | [Field](#campos-fields)[] | no | `[]` | Campos que se llenan al crear una conexión. |
| `defaultHeaders` | `Record<string, string>` | no | | Encabezados que se agregan a todas las peticiones (por ejemplo, de versión de API). Los encabezados de cada petición los reemplazan, y los de autenticación reemplazan a ambos. |
| `test` | [Test](#test) | no | | Petición que usa "Probar conexión". |
| `models` | [Models](#models) | no | | Comportamiento del listado de modelos en los tipos de IA. |
| `actions` | [Action](#acciones-actions)[] | no | `[]` | Peticiones predefinidas para el constructor REST. |

### LocalizedText

```json
{ "es": "Texto en español", "en": "English text" }
```

Ambas claves son obligatorias y no pueden estar vacías.

### Campos (`fields`)

Cada campo se convierte en un input del diálogo "Conectar".

| Propiedad | Tipo | Obligatoria | Por defecto | Descripción |
| --- | --- | --- | --- | --- |
| `key` | string | sí | | Identificador al que hacen referencia `auth` y `baseUrl`. Patrón `^[a-zA-Z][a-zA-Z0-9_]*$`. |
| `label` | LocalizedText | sí | | Etiqueta del input. |
| `type` | `"text"` \| `"secret"` \| `"url"` \| `"select"` | sí | | Consulta la tabla de abajo. |
| `required` | boolean | no | **`true`** | Si el valor es obligatorio. Pon `false` de forma explícita en los campos opcionales. |
| `default` | string | no | | Valor por defecto. Se usa si el input queda vacío y, al hacer peticiones, si no hay valor guardado. |
| `placeholder` | string | no | | Texto de ejemplo del input (sin traducir). |
| `help` | LocalizedText | no | | Texto de ayuda debajo del input. |
| `options` | `{ value: string, label: string }[]` | no | | Opciones para `select`. El valor enviado debe coincidir con algún `value`. |

| `type` | Se guarda como | Validación en el servidor |
| --- | --- | --- |
| `text` | Configuración en claro (visible en la API) | ninguna |
| `secret` | **Cifrado** (AES-256-GCM) y nunca se devuelve. Al editar, un valor vacío conserva el secreto guardado. | ninguna |
| `url` | Configuración en claro | Debe ser una URL `http:` o `https:` válida |
| `select` | Configuración en claro | Debe ser uno de los `options[].value` (si hay `options`) |

Los valores se recortan (trim). Si falta un valor obligatorio, la respuesta es `400 Field "<key>" is required`.

### Tipos de autenticación

`auth` es una unión discriminada por `type`. Cada propiedad `*Field` debe nombrar un `key` declarado en `fields`.

| `type` | Propiedades | Qué envía el servidor |
| --- | --- | --- |
| `none` | | Nada |
| `bearer` | `field` | `Authorization: Bearer <valor>` |
| `header` | `field`, y además `header` (nombre fijo) o `headerField` (campo con el nombre), `prefix` opcional | `<header>: <prefix><valor>` |
| `query` | `param`, `field` | `?<param>=<valor>` en la URL |
| `basic` | `usernameField`, `passwordField` | `Authorization: Basic base64(usuario:contraseña)` |

Si el valor de la credencial está vacío, no se agrega autenticación (útil para claves opcionales).

```jsonc
// Token Bearer
"auth": { "type": "bearer", "field": "apiKey" }

// Encabezado con nombre fijo (Anthropic, Gemini, Azure)
"auth": { "type": "header", "header": "x-api-key", "field": "apiKey" }

// Encabezado con prefijo
"auth": { "type": "header", "header": "Authorization", "prefix": "Token ", "field": "apiKey" }

// Nombre del encabezado elegido por la persona usuaria (REST personalizado)
"auth": { "type": "header", "headerField": "authHeader", "field": "authValue" }

// Parámetro de query
"auth": { "type": "query", "param": "api_key", "field": "apiKey" }

// HTTP Basic
"auth": { "type": "basic", "usernameField": "username", "passwordField": "password" }
```

En los registros se reemplazan por `***` las credenciales enviadas por query y cualquier parámetro llamado `key`, `api_key`, `api-key`, `apikey`, `token`, `access_token`, `access-token` o `secret`.

### Test

```json
"test": { "method": "GET", "path": "/v1/balance", "expectStatus": 200 }
```

| Propiedad | Tipo | Obligatoria | Por defecto |
| --- | --- | --- | --- |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` | no | `GET` |
| `path` | string que empieza con `/` | sí | |
| `expectStatus` | entero | no | |

### Models

```json
"models": { "listable": true, "suggested": ["modelo-a", "modelo-b"] }
```

| Propiedad | Tipo | Por defecto | Descripción |
| --- | --- | --- | --- |
| `listable` | boolean | `true` | Si el proveedor tiene un endpoint para listar modelos. |
| `suggested` | string[] | `[]` | Modelos que se muestran si el listado está desactivado o no devuelve nada. "Probar conexión" usa el primero cuando `listable` es `false`. |

Omitir `models` equivale a `listable: true` sin sugerencias.

### Acciones (`actions`)

Peticiones predefinidas del constructor REST. Al elegir una se llenan el método, la ruta y el cuerpo.

| Propiedad | Tipo | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `id` | slug | sí | `^[a-z0-9][a-z0-9-]*$` |
| `name` | LocalizedText | sí | Etiqueta en el selector de acciones |
| `method` | `GET` \| `POST` \| `PUT` \| `PATCH` \| `DELETE` | sí | |
| `path` | string que empieza con `/` | sí | Puede incluir query, por ejemplo `/user/repos?per_page=30` |
| `description` | LocalizedText | no | |
| `sampleBody` | cualquier JSON | no | Cuerpo precargado (con formato) |

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

## Tipos (`kind`)

El `kind` decide qué adaptador del servidor maneja la conexión. Las rutas se agregan al final de la `baseUrl` resuelta.

### `ai-openai-compatible`

Para cualquier API que implemente Chat Completions de OpenAI (OpenAI, Groq, Mistral, OpenRouter, Ollama, vLLM y muchas más). **La `baseUrl` debe incluir el prefijo de versión** (por ejemplo `https://api.openai.com/v1`).

| Operación | Petición |
| --- | --- |
| Listar modelos | `GET {baseUrl}/models` y lee `data[].id` (ordenados) |
| Chat | `POST {baseUrl}/chat/completions` con `{ model, messages, stream: true, temperature, max_tokens }`. El prompt de sistema se envía como un primer mensaje `system`. Lee `choices[0].delta.content` del SSE hasta `[DONE]`. |

### `ai-anthropic`

Para la API Messages de Anthropic. La `baseUrl` va **sin** prefijo de versión (`https://api.anthropic.com`). Normalmente usa auth `header` con `x-api-key` y `defaultHeaders: { "anthropic-version": "2023-06-01" }`.

| Operación | Petición |
| --- | --- |
| Listar modelos | `GET {baseUrl}/v1/models?limit=1000` y lee `data[].id` |
| Chat | `POST {baseUrl}/v1/messages` con `{ model, max_tokens (4096 por defecto), system, messages, temperature, stream: true }`. Lee los eventos `content_block_delta` / `text_delta` hasta `message_stop`. |

### `ai-gemini`

Para la API de Google Gemini. La `baseUrl` va **sin** prefijo de versión (`https://generativelanguage.googleapis.com`). Normalmente usa auth `header` con `x-goog-api-key`.

| Operación | Petición |
| --- | --- |
| Listar modelos | `GET {baseUrl}/v1beta/models?pageSize=1000` y conserva los modelos cuyo `supportedGenerationMethods` incluye `generateContent` (quita `models/` y los ordena) |
| Chat | `POST {baseUrl}/v1beta/models/{model}:streamGenerateContent?alt=sse` con `contents` (`assistant` pasa a `model`), `systemInstruction` y `generationConfig { temperature, maxOutputTokens }`. |

### `rest`

API REST genérica. No tiene chat ni listado de modelos (`GET /api/connections/:id/models` responde `400`). Las peticiones se arman en el constructor REST (`POST /api/connections/:id/request`) como `{baseUrl}{path}`, con los encabezados por defecto y la autenticación del conector.

- Si envías cuerpo y no hay encabezado `content-type`, se agrega `application/json` automáticamente. En `GET` el cuerpo se ignora.
- Los cuerpos de respuesta se recortan a 2 MB y se ocultan los encabezados `set-cookie`.

> El endpoint del constructor REST funciona con cualquier conexión, pero la interfaz solo lo muestra para conectores con `category: "api"`.

## Plantillas en `baseUrl`

`baseUrl` puede usar valores de campos con `{{claveCampo}}` (letras, números y `_`):

```json
"baseUrl": "https://{{resourceName}}.openai.azure.com/openai/v1"
```

```json
"baseUrl": "{{baseUrl}}"
```

Al hacer una petición:

1. Los valores salen de la configuración guardada y de los secretos descifrados, con el `default` de cada campo como respaldo.
2. Se reemplaza cada marcador. Si un valor falta o está vacío, falla con `Missing value for "<key>"`.
3. Se eliminan las barras finales, y el resultado debe ser una URL `http` o `https` válida (`Invalid base URL` / `Base URL must use http or https`).

## Revisión de referencias

Además del esquema, el registro rechaza un manifiesto cuando:

- `auth.field`, `auth.headerField`, `auth.usernameField`, `auth.passwordField` o algún `{{marcador}}` de `baseUrl` nombran un `key` no declarado (`Undeclared fields referenced: ...`).
- `auth.type` es `header` y no tiene `header` ni `headerField`.

## Cómo funciona "Probar conexión"

`POST /api/connections/:id/test` aplica la primera regla que coincide (consulta `ConnectionService.test()` en `packages/server/src/services.ts`):

| # | Condición | Qué hace | Es exitosa si |
| --- | --- | --- | --- |
| 1 | Hay `test` (cualquier tipo) | Envía `test.method test.path` (sin cuerpo) | `status === expectStatus` si está definido, o cualquier 2xx |
| 2 | Tipo de IA y `models.listable !== false` | Lista los modelos | El listado responde 2xx. Mensaje: `N models` |
| 3 | Tipo de IA y `models.listable === false` | Envía un chat real a `models.suggested[0]` con el mensaje `ping` y `maxTokens: 1` (**puede consumir una cantidad mínima de créditos**) | La petición responde 2xx. Si `suggested` está vacío, falla con `No model available to test this connection` |
| 4 | `rest` sin `test` | `GET {baseUrl}/` | Cualquier estado menor a 500 |

El resultado (`ok`, `status`, `durationMs`, `message`) se guarda como última prueba de la conexión y queda en los registros. En APIs REST define siempre un `test` contra un endpoint autenticado. Si no, una clave incorrecta podría "pasar" la regla 4.

Tiempos límite: 60 segundos para pruebas, listado de modelos y peticiones REST, y 300 segundos para el chat.

## Ejemplo completo: proveedor compatible con OpenAI

`connectors/ai/acme-ai.json`, para un proveedor hipotético con API compatible con OpenAI en `https://api.acme.ai/v1`, endpoint regional y endpoint de modelos:

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

Lo que hace Enlazia con este archivo:

- **Conectar:** pide Región (`us` por defecto) y la clave de API (cifrada).
- **Probar:** `GET https://us.api.acme.ai/v1/models` con `Authorization: Bearer ...`.
- **Playground:** `POST https://us.api.acme.ai/v1/chat/completions` con streaming.

Si el proveedor no tuviera endpoint `/models`, usa `"listable": false` y agrega al menos un modelo en `suggested`.

## Ejemplo completo: API REST

`connectors/api/acme-crm.json`, para un CRM hipotético que usa el encabezado `X-Api-Key` y un encabezado de versión:

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

- **Probar:** `GET https://api.acmecrm.com/v2/me` debe responder exactamente `200`.
- **Constructor REST:** las acciones "Contactos" y "Crear contacto" precargan la petición, y luego se pueden editar el método, la ruta, la query, los encabezados y el cuerpo.

## Checklist para PR de conectores nuevos

- [ ] El archivo está en `connectors/ai/` o `connectors/api/`, se llama `<id>.json` y tiene `$schema`.
- [ ] `category` corresponde al `kind` (`ai` con `ai-*`, `api` con `rest`).
- [ ] La URL base, el esquema de autenticación y los endpoints de modelos y de prueba están **verificados en la documentación oficial** del proveedor (no en blogs ni de memoria).
- [ ] Los IDs de `suggested` están vigentes según la documentación oficial.
- [ ] Si no hay endpoint de modelos documentado, se usa `listable: false`.
- [ ] Los conectores REST definen un `test` contra un endpoint que exige autenticación.
- [ ] Las acciones son de solo lectura o claramente inofensivas.
- [ ] Los textos en `es` y `en` son naturales y correctos.
- [ ] Agregaste una sección en [`connectors/SOURCES.md`](../connectors/SOURCES.md) con los enlaces revisados.
- [ ] `pnpm test` pasa.
- [ ] Si es posible, lo probaste con una credencial real (prueba, modelos y una petición o chat).
