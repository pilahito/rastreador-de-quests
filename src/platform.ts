/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Clasificación de plataforma de las Quests.
 *
 * Discord marca las tareas según dónde se pueden completar:
 * `WATCH_VIDEO_ON_MOBILE`, `PLAY_ON_XBOX`, `PLAY_ON_PLAYSTATION`… El cliente de
 * escritorio no puede acreditar esas tareas, así que este módulo centraliza la
 * detección para que el panel, el overlay y el motor usen la misma regla.
 */

export type QuestPlatform = "desktop" | "mobile" | "console" | "mixed" | "other";

const MOBILE_RE = /MOBILE$/i;
const CONSOLE_RE = /XBOX|PLAYSTATION|CONSOLE/i;

/** ¿La clave de tarea pide la app móvil? */
export function isMobileKey(key: string): boolean {
    return MOBILE_RE.test(key);
}

/** ¿La clave de tarea pide una consola? */
export function isConsoleKey(key: string): boolean {
    return CONSOLE_RE.test(key);
}

/** Claves de tarea de una Quest (`tasks` puede venir vacío si el config cambió). */
export function taskKeysOf(tasks: readonly { key: string }[] | undefined): string[] {
    return (tasks ?? []).map(task => task.key);
}

/** Clasifica a partir de las claves de tarea. */
export function platformOfKeys(keys: readonly string[]): QuestPlatform {
    if (!keys.length) return "other";

    let mobile = false;
    let consoleOnly = false;
    let desktop = false;
    for (const key of keys) {
        if (isMobileKey(key)) mobile = true;
        else if (isConsoleKey(key)) consoleOnly = true;
        else desktop = true;
    }

    if (mobile && !consoleOnly && !desktop) return "mobile";
    if (consoleOnly && !mobile && !desktop) return "console";
    if (mobile || consoleOnly) return "mixed"; // hay tarea de escritorio además
    return "desktop";
}

/** Clasifica una Quest con `tasks: [{ key }]`. */
export function platformOfQuest(quest: { tasks?: readonly { key: string }[]; } | undefined): QuestPlatform {
    return platformOfKeys(taskKeysOf(quest?.tasks));
}

/** Solo se puede acreditar desde la app móvil (el PC no la completa). */
export function isMobileOnlyQuest(quest: { tasks?: readonly { key: string }[]; } | undefined): boolean {
    return platformOfQuest(quest) === "mobile";
}

/** Solo se puede acreditar desde una consola. */
export function isConsoleOnlyQuest(quest: { tasks?: readonly { key: string }[]; } | undefined): boolean {
    return platformOfQuest(quest) === "console";
}

/** El PC puede completarla (aunque también exista una variante móvil/consola). */
export function isDesktopCapableQuest(quest: { tasks?: readonly { key: string }[]; } | undefined): boolean {
    const platform = platformOfQuest(quest);
    return platform === "desktop" || platform === "mixed";
}
