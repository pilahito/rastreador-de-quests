# Hoja de ruta — Rastreador de Quests (Vencord)

Plugin de Vencord para **ver** las Discord Quests y, **solo si tú lo activas**, completarlas por ti.
El rastreador es de solo lectura y no envía nada; el modo automático es opcional, viene apagado,
exige aceptar un aviso de riesgo y se puede detener en cualquier momento.

## Hecho en 2.0.0

- Modo automático opcional: aceptar la Quest, ver vídeo, jugar en escritorio, actividad y stream
  como intento; reclamar la recompensa es opcional y está apagado por defecto.
- Aviso de riesgo antes de activar, parada automática si Discord suspende las Quests y limpieza
  (con restauración) de todo lo que se simula.
- Panel con pestaña **Automático** (tarea actual, cola y registro) y botones **Auto** / **Reclamar**
  por Quest.
- Lógica pura con 15 pruebas (`node --test`) y CI de GitHub Actions.
- README, CHANGELOG y plantillas de issues en español; plugin renombrado a **RastreadorDeQuests**.
- Instaladores corregidos para copiar la carpeta `src/auto/` completa.

## Hecho en 1.1.0

- Panel de misiones (botón trofeo + `/quests`): progreso, recompensa, tiempo.
- Avisos de misiones nuevas, caducidad y «ya se puede reclamar».
- Historial local; español e inglés; instalador `install.bat` para Windows.

## Pendiente

- Probar en directo con Quests activas de cada tipo (vídeo, jugar, actividad) en Stable y Canary.
- Capturas de pantalla del panel **sin datos personales** (sin usuario real, email ni IDs) para
  README y releases.
- Seguir los cambios de nombres internos de Discord (stores y eventos) sin añadir evasión de detección.
- Revisar las Quests de stream cuando Discord cambie sus requisitos (hoy exige Go Live real y otra
  persona en la llamada).

## Alcance

- **Rastreador:** solo lee el estado que el cliente ya tiene; no envía nada ni llama a la API.
- **Automatización:** opcional, consentida y limitada a lo que el cliente puede conducir. Todo lo
  simulado se limpia al detener.
- **Nunca:** saltar captchas, pedir OAuth, simular logros dentro de actividades, automatizar
  consola/móvil, evadir detección ni activar la automatización por defecto.
