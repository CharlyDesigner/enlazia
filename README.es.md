<p align="center">
  <img src="brand/enlazia-icon.svg" width="96" alt="Enlazia">
</p>

<h1 align="center">Enlazia</h1>

<p align="center">Conecta proveedores de IA y APIs de terceros desde un solo lugar, en tu propio servidor.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-Apache--2.0-blue.svg" alt="Licencia: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22.13-339933.svg?logo=node.js&logoColor=white" alt="Node >= 22.13">
</p>

<p align="center"><a href="README.md">English</a> · <strong>Español</strong></p>

---

## Qué es

Enlazia es una plataforma web de código abierto y bilingüe (español / inglés) para conectar proveedores de IA y APIs REST. Registras tus credenciales una sola vez, Enlazia las guarda cifradas en tu servidor y desde el navegador puedes probar conexiones, chatear con modelos y lanzar peticiones REST. Tus API keys nunca vuelven al navegador.

Los conectores son manifiestos JSON, así que agregar un proveedor o una API normalmente consiste en escribir un archivo JSON, sin tocar código.

Landing con toda la información del proyecto (ES/EN): https://enlazia.carlosnavarro.site

## Funcionalidades

- **Catálogo con 22 conectores de IA** listos para usar: OpenAI, Anthropic, Google Gemini, Azure OpenAI, DeepSeek, Groq, Mistral AI, xAI Grok, OpenRouter, Together AI, Fireworks AI, Perplexity, Cerebras, Moonshot AI (Kimi), Qwen (Alibaba Cloud), Z.ai (GLM), Cohere, NVIDIA NIM, Hugging Face, Ollama, LM Studio y un conector genérico compatible con OpenAI (vLLM, LiteLLM, etc.).
- **Conectores REST**: GitHub, Notion, Stripe y un conector genérico para cualquier API REST.
- **Bóveda cifrada**: los secretos se guardan cifrados con AES-256-GCM y la API nunca los devuelve.
- **Playground con streaming**: chatea con cualquier modelo configurado (prompt de sistema y temperatura), con respuesta en tiempo real por Server-Sent Events.
- **Constructor de peticiones REST**: método, ruta y cuerpo JSON, con acciones predefinidas por conector.
- **Prueba de conexión y listado de modelos** en cada conector.
- **Registros de peticiones**: método, URL sin credenciales, estado, duración y errores de cada llamada saliente, además de estadísticas de las últimas 24 horas.
- **Interfaz bilingüe** (es / en, detectada según el navegador) con **tema oscuro, claro o del sistema**.
- **SDK de conectores en JSON**: basta con poner un manifiesto en `connectors/` o en tu carpeta de datos. Incluye un JSON Schema para autocompletado en el editor.
- **Protección con contraseña opcional**, con cookie de sesión firmada HttpOnly y límite de intentos de inicio de sesión.
- **Modo demo** para instancias públicas de solo lectura.
- **Fácil de alojar**: el servidor se empaqueta en un solo archivo, así que funciona en hosting compartido con cPanel, sin Docker ni acceso root.

## Inicio rápido

Requisitos:

- Node.js **22.13 o superior** (Enlazia usa el módulo integrado `node:sqlite`)
- pnpm 11 (`corepack enable` lo instala según `packageManager`)

```bash
git clone https://github.com/CharlyDesigner/enlazia.git
cd enlazia
pnpm install
cp .env.example .env
pnpm dev
```

`pnpm dev` levanta la API en http://127.0.0.1:8787 (con `tsx watch`) y el servidor de Vite en http://localhost:5173, que redirige `/api` a la API. Abre http://localhost:5173.

Otros scripts:

| Comando | Qué hace |
| --- | --- |
| `pnpm build` | Genera el JSON Schema de conectores, empaqueta el servidor en `packages/server/dist/server.cjs` y compila la interfaz en `apps/web/dist` |
| `pnpm start` | Ejecuta `node app.cjs`: API e interfaz compilada en el puerto 8787 |
| `pnpm test` | Corre las pruebas con Vitest (incluye la validación de todos los conectores incluidos) |
| `pnpm typecheck` | Revisa los tipos de todos los paquetes |

## Producción

```bash
pnpm install
pnpm build
pnpm start
```

El servidor lee `.env` desde la raíz del proyecto si existe. Si no, usa las variables de entorno del sistema.

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `8787` | Puerto HTTP. En cPanel/Passenger lo asigna el servidor. |
| `HOST` | `127.0.0.1` | Dirección de escucha. Con `0.0.0.0` escucha en todas las interfaces, y en ese caso la contraseña es obligatoria. |
| `ENLAZIA_DATA_DIR` | `./data` | Carpeta de la base SQLite, la llave maestra generada y los conectores propios. Las rutas relativas se resuelven desde la raíz del proyecto. |
| `ENLAZIA_PASSWORD` | _(vacío)_ | Contraseña de acceso. **Obligatoria** si la instancia es accesible desde la red. |
| `ENLAZIA_MASTER_KEY` | _(vacío)_ | Llave de 32 bytes en base64 para cifrar credenciales. Si está vacía, se genera en `ENLAZIA_DATA_DIR/.master-key`. Genera una con `openssl rand -base64 32`. |
| `ENLAZIA_DEMO` | `false` | Modo demo público: solo catálogo y documentación. Crear, probar y usar conexiones queda desactivado. |

> [!IMPORTANT]
> **Respalda tu llave maestra.** Si pierdes `ENLAZIA_MASTER_KEY` o `data/.master-key`, las credenciales guardadas ya no se pueden descifrar.
>
> El servidor **no arranca** sin `ENLAZIA_PASSWORD` cuando escucha en una dirección que no es loopback o cuando corre bajo Phusion Passenger, salvo que `ENLAZIA_DEMO=true`.

En un VPS, ejecuta `pnpm start` con un gestor de procesos (systemd, pm2, etc.) y pon delante un proxy inverso con HTTPS (Caddy, Nginx, Apache). Desactiva el buffering de respuestas en `/api/ai/chat` para que el streaming funcione.

## Despliegue en cPanel

Enlazia corre en hosting compartido con "Setup Node.js App" de cPanel (Phusion Passenger). El servidor es un solo archivo empaquetado, así que no necesitas Docker, acceso root ni `npm install` en el hosting:

1. Compila en tu equipo con `pnpm build`.
2. Sube `app.cjs`, `package.json`, `packages/server/dist/`, `apps/web/dist/`, `connectors/` y `schemas/`.
3. Crea la app en cPanel con `app.cjs` como archivo de inicio y define `ENLAZIA_PASSWORD` (o `ENLAZIA_DEMO=true`) y `ENLAZIA_MASTER_KEY`.
4. Reinicia con `touch tmp/restart.txt`.

También puedes desplegar automáticamente con GitHub Actions por SSH. La guía completa está en [docs/deploy-cpanel.md](docs/deploy-cpanel.md).

## Agregar un conector

Crea un archivo JSON, por ejemplo `connectors/ai/mi-proveedor.json`:

```json
{
  "$schema": "../../schemas/connector.schema.json",
  "id": "mi-proveedor",
  "name": "Mi Proveedor",
  "category": "ai",
  "kind": "ai-openai-compatible",
  "description": { "es": "Modelos de Mi Proveedor.", "en": "Mi Proveedor models." },
  "baseUrl": "https://api.mi-proveedor.com/v1",
  "auth": { "type": "bearer", "field": "apiKey" },
  "fields": [
    { "key": "apiKey", "label": { "es": "Clave de API", "en": "API key" }, "type": "secret" }
  ]
}
```

Ejecuta `pnpm test` para validarlo y reinicia el servidor. Los conectores privados también pueden ir en `<ENLAZIA_DATA_DIR>/connectors/`, y reemplazan a los incluidos que tengan el mismo `id`. La referencia completa está en [docs/connectors.es.md](docs/connectors.es.md).

## Estructura del proyecto

```
enlazia/
├── app.cjs                  # Punto de entrada de producción / Passenger
├── apps/
│   └── web/                 # Interfaz React 19 + Vite 8 + Tailwind 4
│       └── src/
│           ├── i18n.tsx     # Todos los textos de la interfaz (es + en)
│           ├── pages/       # Inicio, Catálogo, Conexiones, Playground, Registros, Ajustes
│           └── components/
├── packages/
│   ├── shared/              # Esquemas zod y tipos compartidos entre servidor e interfaz
│   │   ├── src/manifest.ts  # Esquema del manifiesto de conectores
│   │   └── src/api.ts       # Tipos de peticiones y respuestas de la API
│   └── server/              # API con Hono, empaquetada con esbuild
│       ├── src/adapters/    # Adaptadores compatibles con OpenAI, Anthropic y Gemini
│       └── test/
├── connectors/
│   ├── ai/                  # Conectores de IA incluidos
│   ├── api/                 # Conectores REST incluidos
│   └── SOURCES.md           # Documentación oficial revisada por conector
├── schemas/                 # connector.schema.json (generado)
├── brand/                   # Logo e ícono
└── docs/                    # Guías
```

Más detalle en [docs/architecture.md](docs/architecture.md) (en inglés).

## Hoja de ruta

- Cliente MCP (conectar y administrar servidores Model Context Protocol)
- Importador de OpenAPI para generar conectores REST
- Más tipos de autenticación, incluido OAuth 2.0
- Modelos de imagen y audio
- Múltiples usuarios
- Versión de escritorio

Las ideas y propuestas son bienvenidas en los [issues](https://github.com/CharlyDesigner/enlazia/issues).

## Contribuir

Las contribuciones son bienvenidas, sobre todo conectores nuevos. Lee [CONTRIBUTING.md](CONTRIBUTING.md) y el [Código de Conducta](CODE_OF_CONDUCT.md).

## Seguridad

No reportes vulnerabilidades en issues públicos. Consulta [SECURITY.md](SECURITY.md).

## Licencia

[Licencia Apache 2.0](LICENSE). © 2026 Charly Designer.

## Créditos

Creado por [Charly Designer](https://carlosnavarro.site) · [GitHub](https://github.com/CharlyDesigner).

Enlazia es un proyecto independiente. Algunas ideas (presets de proveedores, extensiones basadas en manifiestos, administración unificada de MCP) se inspiraron en [AionUi](https://github.com/iOfficeAI/AionUi) (Apache-2.0). No se incluye código fuente ni recursos de marca de AionUi. Consulta [NOTICE](NOTICE).
