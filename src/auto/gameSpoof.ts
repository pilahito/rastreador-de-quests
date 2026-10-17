/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — spoof de "juego en ejecución" para las Quests PLAY_ON_DESKTOP.
 *
 * Se parchean EN CALIENTE los métodos de `RunningGameStore` (no se tocan los ficheros de
 * Discord): mientras hay un juego falso, el cliente cree que está corriendo y él mismo
 * manda los heartbeats de la Quest. Al terminar o al pulsar STOP se restauran los
 * métodos originales y se quita el proceso falso.
 *
 * La lista de métodos creció con las versiones: las builds nuevas calculan la elegibilidad
 * con "visible"/"candidate", así que no basta `getRunningGames`. Se parchea cada método
 * que exista y se dejan intactos los que no.
 *
 * Runtime monkey-patching of `RunningGameStore` (Discord's files are never touched): while
 * a fake game is installed the client believes it is running and sends the quest
 * heartbeats itself. Every patched method is restored on stop.
 */

import { FluxDispatcher, RunningGameStore } from "@webpack/common";

import { logger } from "../store";

const GAME_DISPATCH = "RUNNING_GAMES_CHANGE";

const PATCHED_METHODS = [
    "getRunningGames",
    "getGameForPID",
    "getVisibleGame",
    "getVisibleRunningGames",
    "getRunningDiscordApplicationIds",
    "getCandidateGames"
] as const;

export interface FakeGame {
    id: string;
    name: string;
    icon?: string;
    pid: number;
    pidPath: number[];
    processName: string;
    start: number;
    exeName: string;
    exePath: string;
    cmdLine: string;
    executables: Array<{ os: string; name: string; is_launcher: boolean; }>;
    windowHandle: number;
    fullscreenType: number;
    overlay: boolean;
    sandboxed: boolean;
    hidden: boolean;
    isLauncher: boolean;
}

let store: any;
let real: Record<string, (...args: any[]) => any> = {};
const games: FakeGame[] = [];
let patched = false;

function currentStore(): any {
    // El store puede tardar en estar listo; se busca en cada uso.
    if (!store && RunningGameStore) store = RunningGameStore as any;
    return store;
}

function install(): void {
    const s = currentStore();
    if (!s || patched) return;

    real = {};
    for (const name of PATCHED_METHODS) {
        if (typeof s[name] === "function") real[name] = s[name];
    }
    if (!real.getRunningGames) {
        logger.warn("RunningGameStore.getRunningGames no existe: el spoof de juego no puede instalarse en esta build.");
        return;
    }

    s.getRunningGames = () => [...(real.getRunningGames?.call(s) ?? []), ...games];
    s.getGameForPID = (pid: number) => games.find(game => game.pid === pid) ?? real.getGameForPID?.call(s, pid);

    // El juego falso gana como "el" visible, que es el objetivo del spoof.
    if (real.getVisibleGame) s.getVisibleGame = () => games[0] ?? real.getVisibleGame.call(s);
    if (real.getVisibleRunningGames) s.getVisibleRunningGames = () => [...real.getVisibleRunningGames.call(s), ...games];
    if (real.getCandidateGames) s.getCandidateGames = () => [...real.getCandidateGames.call(s), ...games];
    if (real.getRunningDiscordApplicationIds) {
        s.getRunningDiscordApplicationIds = () => {
            const ids = real.getRunningDiscordApplicationIds.call(s);
            const ours = games.map(game => String(game.id));
            // La forma cambia según la build (Set o array): se conserva la que devolvió.
            return ids instanceof Set ? new Set([...ids, ...ours]) : [...(ids ?? []), ...ours];
        };
    }

    patched = true;
    logger.info(`Spoof de juego instalado (${Object.keys(real).length} métodos).`);
}

function uninstall(): void {
    const s = currentStore();
    if (!s || !patched) return;
    for (const [name, fn] of Object.entries(real)) s[name] = fn;
    real = {};
    patched = false;
}

function dispatch(added: FakeGame[], removed: FakeGame[]): void {
    try {
        FluxDispatcher.dispatch({
            type: GAME_DISPATCH,
            added,
            removed,
            games: currentStore()?.getRunningGames?.() ?? []
        });
    } catch (e) {
        logger.debug("RUNNING_GAMES_CHANGE dispatch falló", e);
    }
}

/** Instala un juego falso y avisa a Discord para que empiece a mandar heartbeats. */
export function startFakeGame(game: FakeGame): void {
    install();
    if (!patched) return;
    if (games.some(existing => existing.pid === game.pid)) return;
    games.push(game);
    dispatch([game], []);
}

/** Quita un juego falso concreto. */
export function stopFakeGame(pid: number): void {
    const index = games.findIndex(game => game.pid === pid);
    if (index === -1) return;
    const [removed] = games.splice(index, 1);
    dispatch([], [removed]);
    if (!games.length) uninstall();
}

/** Quita todos los juegos falsos y restaura los métodos originales. */
export function stopAllFakeGames(): void {
    if (!games.length && !patched) return;
    const removed = games.splice(0, games.length);
    dispatch([], removed);
    uninstall();
}

/** ¿Hay algún juego falso activo? Lo usa el panel para el indicador de estado. */
export function fakeGameCount(): number {
    return games.length;
}
