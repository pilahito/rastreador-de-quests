# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
[SemVer](https://semver.org/lang/es/).

## [2.2.5] — 2026-10-18

### Corregido

- El recuadro flotante del vídeo ya **no se queda abierto con el texto “Aquí saldrá el vídeo de la Quest”**:
  empieza oculto y solo aparece cuando hay un vídeo reproduciéndose; al terminar la Quest de vídeo se vuelve
  a ocultar. Antes parecía que se había quedado congelado.
- El progreso real se sigue actualizando por latidos (≈1 % cada 9 s en Quests de juego).

## [2.2.4] — 2026-10-18

### Corregido

- Las Quests que **solo se pueden completar en el móvil** (p. ej. `WATCH_VIDEO_ON_MOBILE`) ya no se intentan
  automatizar: el motor las bloquea y el panel las etiqueta como “Solo se puede hacer desde el móvil”. El
  plugin nunca simula el cliente móvil.
- Las de **consola** muestran su etiqueta y no ofrecen el botón **Auto**.
- Reparada la codificación de algunos textos internos (tildes, flechas y guiones) que se habían doble-codificado.

## [2.2.3] — 2026-10-18

### Rendimiento

- El panel flotante **ya no lee `document.body.innerText`** en cada comprobación de ruta: eso obligaba a
  Discord a recalcular el layout de toda la página cada 800 ms y era el mayor coste del plugin.
- El panel se refresca **cada 5 s** (antes 2 s), **no hace nada con la ventana minimizada** y agrupa los
  eventos del store con un pequeño debounce.
- El repintado usa un **hash barato** en vez de `JSON.stringify` de todas las Quests.
- Un solo listener de `resize` (antes se acumulaba uno por cada visita a Misiones).
- La persistencia de avisos solo escribe en `DataStore` **cuando algo cambia** de verdad.

## [2.2.2] — 2026-10-18

### Cambiado

- El plugin ya **no abre el navegador** salvo que pulses un enlace externo y **confirmes** el aviso
  (`externalLinksConfirm`, activado por defecto). Evita ventanas de Brave/Chrome inesperadas.
- Se ha quitado el botón “Ver vídeo (navegador)”; el vídeo de la Quest ya se ve en el recuadro flotante del
  plugin, así que no hace falta abrir nada fuera.

## [2.2.1] — 2026-10-18

### Corregido

- El panel flotante se adapta a su ancho: al estrecharlo, las filas pasan a un diseño de dos líneas
  (nombre / % y estado / recompensa y tiempo) en vez de recortarse. Ancho mínimo 300 px.
- El asa de la esquina para ensanchar/estrechar es más visible y el panel se vuelve a componer al cambiar
  de ancho.

## [2.2.0] — 2026-10-18

### Añadido

- **Selector Todas / Seleccionadas** (`autoScope`) en el panel: automatiza todas las Quests permitidas o
  solo las que marques con **☆** en su tarjeta. La selección se guarda en `DataStore`.
- Modo seleccionadas con aviso si no hay ninguna marcada; el panel muestra cuántas llevas.

### Corregido

- El motor ya no encadena Quests que no estén en la selección cuando se usa ese modo (las manuales con
  **▶ Auto** siguen funcionando igual).

## [2.1.0] — 2026-10-18

### Añadido

- **Panel flotante en la página de Misiones** (`/quest-home`): progreso de todas las Quests con %, recompensa,
  tiempo y estado; se arrastra por la cabecera, se ensancha por la esquina, se minimiza/maximiza y permite
  detener o activar la automatización. Recuerda posición y tamaño.
- **Porcentaje de la tarea actual en la cabecera** (visible también minimizado), que sube con el progreso real.
- **Vídeo real de la Quest en recuadro flotante**, silenciado por defecto con botón **🔇/🔊**; al hacer clic
  fuera salta a **ventana flotante PiP** (encima de todo, sin pausa, sin bloquear el ratón) y se reanuda solo
  si se pausa. Ajustes `autoVideoPip` y `autoVideoSound`.
- **Ritmo humano** (`autoHumanPacing`): pausas antes de cada acción, huecos entre Quests, deja el juego
  abierto un rato más al terminar y espera antes de reclamar.
- Ajuste `showQuestPageOverlay` para ocultar el panel de Misiones.

### Corregido

- Las URLs de vídeo de las Quests llegan como ruta relativa del CDN y no se resolvían: ahora se convierten
  a `https://cdn.discordapp.com/...` y el vídeo flotante puede reproducirlas.
- El panel flotante respeta el tamaño de la ventana y no recorta su contenido ni el asa de redimensionado.

## [2.0.0] — 2026-10-18

### Añadido

- **Modo automático opcional** (apagado por defecto): acepta la Quest, la completa una cada vez y puede
  reclamar la recompensa. Tipos soportados: ver vídeo, jugar en escritorio, actividad y, como intento,
  stream.
- **Aviso de riesgo** en un modal de Vencord antes de activar nada, y ajuste `autoConsent` como
  consentimiento explícito.
- **Pestaña ⚙️ Automático** en el panel: estado, tarea actual, cola, registro con hora y limpieza del registro.
- **Botones por Quest**: `▶ Auto` (completa solo esa), `Reclamar` y `Quitar` de la cola.
- **Spoof de juego** parcheando en caliente `RunningGameStore` (y restaurándolo al terminar) para que
  Discord mande sus propios heartbeats.
- **Spoof de stream** (`ApplicationStreamingStore`) como último recurso, informando si Discord exige un
  Go Live real.
- **Ocultar "Jugando X"** mientras dura el spoof, restaurando el ajuste de Discord y reparándolo en la
  siguiente carga si Discord se cerró de golpe.
- **Parada automática** si la cuenta tiene una suspensión de Quests (`questAccessSuspendedUntil`).
- Comando `/questauto` y acción en Vencord Toolbox para activar/detener el modo automático.
- **Lógica pura testeable** (`src/auto/pure.ts`) con 15 pruebas en `node --test` y CI de GitHub Actions.
- README reescrito en español, este CHANGELOG y `THIRD_PARTY_NOTICES.md`.

### Cambiado

- **Nombre del plugin**: `QuestTracker` → **`RastreadorDeQuests`** (y términos de búsqueda en español).
  Al actualizar desde la 1.x el plugin vuelve a estar desactivado y sus ajustes empiezan de cero; el
  historial local se conserva.
- **Instaladores**: ahora copian toda la carpeta `src/` (incluida `src/auto/`). La versión anterior solo
  copiaba archivos de primer nivel y habría roto el plugin.
- **Empaquetado**: el ZIP de release incluye las subcarpetas de `src/` y el CHANGELOG.

### Seguridad y límites

- Nunca se saltan captchas, no se pide OAuth, no se lee ni envía el token y no se automatizan logros
  dentro de actividades ni tareas de consola/móvil.
- Auto-reclamar está apagado por defecto: reclamar sigue siendo decisión del usuario.
- Todo lo simulado se limpia al detener, al descargar el plugin o al arrancar tras un cierre sucio.

## [1.1.0]

- Panel de Quests con progreso real, búsqueda, filtros y orden.
- Avisos de Quest nueva, por caducar, casi completa y reclamable.
- Historial local de Quests completadas y reclamadas.
- Instaladores para Windows, macOS y Linux (`install.bat`, scripts de consola).
- Interfaz bilingüe español/inglés.

## [1.0.0]

- Versión inicial: rastreador de Quests de solo lectura (panel y detección tolerante del store).
