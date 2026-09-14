# Enlazia — Marca / Brand

**Enlazia** = *enlaza* + *IA*. Conecta IAs y APIs desde un solo lugar. / Connect AI and APIs from one place.

Creado por [Charly Designer](https://carlosnavarro.site) · Apache-2.0

## Mascota / Mascot: «Enchufito»

Un enchufe amigable que emerge desde la esquina inferior izquierda: la conexión, literal y cercana.
A friendly plug peeking from the lower-left corner: connection made literal and approachable.

| Archivo / File | Uso / Use |
|---|---|
| `enlazia-icon.svg` | Ícono de app, favicon, avatar (fondo azul noche) / App icon, favicon, avatar |
| `enlazia-mark.svg` | Mascota sin fondo para superficies oscuras / Mascot without background for dark surfaces |
| `logo-candidates/C1-enchufito-izq.png` | Ilustración original elegida (GPT Image 2) / Original chosen illustration |
| `logo-candidates/*` | Exploración inicial (A ajolote, B pulpo, C enchufito) / Initial exploration |

Reglas / Rules:
- No rotar, deformar ni cambiar los colores de la mascota. / Don't rotate, stretch or recolor the mascot.
- Deja al menos 1/8 del tamaño como margen alrededor del ícono. / Keep at least 1/8 of its size as clear space.
- Tamaño mínimo 16 px (favicon). / Minimum size 16 px.

## Color

| Token | Hex | Uso / Use |
|---|---|---|
| Verde Enlazia / Enlazia green | `#22C55E` | Acento, estado conectado, CTA (tema oscuro) / Accent, connected state, CTA (dark) |
| Verde profundo / Deep green | `#15803D` | Acento en tema claro (contraste AA con blanco) / Light-theme accent (AA on white) |
| Blanco hueso / Bone | `#F1F5F9` | Detalles de la mascota / Mascot details |
| Azul noche / Night blue | `#1B2640` | Fondo del ícono / Icon background |
| Tinta / Ink | `#020617` | Fondo de la app (oscuro) / App background (dark) |
| Superficie / Surface | `#0E1223` | Tarjetas (oscuro) / Cards (dark) |
| Borde / Border | `#1E293B` · `#334155` | Divisores y controles / Dividers and controls |
| Texto secundario / Muted | `#94A3B8` | Texto de apoyo (oscuro) / Secondary text (dark) |
| Error | `#F87171` (oscuro/dark) · `#DC2626` (claro/light) | Errores / Errors |

Los tokens viven en `apps/web/src/styles.css`. / Tokens live in `apps/web/src/styles.css`.

## Tipografía / Typography

- **IBM Plex Sans** (400, 500, 600, 700) — interfaz y textos / UI and copy.
- **JetBrains Mono** — código, IDs de modelos, métodos HTTP, cifras / code, model ids, HTTP methods, numbers.

Ambas se sirven localmente con Fontsource (sin CDNs de terceros). / Both self-hosted via Fontsource (no third-party CDNs).

## Estilo / Style

Minimalismo suizo, oscuro por defecto: retícula clara, mucho espacio, un solo acento verde, íconos lineales (Lucide), sin emojis como íconos. Movimiento sutil (150–200 ms) y respeto a `prefers-reduced-motion`.

Swiss minimalism, dark first: clear grid, generous spacing, a single green accent, line icons (Lucide), no emoji icons. Subtle motion (150–200 ms) and `prefers-reduced-motion` respected.
