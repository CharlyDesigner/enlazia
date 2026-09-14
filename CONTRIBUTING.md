# Contribuir a Enlazia / Contributing to Enlazia

- [Español](#español)
- [English](#english)

---

## Español

¡Gracias por tu interés en Enlazia! Toda ayuda cuenta: reportar errores, proponer ideas, mejorar la documentación, traducir o agregar conectores.

Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md). Para vulnerabilidades de seguridad, sigue [SECURITY.md](SECURITY.md) y no abras un issue público.

### Entorno de desarrollo

Requisitos: Node.js 22.13 o superior y pnpm 11 (`corepack enable`).

```bash
git clone https://github.com/<tu-usuario>/enlazia.git
cd enlazia
pnpm install
cp .env.example .env
pnpm dev
```

- API: http://127.0.0.1:8787 (se recarga con `tsx watch`)
- Interfaz: http://localhost:5173 (Vite, redirige `/api` a la API)

| Comando | Uso |
| --- | --- |
| `pnpm typecheck` | Revisión de tipos en todos los paquetes |
| `pnpm test` | Pruebas con Vitest |
| `pnpm build` | Genera el schema, empaqueta el servidor y compila la interfaz |
| `pnpm --filter @enlazia/shared schema` | Regenera `schemas/connector.schema.json` |

### Ramas

Crea una rama desde `main` con un prefijo según el tipo de cambio:

| Prefijo | Uso | Ejemplo |
| --- | --- | --- |
| `feat/` | Funcionalidad nueva | `feat/oauth2-auth` |
| `fix/` | Corrección de errores | `fix/sse-parsing` |
| `connector/` | Conector nuevo o actualizado | `connector/replicate` |
| `docs/` | Documentación | `docs/deploy-vps` |
| `refactor/`, `test/`, `chore/` | Mantenimiento | `chore/update-deps` |

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```
feat(server): add OAuth2 client credentials auth
fix(web): keep chat scroll pinned while streaming
feat(connectors): add Replicate
docs: explain SSE buffering on Apache
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Ámbitos sugeridos: `server`, `web`, `shared`, `connectors`, `docs`.

### Checklist del pull request

Antes de abrir el PR:

- [ ] `pnpm typecheck` pasa sin errores.
- [ ] `pnpm test` pasa.
- [ ] `pnpm build` termina correctamente.
- [ ] **i18n:** cada texto nuevo de la interfaz existe en `es` **y** en `en` dentro de `apps/web/src/i18n.tsx`. No hay textos escritos directamente en los componentes.
- [ ] Si cambiaste `packages/shared/src/manifest.ts`, regeneraste el schema y actualizaste `docs/connectors.md` y `docs/connectors.es.md`.
- [ ] Nada de secretos, claves reales ni datos personales en el código, capturas o logs.
- [ ] Actualizaste `CHANGELOG.md` en la sección "Unreleased" si el cambio es visible para usuarios.

Mantén los PR pequeños y enfocados, y explica el "por qué" en la descripción.

### Agregar un conector

1. Crea `connectors/ai/<id>.json` o `connectors/api/<id>.json` siguiendo la [referencia de conectores](docs/connectors.es.md).
2. Verifica en la **documentación oficial** del proveedor la URL base, la autenticación y los endpoints de modelos o de prueba.
3. Agrega una sección en `connectors/SOURCES.md` con los enlaces que revisaste.
4. Ejecuta `pnpm test`. La prueba del registro carga **todos** los conectores incluidos y falla si alguno no cumple el esquema o referencia campos no declarados.
5. Si puedes, pruébalo con `pnpm dev` y una credencial real: "Probar conexión", listado de modelos y un mensaje en el Playground.

### Estilo de código

- TypeScript en modo `strict`. **No uses `any`**. Prefiere `unknown` con validación (zod) o tipos precisos.
- Valida con zod en `packages/shared` todo lo que llega del exterior (cuerpos de peticiones, manifiestos).
- Los secretos nunca deben salir del servidor ni aparecer en logs.
- Respeta `.editorconfig`. Usa nombres descriptivos y funciones pequeñas, y comenta el "por qué" en lugar del "qué".
- Evita agregar dependencias sin discutirlo antes: el servidor debe seguir empaquetándose en un solo archivo.

---

## English

Thanks for your interest in Enlazia! Every contribution helps: bug reports, ideas, docs, translations and new connectors.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

### Development setup

Requirements: Node.js 22.13 or newer and pnpm 11 (`corepack enable`).

```bash
git clone https://github.com/<your-user>/enlazia.git
cd enlazia
pnpm install
cp .env.example .env
pnpm dev
```

- API: http://127.0.0.1:8787 (reloads with `tsx watch`)
- UI: http://localhost:5173 (Vite, proxies `/api` to the API)

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | Type-check every package |
| `pnpm test` | Vitest suites |
| `pnpm build` | Generate the schema, bundle the server, build the UI |
| `pnpm --filter @enlazia/shared schema` | Regenerate `schemas/connector.schema.json` |

### Branches

Branch off `main` with a prefix that describes the change:

| Prefix | Use | Example |
| --- | --- | --- |
| `feat/` | New feature | `feat/oauth2-auth` |
| `fix/` | Bug fix | `fix/sse-parsing` |
| `connector/` | New or updated connector | `connector/replicate` |
| `docs/` | Documentation | `docs/deploy-vps` |
| `refactor/`, `test/`, `chore/` | Maintenance | `chore/update-deps` |

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
feat(server): add OAuth2 client credentials auth
fix(web): keep chat scroll pinned while streaming
feat(connectors): add Replicate
docs: explain SSE buffering on Apache
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Suggested scopes: `server`, `web`, `shared`, `connectors`, `docs`.

### Pull request checklist

Before opening a PR:

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` succeeds.
- [ ] **i18n:** every new UI string exists in both `es` **and** `en` in `apps/web/src/i18n.tsx`. No hard-coded strings in components.
- [ ] If you changed `packages/shared/src/manifest.ts`, you regenerated the schema and updated `docs/connectors.md` and `docs/connectors.es.md`.
- [ ] No secrets, real keys or personal data in code, screenshots or logs.
- [ ] `CHANGELOG.md` is updated under "Unreleased" for user-visible changes.

Keep PRs small and focused, and explain the "why" in the description.

### Adding a connector

1. Create `connectors/ai/<id>.json` or `connectors/api/<id>.json` following the [connector reference](docs/connectors.md).
2. Check the provider's **official documentation** for the base URL, authentication and the model listing or test endpoints.
3. Add a section to `connectors/SOURCES.md` with the links you checked.
4. Run `pnpm test`. The registry test loads **every** bundled connector and fails if any of them breaks the schema or references undeclared fields.
5. If you can, try it with `pnpm dev` and a real credential: "Test connection", model listing, and one Playground message.

### Code style

- TypeScript `strict` mode. **No `any`**. Use `unknown` plus validation (zod), or precise types.
- Validate everything coming from outside (request bodies, manifests) with zod in `packages/shared`.
- Secrets must never leave the server or appear in logs.
- Follow `.editorconfig`. Use descriptive names and small functions, and write comments that explain "why", not "what".
- Talk to maintainers before adding dependencies: the server must keep bundling into a single file.
