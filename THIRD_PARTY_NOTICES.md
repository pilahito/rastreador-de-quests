# Avisos de terceros / Third-party notices

QuestTracker (Rastreador de Quests para Vencord) es GPL-3.0-or-later. Este archivo recoge el código o las
ideas de terceros que se han usado, con su licencia.

## Vencord

El plugin se ejecuta dentro de [Vencord](https://github.com/Vendicated/Vencord), que es
GPL-3.0-or-later. Los imports `@api/*`, `@utils/*`, `@webpack/*` y `@components/*` son suyos.

## Orion / discord-quest-completer — MIT

Parte de la lógica de `src/auto/pure.ts` (elección del ejecutable win32 de una app y detección de la
familia de tarea) está **adaptada** del proyecto
[nyxxbit/discord-quest-completer](https://github.com/nyxxbit/discord-quest-completer), que se distribuye
bajo licencia MIT. Su aviso, tal y como exige la licencia:

```
MIT License

Copyright (c) 2026 Gabriel Bertolassi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## CompleteDiscordQuest — solo referencia

[nicola02nb/completeDiscordQuest](https://github.com/nicola02nb/completeDiscordQuest) se ha usado como
referencia técnica para confirmar endpoints y el planteamiento general. Ese repositorio no declara
licencia, así que **no se ha copiado código**: la implementación de este plugin es propia.

## Discord

Discord es una marca de Discord Inc. Este proyecto no está afiliado ni patrocinado por Discord. Los
nombres de productos y juegos pertenecen a sus dueños.
