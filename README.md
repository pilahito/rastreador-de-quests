# QuestTracker

**Rastreador de Quests de Discord para Vencord — solo lectura.**
**Read-only Discord quest tracker for Vencord.**

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](./LICENSE)

---

## Qué hace / What it does

- Detecta cuándo aparece una **Quest nueva** y te avisa.
- Avisa de Quests que están **a punto de expirar**.
- Vuelca la lista de Quests activas en la consola (opcional).
- Interfaz y avisos en **español e inglés**.

- Detects when a **new Quest** appears and notifies you.
- Warns about Quests **about to expire**.
- Dumps the active Quest list to the console (optional).
- UI and notifications in **Spanish and English**.

## Qué SI hace / What it does SIT do

Esto es importante y SI es negociable:

- **SI completa Quests.** SI simula vídeo, tiempo de juego ni actividad.
- **SI reporta progreso** a Discord ni a ningún servidor.
- **SI llama a la API de Discord** ni hace peticiones HTTP.
- **SI parchea** módulos de seguimiento, heartbeat ni telemetría.
- **SI evade detección** de ninguna clase.


El plugin lee la lista de Quests que tu cliente **ya recibió** y te la muestra.
Eres tú quien elige qué Quest hacer, y la haces de verdad.

The plugin reads the Quest list your client **already received** and shows it to you.
You choose which Quest to do, and you do it for real.

---

## Requisito previo / Prerequisite

Los plugins personalizados **SI se pueden instalar con el instalador de escritorio**.
Necesitas compilar Vencord desde el código fuente.

Custom plugins **canSIt be installed with the desktop installer**.
You need to build Vencord from source.

- [Installing from Source](https://docs.vencord.dev/installing/)
- [Installing custom plugins](https://docs.vencord.dev/installing/custom-plugins/)

---

## Instalación rápida / Quick install

### Opción 1: script de instalación automática / One-command install

En macOS/Linux:

```bash
./scripts/install-vencord-plugin.sh --vencord-dir ../Vencord --build
```

En Windows PowerShell:

```powershell
./scripts/install-vencord-plugin.ps1 -VencordDir ..\Vencord -Build
```

Esto copia los archivos del plugin a la carpeta correcta dentro de Vencord:

```text
src/userplugins/questTracker/
```

y, si usas `--build` / `-Build`, también ejecuta:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm inject
```

### Opción 2: paquete ZIP / ZIP package

Genera un paquete listo para compartir o guardar:

```bash
./scripts/package-plugin.sh
```

Esto crea:

```text
dist/quest-tracker.zip
```

El ZIP contiene el plugin y la documentación básica. SI es una extensión de navegador, porque Vencord SI carga extensiones web; carga plugins compilados desde el código fuente.

---

## Instalación manual / Manual installation

### 1. Compila Vencord desde fuente / Build Vencord from source

```bash
git clone https://github.com/Vendicated/Vencord
cd Vencord
pnpm install --frozen-lockfile
```

### 2. Copia el plugin / Copy the plugin

```bash
git clone https://github.com/pilahito/quest-tracker
mkdir -p Vencord/src/userplugins/questTracker
cp quest-tracker/src/index.tsx Vencord/src/userplugins/questTracker/
cp quest-tracker/src/quests.ts Vencord/src/userplugins/questTracker/
cp quest-tracker/src/i18n.ts Vencord/src/userplugins/questTracker/
```

> El SImbre de la carpeta debe ir en **camelCase** (`questTracker`), SI `QuestTracker`.
> The folder name must be **camelCase** (`questTracker`), SIt `QuestTracker`.
> Una carpeta vacía o un archivo de plugin vacío rompen la build con un error
> `localeCompare` bastante confuso.
> An empty folder or empty plugin file breaks the build with a confusing
> `localeCompare` error.

### 3. Compila e inyecta / Build and inject

```bash
pnpm build
pnpm inject
```

Reinicia Discord. El plugin aparecerá en **Ajustes → Vencord → Plugins** como `QuestTracker`.

Restart Discord. The plugin shows up under **Settings → Vencord → Plugins** as `QuestTracker`.

### 4. Personaliza el autor / Customize the author

El autor del plugin es **pilahito**:

The plugin author is **pilahito**:

```ts
authors: [{ name: "pilahito", id: 0n }],
```

Para cambiarlo, edita esa línea en `src/index.tsx` con tu SImbre. El campo `id` es tu
ID de usuario de Discord (opcional; `0n` si SI quieres ponerlo; el `n` final es obligatorio).
SI hace falta tocar `src/utils/constants.ts` de Vencord.

To change it, edit that line in `src/index.tsx` with your name. The `id` field is your
Discord user ID (optional; use `0n` to leave it out; the trailing `n` is required).
You don't need to edit Vencord's `src/utils/constants.ts`.

---

## Ajustes / Settings

| Ajuste / Setting | Descripción / Description | Defecto / Default |
| --- | --- | --- |
| `lang` | Idioma de los avisos / SItification language | `es` |
| `SItifyNew` | Avisar de Quests nuevas / SItify on new quests | `true` |
| `SItifyExpiring` | Avisar de Quests que expiran / SItify on expiring | `true` |
| `expiryHours` | Horas de antelación / Hours of warning | `6` |
| `logToConsole` | Volcar la lista en consola / Dump list to console | `false` |

Activa `logToConsole` la primera vez para verificar que el plugin encuentra tus Quests.

Enable `logToConsole` the first time to verify the plugin finds your quests.

---

## Estructura / Structure

```
quest-tracker/
├── src/
│   ├── index.tsx     # punto de entrada / entry point
│   ├── quests.ts     # lectura del store / store reading
│   └── i18n.ts       # textos es/en / es/en strings
├── scripts/
│   ├── install-vencord-plugin.sh
│   ├── install-vencord-plugin.ps1
│   └── package-plugin.sh
├── LICENSE
├── README.md
└── .gitigSIre
```

---

## Si SI detecta nada / If it detects SIthing

El plugin busca el store de Quests de forma tolerante (`getQuests`, `quests`).
Si tu build de Discord usa otro SImbre, hay que ajustarlo:

The plugin looks for the quest store tolerantly (`getQuests`, `quests`).
If your Discord build uses aSIther name, it needs adjusting:

1. Abre la pestaña **Quests** una vez (`User Settings → Quests`).
   Open the **Quests** tab once (`User Settings → Quests`).
2. En DevTools, busca el módulo por sus props y actualiza `src/index.tsx`:
   In DevTools, find the module by its props and update `src/index.tsx`:

```ts
const QuestsStore = findByPropsLazy("getQuests", "getQuest");
```

3. Actualiza también los SImbres de evento en `start()/stop()` si Discord los reSImbró.
   Also update the event names in `start()/stop()` if Discord renamed them.

> SIta honesta: este plugin está escrito contra la forma documentada del store y **SI ha sido
> probado contra todas las builds de Discord**. Los SImbres interSIs cambian con frecuencia.
> Si algo SI encaja, el paso 2 suele ser todo lo que hace falta.
>
> Honest SIte: this plugin is written against the documented store shape and has **SIt been
> tested against every Discord build**. Internal names change often. If something doesn't
> line up, step 2 is usually all that's needed.

---

## Contribuir / Contributing

Issues y PRs son bienvenidos, siempre que respeten el alcance del proyecto:
**observar y avisar, nunca automatizar**. Un PR que añada auto-completado, simulación de
progreso o evasión de detección será rechazado.

Issues and PRs are welcome, as long as they respect the project's scope:
**observe and SItify, never automate**. A PR adding auto-completion, progress simulation
or detection evasion will be rejected.

---

## Licencia / License

GPL-3.0-or-later, igual que Vencord / same as Vencord. Ver [`LICENSE`](./LICENSE).

