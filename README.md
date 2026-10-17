# QuestTracker

**Rastreador de Quests de Discord para Vencord — solo lectura.**
**Read-only Discord Quest tracker for Vencord.**

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/pilahito/quest-tracker)](https://github.com/pilahito/quest-tracker/releases/latest)

> Te ayuda a **hacer tú mismo** las Quests: ves todas, su progreso real, la recompensa y cuánto queda,
> y te avisa en el momento justo. Nunca hace nada por ti.
>
> Helps you **do Quests yourself**: see them all, their real progress, the reward and the time left,
> and get notified at the right moment. It never does anything for you.

[Español](#español) · [English](#english)

---

## Español

### Qué hace

- **Panel de Quests** (botón del trofeo 🏆 en la barra del chat, comando `/quests` o menú Vencord Toolbox):
  - nombre, juego y editor, tipo de tarea (ver vídeo, jugar, stream, actividad);
  - **progreso real** que el cliente ya conoce: barra, porcentaje y minutos (`12 de 15 min`);
  - recompensa, tiempo restante y estado: **sin aceptar / en curso / completada / reclamada / caducada**;
  - búsqueda, filtros por estado y tipo, y orden (caduca antes, más progreso, nombre, más nuevas);
  - consejos de qué hacer en cada Quest ("juega con Discord abierto", "acéptala en Discord"…).
- **Avisos** (usan las notificaciones de Vencord, de escritorio si Discord no tiene el foco):
  - Quest nueva disponible;
  - Quest a punto de caducar (por defecto 24 h antes);
  - progreso casi completo (por defecto 80 %);
  - **"Ya puedes reclamar tu recompensa"**: solo te avisa, la reclamas tú a mano.
  - Cada aviso sale una sola vez por Quest. Al pulsarlo se abre el panel.
- **Accesos rápidos que solo navegan**: "Abrir en Discord" (te lleva a la página de Quests de Discord),
  "Página del juego" y "Ver vídeo" si la Quest trae enlace (se abren en el navegador y **no suman progreso**).
- **Historial local** de Quests completadas y reclamadas (DataStore de Vencord, solo en tu PC; se puede borrar).
- Detección tolerante del store de Quests y de sus eventos: varios nombres posibles, búsqueda por forma
  y el propio listener del store, así que no se rompe si Discord renombra algo.
- Interfaz en **español e inglés** (automático según el idioma de Discord, o fijo en Ajustes).

### Qué NO hace

Esto es importante y no es negociable:

- **No completa Quests.** No simula vídeo, tiempo de juego, stream ni actividad.
- **No envía progreso ni heartbeats** a Discord ni a ningún servidor.
- **No llama a la API de Discord** para aceptar, avanzar ni reclamar, ni hace peticiones HTTP propias.
- **No parchea** módulos de seguimiento, heartbeat ni telemetría.
- **No evade detección** de ninguna clase.

El plugin lee la lista de Quests que tu cliente **ya recibió** y te la enseña.
Eres tú quien elige qué Quest hacer, la haces de verdad y reclamas la recompensa tú mismo.

### Instalación en Windows (fácil)

Los plugins personalizados **no se pueden instalar con el instalador normal de Vencord**: hay que compilar
Vencord desde el código. El instalador lo hace casi todo por ti.

1. Instala **Git** (<https://git-scm.com/download/win>) y **Node.js 22 o superior** (<https://nodejs.org>).
2. Descarga `quest-tracker-v1.1.0.zip` de [Releases](https://github.com/pilahito/quest-tracker/releases/latest)
   y descomprímelo (o `git clone https://github.com/pilahito/quest-tracker`).
3. Haz doble clic en **`install.bat`**. El instalador:
   - comprueba Git, Node y pnpm (activa pnpm con corepack si falta);
   - busca Vencord en `..\Vencord`, `%USERPROFILE%\Vencord`, `Documentos\Vencord` o en `VENCORD_DIR`;
     si no lo encuentra, te ofrece clonarlo al lado;
   - copia el plugin a `src\userplugins\questTracker`;
   - ejecuta `pnpm install` y `pnpm build`, y te pregunta si quieres `pnpm inject`.
4. Reinicia Discord y activa **QuestTracker** en **Ajustes → Vencord → Plugins**.

Opciones: `install.bat -VencordDir D:\ruta\Vencord`, `-NoBuild` (solo copiar), `-Inject -Yes` (sin preguntas).

### Instalación en macOS / Linux

```bash
./scripts/install-vencord-plugin.sh --vencord-dir ../Vencord --build
```

### Instalación manual

Copia el contenido de `src/` en `Vencord/src/userplugins/questTracker/` (la carpeta en camelCase) y ejecuta en
Vencord `pnpm install --frozen-lockfile`, `pnpm build` y `pnpm inject`.

### Ajustes

| Ajuste | Descripción | Defecto |
| --- | --- | --- |
| `lang` | Idioma: auto, español o inglés | `auto` |
| `showChatButton` | Botón 🏆 en la barra del chat | `true` |
| `notifyNew` | Avisar de Quests nuevas | `true` |
| `notifyExpiring` / `expiryHours` | Avisar antes de caducar / horas de antelación | `true` / `24` |
| `notifyNearComplete` / `nearCompletePercent` | Avisar con progreso casi completo / % | `true` / `80` |
| `notifyClaimable` | Avisar cuando puedes reclamar (lo reclamas tú) | `true` |
| `questRoute` | Ruta que abre "Abrir en Discord" | `/quest-home` |
| `logToConsole` | Volcar la lista en la consola (depuración) | `false` |

### Si no detecta nada

1. Abre una vez **Descubrir → Quests** en Discord para que el cliente cargue las Quests y pulsa **Actualizar** en el panel.
2. Activa `logToConsole` y mira la consola (`Ctrl+Shift+I`) para ver lo que encuentra.
3. Si Discord renombró el store, añade el nombre nuevo en `STORE_NAMES` de `src/store.ts`.

> Nota honesta: los nombres internos de Discord cambian a menudo. El plugin está escrito para tolerar esos
> cambios, pero no se ha probado contra todas las builds.

---

## English

### What it does

- **Quest panel** (trophy 🏆 button in the chat bar, `/quests` command or the Vencord Toolbox menu):
  name, game and publisher, task type (watch video, play, stream, activity), **real progress** the client
  already knows (bar, percent and minutes), reward, time left and status
  (**not accepted / in progress / completed / claimed / expired**), search, filters and sorting, plus tips.
- **Notifications**: new Quest, about to expire (24 h by default), almost complete (80 % by default) and
  **"you can claim your reward"** (notification only — you claim it by hand). Each one fires once per Quest.
- **Navigation-only shortcuts**: "Open in Discord" (Discord's own Quests page), "Game page" and "Watch video"
  when the Quest provides a link (they open in the browser and **do not add progress**).
- **Local history** of completed and claimed Quests (Vencord DataStore, stays on your PC, can be cleared).
- Tolerant detection of the Quest store and its events (several names, shape search and the store's own
  change listener), so it doesn't break when Discord renames things.
- UI in **Spanish and English** (auto from Discord's language, or fixed in settings).

### What it does NOT do

- **It does not complete Quests.** It does not simulate video, play time, streams or activity.
- **It does not send progress or heartbeats** to Discord or any server.
- **It does not call Discord's API** to accept, advance or claim, nor make HTTP requests of its own.
- **It does not patch** tracking, heartbeat or telemetry modules.
- **It does not evade detection** of any kind.

It reads the Quest list your client **already received** and shows it to you. You choose, you play,
and you claim the reward yourself.

### Install on Windows (easy)

Custom plugins **cannot be installed with the regular Vencord installer**; Vencord has to be built from source.

1. Install **Git** and **Node.js 22+**.
2. Download `quest-tracker-v1.1.0.zip` from [Releases](https://github.com/pilahito/quest-tracker/releases/latest) and unzip it.
3. Double-click **`install.bat`**. It checks the tools, finds (or offers to clone) Vencord, copies the plugin to
   `src\userplugins\questTracker`, runs `pnpm install` + `pnpm build` and asks whether to run `pnpm inject`.
4. Restart Discord and enable **QuestTracker** in **Settings → Vencord → Plugins**.

Options: `install.bat -VencordDir D:\path\Vencord`, `-NoBuild`, `-Inject -Yes`.

macOS / Linux: `./scripts/install-vencord-plugin.sh --vencord-dir ../Vencord --build`

Manual: copy `src/` into `Vencord/src/userplugins/questTracker/`, then `pnpm install --frozen-lockfile`,
`pnpm build`, `pnpm inject`.

### If nothing is detected

Open **Discover → Quests** once and press **Refresh** in the panel. Enable `logToConsole` to debug. If Discord
renamed the store, add the new name to `STORE_NAMES` in `src/store.ts`.

---

## Estructura / Structure

```
quest-tracker/
├── src/
│   ├── index.tsx       # plugin, avisos, comando, botón / plugin, notifications, command, button
│   ├── QuestPanel.tsx  # panel (modal) / panel (modal)
│   ├── quests.ts       # lectura tolerante de Quests / tolerant quest parsing
│   ├── store.ts        # detección del store y eventos / store & event detection
│   ├── history.ts      # historial local / local history
│   ├── nav.ts          # accesos que solo navegan / navigation-only shortcuts
│   ├── settings.ts     # ajustes / settings
│   ├── i18n.ts         # textos es/en / es/en strings
│   └── style.css
├── scripts/
│   ├── install-vencord-plugin.ps1
│   ├── install-vencord-plugin.sh
│   └── package-plugin.sh
├── install.bat
├── LICENSE
└── README.md
```

## Contribuir / Contributing

Issues y PRs son bienvenidos si respetan el alcance: **observar y avisar, nunca automatizar**.
Un PR que añada auto-completado, simulación de progreso, envío de heartbeats o evasión de detección será rechazado.

Issues and PRs are welcome as long as they respect the scope: **observe and notify, never automate**.
PRs adding auto-completion, progress simulation, heartbeats or detection evasion will be rejected.

## Licencia / License

GPL-3.0-or-later, igual que Vencord / same as Vencord. Ver [`LICENSE`](./LICENSE).
