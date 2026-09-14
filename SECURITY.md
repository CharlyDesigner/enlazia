# Política de seguridad / Security Policy

- [Español](#español)
- [English](#english)

---

## Español

### Versiones con soporte

Enlazia está en fase 0.x. Solo la última versión publicada recibe correcciones de seguridad.

| Versión | Soporte |
| --- | --- |
| 0.x (la más reciente) | Sí |
| 0.x anteriores | No |

### Cómo reportar una vulnerabilidad

**No abras un issue público.** Repórtala de forma privada en GitHub Security Advisories:

https://github.com/CharlyDesigner/enlazia/security/advisories/new

Incluye, si puedes:

- Versión o commit afectado y forma de despliegue (local, VPS, cPanel).
- Pasos para reproducirla o una prueba de concepto.
- Impacto estimado (por ejemplo, exposición de credenciales o saltarse la autenticación).

### Qué esperar

- Acuse de recibo en un máximo de **7 días**.
- Una evaluación inicial y un plan de corrección cuando confirmemos el problema.
- Crédito en el aviso publicado, si lo deseas, una vez que la corrección esté disponible.

Por favor, no divulgues la vulnerabilidad hasta que haya una corrección publicada.

### Alcance y responsabilidades

Enlazia es software **autoalojado**: la seguridad de cada instancia depende también de quien la opera.

- **Pon siempre `ENLAZIA_PASSWORD`** en servidores accesibles desde internet. El servidor se niega a arrancar sin contraseña cuando no escucha en loopback o corre bajo Passenger, salvo en modo demo (`ENLAZIA_DEMO=true`).
- **Usa HTTPS.** La cookie de sesión solo se marca como `Secure` cuando la petición llega por HTTPS (directo o con `X-Forwarded-Proto: https`).
- **Respalda la llave maestra** (`ENLAZIA_MASTER_KEY` o `data/.master-key`) en un lugar seguro y separado de la base de datos. Si se pierde, las credenciales guardadas no se pueden recuperar. Si se filtra junto con `data/enlazia.db`, las credenciales quedan expuestas.
- Mantén la carpeta `data/` fuera del directorio público de tu servidor web y con permisos restringidos.
- Usa credenciales con el mínimo de permisos posible (por ejemplo, claves restringidas o de solo lectura).
- El límite de intentos de inicio de sesión se basa en la IP del cliente, tomada de `X-Forwarded-For`. Asegúrate de que tu proxy inverso reemplace ese encabezado y no lo pase tal como lo envía el cliente.

Quedan fuera de alcance las vulnerabilidades de los proveedores de terceros a los que Enlazia se conecta y los problemas que requieren acceso previo al sistema de archivos del servidor.

---

## English

### Supported versions

Enlazia is in its 0.x phase. Only the latest release receives security fixes.

| Version | Supported |
| --- | --- |
| 0.x (latest) | Yes |
| Older 0.x | No |

### Reporting a vulnerability

**Do not open a public issue.** Report it privately through GitHub Security Advisories:

https://github.com/CharlyDesigner/enlazia/security/advisories/new

If possible, include:

- The affected version or commit and how it is deployed (local, VPS, cPanel).
- Steps to reproduce or a proof of concept.
- The estimated impact (for example, credential disclosure or authentication bypass).

### What to expect

- An acknowledgement within **7 days**.
- An initial assessment and a fix plan once the issue is confirmed.
- Credit in the published advisory, if you want it, once a fix is available.

Please don't disclose the issue publicly until a fix has been released.

### Scope and responsibilities

Enlazia is **self-hosted** software, so each instance's security also depends on whoever operates it.

- **Always set `ENLAZIA_PASSWORD`** on internet-facing servers. The server refuses to start without a password when it is not bound to loopback or runs under Passenger, unless demo mode (`ENLAZIA_DEMO=true`) is on.
- **Use HTTPS.** The session cookie is only marked `Secure` when the request arrives over HTTPS (directly or with `X-Forwarded-Proto: https`).
- **Back up the master key** (`ENLAZIA_MASTER_KEY` or `data/.master-key`) somewhere safe and separate from the database. If it is lost, stored credentials cannot be recovered. If it leaks together with `data/enlazia.db`, the credentials are exposed.
- Keep the `data/` folder outside your web server's public directory, with restricted permissions.
- Use least-privilege credentials (for example, restricted or read-only keys).
- Login rate limiting is keyed on the client IP from `X-Forwarded-For`. Make sure your reverse proxy overwrites that header instead of passing through the client's value.

Out of scope: vulnerabilities in the third-party providers Enlazia connects to, and issues that require prior access to the server's filesystem.
