# 🏆 Rastreador de Quests para Vencord

**Panel de Quests de Discord en español (y inglés) para Vencord, con modo automático OPCIONAL y apagado por defecto.**

[![Licencia: GPL-3.0-or-later](https://img.shields.io/badge/Licencia-GPL--3.0--or--later-blue.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/pilahito/rastreador-de-quests)](https://github.com/pilahito/rastreador-de-quests/releases/latest)
[![Hecho para Vencord](https://img.shields.io/badge/Hecho%20para-Vencord-5865F2)](https://vencord.dev)
[![Pruebas](https://img.shields.io/badge/pruebas-node%20--test-23a55a)](./tests/auto.test.mjs)

> **Nombre antiguo:** el plugin se llamaba *QuestTracker* y el repositorio `quest-tracker`. Ahora el
> repositorio es **`rastreador-de-quests`** y el plugin aparece en Vencord como **RastreadorDeQuests**.
> La carpeta de instalación sigue siendo `src/userplugins/questTracker` para no romper scripts.
>
> **Al actualizar desde la 1.x** el plugin vuelve a estar desactivado y sus ajustes empiezan de cero
> (Discord guarda los ajustes por nombre de plugin). El historial local no se pierde.

[Qué hace](#qué-hace) ·
[Aviso de riesgo](#aviso-de-riesgo) ·
[Instalación](#instalación) ·
[Uso](#uso) ·
[Ajustes](#ajustes) ·
[Cómo funciona](#cómo-funciona) ·
[FAQ](#preguntas-frecuentes) ·
[English](#english)

---

## Qué hace

**Rastreador (siempre activo, no envía nada):**

- **Panel de Quests** con el botón 🏆 de la barra del chat, el comando `/quests` o el menú Vencord Toolbox.
- Nombre, juego, editor, tipo de tarea (ver vídeo, jugar, stream, actividad), **progreso real** que el
  cliente ya conoce (barra, % y minutos), recompensa, tiempo restante y estado
  (**sin aceptar / en curso / completada / reclamada / caducada**).
- Búsqueda, filtros por estado y tipo, y orden (caduca antes, más progreso, nombre, más nuevas).
- **Avisos** con las notificaciones de Vencord: Quest nueva, a punto de caducar, casi completa y
  "ya puedes reclamar". Cada aviso sale una sola vez por Quest.
- **Historial local** de Quests completadas y reclamadas (`DataStore`, solo en tu PC, se puede borrar).
- Interfaz en **español e inglés** (automático según el idioma de Discord, o fijo en Ajustes).

**Modo automático (opcional, apagado por defecto, exige aceptar un aviso de riesgo):**

- Acepta la Quest por ti y la completa **una cada vez**, con pausas naturales.
- Tipos que sabe conducir: **ver vídeo**, **jugar en escritorio**, **actividad** y, como intento,
  **stream** (Discord exige además un Go Live real y otra persona en la llamada, así que normalmente no
  se completa: el plugin lo intenta y te lo dice, no se queda colgado).
- Al terminar **no reclama solo** salvo que lo actives: puedes reclamar con un clic desde el panel o en Discord.
- Si Discord marca la cuenta con una **suspensión de Quests**, el motor **se para solo** y te avisa.
- Todo lo que simula (juego, stream, ajuste de actividad) **se limpia al detener**: no deja nada a medias.
- Puedes lanzar **una sola Quest** con el botón **Auto** de su tarjeta, sin encender el interruptor maestro.

## Aviso de riesgo

> **Automatizar Quests va contra las normas de Discord.** Desde 2026 Discord sanciona cuentas por
> *"Inauthentic Quest Completion"*: bloqueo del acceso a Quests (reportes de 10–14 días) y aviso en el
> registro de la cuenta (*Account Standing*). Hay quien automatiza durante meses sin nada y hay quien
> recibe el aviso en semanas: no es algo que este plugin pueda controlar ni predecir.
>
> **Tú decides.** El modo automático viene apagado, no se activa sin aceptar un aviso dentro del panel y
> se puede detener en cualquier momento. Si no quieres asumir el riesgo, déjalo apagado: el rastreador
> sigue funcionando igual.

**Lo que este plugin NO hace, por diseño:**

- ❌ **No salta captchas** ni pide OAuth. Si Discord pide captcha al reclamar, te avisa para que lo hagas tú.
- ❌ **No lee ni envía tu token** a ningún sitio: usa el cliente autenticado que ya usa Discord.
- ❌ **No automatiza logros dentro de actividades** (`ACHIEVEMENT_IN_ACTIVITY`): los valida el backend de
  la actividad, no el cliente, y suplantarlos es la parte más arriesgada de todas.
- ❌ **No automatiza consola ni móvil** (`PLAY_ON_XBOX`, `PLAY_ON_PLAYSTATION`, `WATCH_VIDEO_ON_MOBILE`).
- ❌ **No evade detección**: no inventa fingerprints, no bloquea telemetría ni oculta peticiones.
- ❌ **No reclama nada de forma irreversible**: la recompensa la decides tú (auto-reclamar apagado por defecto).

## Instalación

Los plugins personalizados **no se instalan con el instalador normal de Vencord**: hay que compilar
Vencord desde el código. Los scripts lo hacen casi todo.

Requisitos: **Git** y **Node.js 22+** (pnpm se activa con corepack si falta).

### Windows (fácil)

1. Descarga el ZIP de [Releases](https://github.com/pilahito/rastreador-de-quests/releases/latest) y descomprímelo
   (o `git clone https://github.com/pilahito/rastreador-de-quests`).
2. Doble clic en **`install.bat`**. El instalador:
   - comprueba Git, Node y pnpm;
   - busca Vencord en `..\Vencord`, `%USERPROFILE%\Vencord`, `Documentos\Vencord` o `VENCORD_DIR`
     (si no lo encuentra, ofrece clonarlo);
   - copia el plugin a `src\userplugins\questTracker` (incluida la carpeta `auto/`);
   - ejecuta `pnpm install` + `pnpm build` y pregunta si quiere ejecutar `pnpm inject`.
3. Reinicia Discord y activa **RastreadorDeQuests** en **Ajustes → Vencord → Plugins**.

Opciones: `install.bat -VencordDir D:\ruta\Vencord`, `-NoBuild` (solo copiar), `-Inject -Yes` (sin preguntas).

### macOS / Linux

```bash
./scripts/install-vencord-plugin.sh --vencord-dir ../Vencord --build
```

### Manual

Copia el contenido de `src/` en `Vencord/src/userplugins/questTracker/` y ejecuta en Vencord:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm inject     # opcional
```

### El nombre del repositorio

El proyecto se presenta como **Rastreador de Quests** y el repositorio se llama
`rastreador-de-quests`. Antes era `quest-tracker`: GitHub redirige los enlaces antiguos, así que los
ZIP y los badges históricos no se rompen. La carpeta que se copia a Vencord sigue siendo
`src/userplugins/questTracker` para que los instaladores y los scripts actuales sigan funcionando.

## Uso

| Acción | Cómo |
| --- | --- |
| Abrir el panel | Botón 🏆 de la barra del chat, `/quests` o Vencord Toolbox → *QuestTracker: Quests* |
| Activar/detener el modo automático | Interruptor de la barra superior del panel, pestaña **⚙️ Automático**, o `/questauto` |
| Completar una sola Quest | Botón **▶ Auto** en su tarjeta (no hace falta encender el interruptor maestro) |
| Reclamar una recompensa | Botón **Reclamar** en una Quest completada |
| Ver qué está haciendo | Pestaña **⚙️ Automático**: tarea actual, cola y registro con hora |

## Ajustes

**Rastreador**

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

**Modo automático**

| Ajuste | Descripción | Defecto |
| --- | --- | --- |
| `autoConsent` | ⚠️ Acepto el riesgo (obligatorio para activar) | `false` |
| `autoEnabled` | Interruptor maestro del modo automático | `false` |
| `autoAccept` | Aceptar la Quest antes de empezar | `true` |
| `autoClaimRewards` | Reclamar al terminar (puede pedir captcha) | `false` |
| `autoVideos` | Quests de ver vídeo | `true` |
| `autoGames` | Quests de jugar en escritorio (simula un proceso) | `true` |
| `autoActivities` | Quests de actividad (heartbeat) | `true` |
| `autoStreams` | Intentar Quests de stream (normalmente no se completan) | `false` |
| `autoHideActivity` | Ocultar "Jugando X" mientras dura el spoof y restaurarlo después | `true` |
| `autoLogToConsole` | Escribir el registro automático también en la consola | `false` |

## Cómo funciona

Todo pasa por el **cliente autenticado de Discord** (`RestAPI`), la misma vía que usa su interfaz.
No hay servidores intermedios ni tokens propios.

| Tarea | Cómo se completa |
| --- | --- |
| `WATCH_VIDEO` | Se manda `video-progress` con marcas de tiempo reales, con pausas de 8–11 s y sin adelantarse al reloj. |
| `PLAY_ON_DESKTOP` | Se parchea en caliente `RunningGameStore` para que el cliente crea que el juego está abierto; **Discord manda sus propios heartbeats** y el plugin lee el progreso. Se restaura al terminar. |
| `PLAY_ACTIVITY` | Se manda el `heartbeat` de actividad con la clave de la llamada/canal de voz (igual que el cliente). |
| `STREAM_ON_DESKTOP` | Se simula el metadato de stream como último recurso. Discord exige Go Live real + otra persona, así que suele fallar y se informa. |
| `ACHIEVEMENT_IN_ACTIVITY` | **No se automatiza**: lo valida el backend de la actividad. |
| Consola / móvil | **No es posible** desde el cliente de escritorio. |

Detalles de seguridad y reversibilidad:

- El fake de juego se instala **solo mientras dura la tarea** y se restauran todos los métodos originales.
- Si `autoHideActivity` está activo, se apaga el ajuste de Discord *"Mostrar actividad actual como estado"*
  y se restaura al acabar; si Discord se cierra de golpe, una marca en `DataStore` lo vuelve a encender al
  cargar el plugin.
- Si la cuenta tiene `questAccessSuspendedUntil` (suspensión de Quests), el motor se detiene y avisa.
- No se martillea la API: una tarea cada vez, pausas entre pasos, máximo de reintentos y tiempos máximos.

## Límites conocidos

- **Stream**: Discord necesita un Go Live real y otra persona en el canal. El plugin lo intenta, pero no
  puede garantizarlo; por eso `autoStreams` viene apagado.
- **Logros en actividades**: fuera de alcance por diseño (riesgo alto y validación en servidor).
- **Captcha al reclamar**: si aparece, hay que reclamar a mano. Nunca se intenta saltar.
- **Nombres internos de Discord**: cambian a menudo. El plugin tolera cambios de store y de eventos, pero
  no se ha probado contra todas las builds; si algo deja de funcionar, activa `autoLogToConsole` y abre un issue.

## Preguntas frecuentes

**¿Me pueden banear?**
Riesgo real: Discord sanciona la automatización de Quests desde 2026. El plugin viene apagado y avisa antes
de activarse, pero la decisión y el riesgo son tuyos.

**¿Reclama las recompensas solo?**
No por defecto. `autoClaimRewards` está apagado; cuando lo activas, puede fallar por captcha y te avisa.

**¿Se queda algo modificado si cierro Discord a mitad?**
El fake de juego se va con el proceso. El ajuste "Mostrar actividad" se repara solo en la siguiente carga.

**¿Funciona en el navegador?**
El vídeo sí. Jugar/stream/actividad necesitan la app de escritorio.

**¿Por qué no completa mi Quest de stream?**
Porque Discord exige un Go Live real y otra persona en la llamada antes de leer el stream.

**¿Por qué no completa logros?**
Porque los valida el backend de la actividad; simularlos exigiría OAuth y suplantar progreso, que el
plugin no hace a propósito.

**¿Envía mis datos a algún sitio?**
No. El historial y los ajustes se quedan en tu `DataStore` local. Las únicas peticiones van a Discord.

**¿Cómo vuelvo al modo "solo lectura"?**
Desactiva `autoEnabled` (y `autoConsent` si quieres que no se pueda reactivar sin volver a aceptar).
El rastreador sigue funcionando.

## Solución de problemas

1. **No aparece el plugin**: Vencord debe estar compilado desde el código con el plugin en
   `src/userplugins/questTracker`. Reinicia Discord y actívalo en Ajustes → Vencord → Plugins.
2. **No detecta Quests**: abre una vez **Descubrir → Quests** y pulsa **↻ Actualizar** en el panel.
   Si sigue igual, activa `logToConsole` y mira la consola (`Ctrl+Shift+I`).
3. **El modo automático no arranca**: falta aceptar el aviso de riesgo (`autoConsent`) o el interruptor
   maestro está apagado. El panel te dice cuál de los dos es.
4. **"Discord no reconoció el juego"**: el heartbeat no llegó a abrirse; puede ser un cambio de build de
   Discord o una Quest no disponible. Revisa el registro del panel.
5. **HTTP 400/403/404 al aceptar**: la Quest no está disponible para tu cuenta o el acceso está suspendido.
6. **Captcha al reclamar**: normal; reclama tú en Discord → Quests.
7. **Quiero depurar**: activa `autoLogToConsole` y `logToConsole`, y adjunta la salida al issue.

## Estructura

```
rastreador-de-quests/
├── src/
│   ├── index.tsx          # plugin, comandos, avisos, arranque del motor
│   ├── QuestPanel.tsx     # panel: Quests, Automático, Historial
│   ├── AutoConsent.tsx    # aviso de riesgo antes de activar
│   ├── auto/
│   │   ├── engine.ts      # motor: cola, tareas, reclamar, parada
│   │   ├── questApi.ts    # enroll / claim / video-progress / heartbeat
│   │   ├── gameSpoof.ts   # spoof de RunningGameStore + restore
│   │   ├── streamSpoof.ts # spoof de ApplicationStreamingStore + restore
│   │   ├── presence.ts    # ocultar/restaurar "Jugando X" (con reparación)
│   │   ├── pure.ts        # lógica pura y testeable
│   │   └── bridge.ts      # puente Ajustes ↔ motor
│   ├── quests.ts          # lectura tolerante de Quests
│   ├── store.ts           # detección del store y eventos
│   ├── history.ts         # historial local
│   ├── nav.ts             # accesos que solo navegan
│   ├── settings.ts        # ajustes
│   ├── i18n.ts            # textos es/en
│   └── style.css
├── tests/
│   └── auto.test.mjs      # pruebas de la lógica pura (node --test)
├── .github/               # CI y plantillas de issues
├── scripts/               # instaladores y empaquetado
├── install.bat
├── CHANGELOG.md
├── THIRD_PARTY_NOTICES.md
└── LICENSE
```

## Desarrollo y pruebas

```bash
# Pruebas de la lógica pura (sin Vencord ni Discord)
node --test tests/auto.test.mjs

# Compilar dentro de Vencord
cp -R src/. ../Vencord/src/userplugins/questTracker/
cd ../Vencord
pnpm install --frozen-lockfile
pnpm testTsc     # tipos
pnpm build       # build de Vencord con el plugin

# Empaquetar una release (en Linux/macOS, o usa el ZIP que genera el CI)
./scripts/package-plugin.sh 2.0.0
```

La lógica pura (`src/auto/pure.ts`) no importa nada de Vencord: ahí están la detección de tareas, el
cálculo de marcas de tiempo del vídeo, la elección de ejecutable y los motivos de bloqueo. Se prueba con
`node --test` y es lo que corre en CI.

## Contribuir

Issues y PRs son bienvenidos si respetan el alcance:

- ✅ arreglar detección de Quests, UI, traducciones, pruebas, documentación;
- ✅ mejorar la limpieza/reversibilidad y los avisos;
- ❌ saltar captchas, pedir OAuth, simular logros de actividad, evadir detección, automatizar consola/móvil;
- ❌ quitar los avisos de riesgo o activar la automatización por defecto.

Antes de abrir un PR: `node --test tests/auto.test.mjs` en verde y, si tocas el plugin, `pnpm testTsc` y
`pnpm build` dentro de Vencord.

## Créditos

- **[Vencord](https://github.com/Vendicated/Vencord)**: la base del cliente mod (GPL-3.0-or-later).
- **Referencias técnicas** para saber qué endpoints y qué stores usa Discord hoy:
  [nicola02nb/completeDiscordQuest](https://github.com/nicola02nb/completeDiscordQuest) (referencia, sin
  licencia declarada) y [nyxxbit/discord-quest-completer](https://github.com/nyxxbit/discord-quest-completer)
  (MIT). Se ha contrastado la lógica (endpoints, detección de tareas, spoof de juego), no se ha copiado
  código literal; la parte adaptada del proyecto MIT lleva su aviso en
  [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

## Licencia

[GPL-3.0-or-later](./LICENSE), igual que Vencord. El plugin es un fork independiente: no está afiliado a
Vencord, Discord ni a los proyectos de referencia.

---

## English

**Quest tracker for Vencord (Spanish/English UI) with an OPTIONAL, off-by-default automation mode.**

- Tracker: quest panel, real progress, notifications, history, search/filters, i18n.
- Automation (opt-in, risk notice required): accepts and completes video / play-on-desktop / activity quests
  one at a time, optional auto-claim, stream best-effort, never touches achievement-in-activity or console/mobile.
- It never solves captchas, never asks for OAuth, never sends your token anywhere and stops itself if Discord
  reports a quest-access suspension. Everything it spoofs is cleaned up on stop.
- **Discord sanctions quest automation since 2026** (quest lock + account standing notice). The call is yours.

Install: build Vencord from source with `src/` in `src/userplugins/questTracker` (or run `install.bat` on
Windows), then enable **RastreadorDeQuests** in Settings → Vencord → Plugins.

Tests: `node --test tests/auto.test.mjs` · License: GPL-3.0-or-later.
