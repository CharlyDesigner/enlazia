# Despliegue en cPanel (Setup Node.js App)

Esta guía explica cómo publicar Enlazia en un hosting compartido con cPanel y la herramienta **Setup Node.js App** (Phusion Passenger), por ejemplo un plan de reseller de InMotion Hosting. No necesitas Docker ni acceso root: el servidor se empaqueta en un solo archivo (`packages/server/dist/server.cjs`), así que **no hace falta ejecutar `npm install` en el hosting**.

> English summary at the [end of this document](#english-summary).

## Requisitos

- cPanel con **Setup Node.js App** y **Node.js 22.13 o superior** disponible (Enlazia usa `node:sqlite`, que no existe en versiones anteriores).
- Acceso por **SFTP** o **SSH** (necesario para la GitHub Action).
- Node.js 22.13+ y pnpm 11 en tu equipo, para compilar.
- Un dominio o subdominio, por ejemplo `enlazia.tudominio.com`.

## 1. Compilar en tu equipo

```bash
pnpm install
pnpm build
```

Esto genera:

| Ruta | Contenido |
| --- | --- |
| `packages/server/dist/` | Servidor empaquetado (`server.cjs`) |
| `apps/web/dist/` | Interfaz compilada |
| `schemas/connector.schema.json` | JSON Schema de conectores |

## 2. Preparar el subdominio

### Crear el subdominio en cPanel

En **cPanel > Dominios** (o **Subdominios**), crea `enlazia.tudominio.com`. cPanel te propone una carpeta raíz de documentos: **no uses esa carpeta para la app**. La aplicación va en una carpeta aparte, fuera de `public_html`, por ejemplo `/home/usuario/enlazia`.

### Registro DNS cuando el dominio usa otros DNS

Si los DNS de tu dominio están en otro proveedor (Cloudflare, tu registrador, etc.), crea allí un **registro A**:

| Tipo | Nombre | Valor | TTL |
| --- | --- | --- | --- |
| A | `enlazia` | IP del servidor del hosting | Automático / 3600 |

Encuentras la IP en cPanel, en el panel lateral **Información general > Dirección IP compartida** (o la dedicada, si tienes una). Si usas Cloudflare, deja el proxy (nube naranja) **desactivado** hasta que AutoSSL emita el certificado.

Comprueba la propagación con:

```bash
nslookup enlazia.tudominio.com
```

### Certificado SSL (AutoSSL)

En **cPanel > SSL/TLS Status**, selecciona el subdominio y pulsa **Run AutoSSL**. Espera a que aparezca con un candado verde antes de continuar. Enlazia necesita HTTPS para que la cookie de sesión se marque como `Secure`.

## 3. Crear la aplicación Node.js

En **cPanel > Setup Node.js App > Create Application**:

| Campo | Valor |
| --- | --- |
| **Node.js version** | 22.13 o superior (elige la más reciente disponible, por ejemplo 24.x) |
| **Application mode** | Production |
| **Application root** | `enlazia` (queda en `/home/usuario/enlazia`) |
| **Application URL** | `enlazia.tudominio.com` |
| **Application startup file** | `app.cjs` |

No pulses **Run NPM Install**: no hace falta.

### Variables de entorno

En la misma pantalla, en **Environment variables**, agrega:

| Variable | Valor | Notas |
| --- | --- | --- |
| `ENLAZIA_PASSWORD` | una contraseña larga y única | **Obligatoria** para una instancia privada. |
| `ENLAZIA_MASTER_KEY` | resultado de `openssl rand -base64 32` | Cifra las credenciales. **Guárdala en un gestor de contraseñas.** |
| `ENLAZIA_DEMO` | `true` | **Solo** para una demo pública de solo lectura. En ese caso `ENLAZIA_PASSWORD` es opcional. |
| `ENLAZIA_DATA_DIR` | `data` (opcional) | Carpeta de la base de datos, relativa a la raíz de la app. |

No definas `PORT` ni `HOST`: Passenger se encarga de eso.

Genera la llave maestra en tu equipo o por SSH:

```bash
openssl rand -base64 32
```

> [!IMPORTANT]
> Si pierdes o cambias `ENLAZIA_MASTER_KEY`, las credenciales ya guardadas **no se pueden descifrar** y tendrás que volver a capturarlas. Si no la defines, Enlazia genera `data/.master-key` dentro de la app: en ese caso respalda ese archivo.

Guarda la aplicación. Todavía no funcionará, porque falta subir los archivos.

## 4. Subir los archivos

Sube a la **raíz de la aplicación** (`/home/usuario/enlazia`) esta estructura:

```
enlazia/
├── app.cjs
├── package.json
├── connectors/
├── schemas/
├── packages/
│   └── server/
│       └── dist/
└── apps/
    └── web/
        └── dist/
```

**No subas** `node_modules/`, `.env` con secretos de desarrollo ni tu carpeta local `data/`. En el servidor, Enlazia crea `data/` automáticamente (base SQLite, llave generada y `data/connectors/` para conectores propios).

### Opción A: SFTP

Con FileZilla, WinSCP o similar, conéctate con tu usuario de cPanel y copia las carpetas de la tabla anterior. Si reemplazas una versión anterior, **no borres `data/`**.

### Opción B: Git

Si tu hosting tiene **cPanel > Git Version Control**, puedes clonar el repositorio. Ten en cuenta que las carpetas `dist/` no están en git: tendrías que compilar en el servidor (lo que requiere pnpm y `node_modules`) o subirlas por SFTP. Para hosting compartido, las opciones A o C suelen ser más simples.

### Opción C: GitHub Actions (SSH + rsync)

El repositorio incluye el workflow `.github/workflows/deploy-cpanel.yml`, que compila el proyecto y sube los archivos por SSH con rsync.

**1. Crea un par de llaves SSH solo para el despliegue** (en tu equipo):

```bash
ssh-keygen -t rsa -b 4096 -C "enlazia-deploy" -f enlazia-deploy -N ""
```

Usamos RSA de 4096 bits porque todas las versiones de cPanel lo aceptan al importar. La llave queda sin frase de acceso (`-N ""`), porque GitHub Actions no puede escribirla.

Esto crea `enlazia-deploy` (privada) y `enlazia-deploy.pub` (pública).

**2. Autoriza la llave pública en cPanel:**

1. Ve a **cPanel > SSH Access > Manage SSH Keys > Import Key**.
2. Pega el contenido de `enlazia-deploy.pub` y guarda.
3. En la lista **Public Keys**, pulsa **Manage** junto a la llave y luego **Authorize**.

Si no ves "SSH Access", pide a tu proveedor que habilite el acceso SSH en tu cuenta.

**3. Agrega los secretos en GitHub.** En tu repositorio: **Settings > Secrets and variables > Actions > New repository secret**. Agrégalos tú mismo; nunca compartas la llave privada con nadie.

| Secreto | Valor | Ejemplo |
| --- | --- | --- |
| `CPANEL_HOST` | Host o IP del servidor | `server123.hosting.com` |
| `CPANEL_USER` | Usuario de cPanel | `usuario` |
| `CPANEL_SSH_KEY` | Contenido **completo** de la llave privada `enlazia-deploy` (incluyendo las líneas `BEGIN` y `END`) | |
| `CPANEL_APP_PATH` | Ruta absoluta de la raíz de la app | `/home/usuario/enlazia` |
| `CPANEL_SSH_PORT` | Puerto SSH (opcional, por defecto 22). En hosting compartido y reseller de InMotion es **2222** | `2222` |

Después de guardarla en GitHub, borra la llave privada de tu equipo o guárdala en un lugar seguro.

**4. Ejecuta el workflow** desde la pestaña **Actions** (o con cada push, según esté configurado). Al terminar, el workflow reinicia la app con `touch tmp/restart.txt`.

> [!WARNING]
> Si modificas el workflow para usar `rsync --delete`, excluye `data/` y `tmp/`. Si no, perderás la base de datos y la llave maestra generada.

## 5. Reiniciar la aplicación

Después de cada subida hay que reiniciar Passenger. Tienes dos formas:

- En **Setup Node.js App**, pulsa **Restart** en tu aplicación.
- Por SSH:

```bash
mkdir -p ~/enlazia/tmp && touch ~/enlazia/tmp/restart.txt
```

Abre `https://enlazia.tudominio.com`. Deberías ver la pantalla de inicio de sesión (o la demo, si usaste `ENLAZIA_DEMO=true`). Para una prueba rápida, abre `https://enlazia.tudominio.com/api/health`: debe responder `{"ok":true}`.

## Actualizar a una nueva versión

1. `git pull` y `pnpm install && pnpm build` en tu equipo (o deja que lo haga la GitHub Action).
2. Sube de nuevo `app.cjs`, `package.json`, `packages/server/dist/`, `apps/web/dist/`, `connectors/` y `schemas/`, sin tocar `data/`.
3. Reinicia con `touch tmp/restart.txt`.

## Solución de problemas

### Dónde ver los errores

Passenger guarda la salida de error de la app en **`stderr.log` dentro de la raíz de la aplicación** (`/home/usuario/enlazia/stderr.log`). Revísalo primero ante cualquier falla. Según la configuración del hosting, también puede aparecer en el registro de errores de Apache (**cPanel > Errors**).

### La página responde 503 o "Web application could not be started"

Passenger no pudo iniciar la app. Revisa `stderr.log`. Las causas más comunes son:

- Faltan archivos: comprueba que existan `app.cjs` y `packages/server/dist/server.cjs`.
- El archivo de inicio no es `app.cjs`.
- Alguna de las causas de abajo.

### `No such built-in module: node:sqlite`

La versión de Node.js es demasiado antigua. En **Setup Node.js App**, cambia la versión a **22.13 o superior**, guarda y reinicia. Si tu hosting no ofrece esa versión, pide a tu proveedor que la habilite.

Un aviso `ExperimentalWarning: SQLite is an experimental feature` en el log es normal y no impide que la app funcione.

### `Refusing to start: this instance is reachable from the network without ENLAZIA_PASSWORD`

Es una protección intencional: bajo Passenger, Enlazia no arranca sin contraseña. Define `ENLAZIA_PASSWORD` (o `ENLAZIA_DEMO=true` para una demo pública) en las variables de entorno de la app y reinicia.

### `ENLAZIA_MASTER_KEY must be 32 bytes encoded in base64`

El valor no es una llave válida. Genera una nueva con `openssl rand -base64 32` y pégala completa, sin espacios ni comillas. Si ya tenías credenciales guardadas con otra llave, recupera la original.

### "Stored credentials cannot be decrypted. Was the master key changed?"

La llave maestra actual no es la que se usó para cifrar. Restaura el valor anterior de `ENLAZIA_MASTER_KEY` (o el archivo `data/.master-key`). Si no lo tienes, elimina las conexiones y vuelve a crearlas.

### El chat no se ve en tiempo real y la respuesta aparece de golpe

El Playground usa **Server-Sent Events**. Algunos servidores Apache o proxies acumulan (buffering) la respuesta antes de enviarla. Enlazia ya envía `X-Accel-Buffering: no` y `Cache-Control: no-cache, no-transform`, pero en hosting compartido el comportamiento depende de la configuración del proveedor:

- Si usas Cloudflare, prueba desactivar el proxy para el subdominio o las optimizaciones que modifican la respuesta.
- Pregunta a tu proveedor si `mod_deflate` u otro módulo está comprimiendo o acumulando `text/event-stream`.
- El chat sigue funcionando aunque haya buffering: solo se pierde el efecto de escritura progresiva.

### La interfaz muestra "Enlazia API is running. Build the web UI with `pnpm build`."

Falta `apps/web/dist/index.html`. Sube la carpeta `apps/web/dist/` completa.

### No aparecen conectores o falta alguno

Comprueba que `connectors/` esté en la raíz de la app. Enlazia busca la carpeta `connectors/` a partir del directorio de trabajo. Los conectores inválidos se muestran en `stderr.log` como `Skipped connector ...`.

---

## English summary

1. **Build locally:** `pnpm install && pnpm build`.
2. **Subdomain:** create it in cPanel. If DNS is hosted elsewhere, add an **A record** pointing to the hosting server's IP. Run **AutoSSL** in SSL/TLS Status.
3. **Create the app** in *Setup Node.js App*: Node **22.13+** (required for `node:sqlite`), application root outside `public_html` (e.g. `enlazia`), your subdomain as the URL, startup file **`app.cjs`**. Don't run NPM install.
4. **Environment variables:** `ENLAZIA_PASSWORD` (required, or `ENLAZIA_DEMO=true` for a read-only public demo) and `ENLAZIA_MASTER_KEY` (`openssl rand -base64 32`; back it up, since losing it makes stored credentials unreadable). Don't set `PORT`/`HOST`.
5. **Upload** `app.cjs`, `package.json`, `packages/server/dist/`, `apps/web/dist/`, `connectors/`, `schemas/` via SFTP, or use the GitHub Action `.github/workflows/deploy-cpanel.yml` (SSH + rsync). For the action, create an SSH key pair yourself, import and **authorize** the public key in *cPanel > SSH Access > Manage SSH Keys*, and add the repository secrets `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_KEY` (private key), `CPANEL_APP_PATH` and optionally `CPANEL_SSH_PORT`. Never delete `data/` on the server.
6. **Restart:** `touch <app>/tmp/restart.txt` or the Restart button. Check `https://your-subdomain/api/health`.
7. **Troubleshooting:** check `stderr.log` in the app root (503 errors). `node:sqlite` missing means Node is too old. "Refusing to start" means set `ENLAZIA_PASSWORD` or `ENLAZIA_DEMO=true`. If chat arrives all at once, Apache or a proxy is buffering SSE.
