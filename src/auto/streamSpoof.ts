/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — spoof del estado "En directo" para las Quests STREAM_ON_DESKTOP.
 *
 * Igual que con el juego, se parchea EN CALIENTE el método del store y se restaura al
 * terminar. Discord exige además un Go Live real y otra persona en el canal, así que
 * este camino puede no completar la Quest: el motor lo intenta y, si no hay heartbeat,
 * te lo dice en lugar de dejarlo colgado.
 *
 * Same runtime-patch approach as the game spoof, restored on stop. Discord also requires a
 * real Go Live and another person in the call, so this path may not complete; the engine
 * tries and reports honestly instead of hanging.
 */

import { ApplicationStreamingStore } from "@webpack/common";

import { logger } from "../store";

export interface FakeStream {
    id: string;
    name: string;
    pid: number;
    sourceName: string | null;
}

let saved: ((...args: any[]) => any) | null = null;
let active = false;

/** Instala el metadato de stream falso. Devuelve false si el store no está. */
export function startFakeStream(stream: FakeStream): boolean {
    const store = ApplicationStreamingStore as any;
    if (!store || typeof store.getStreamerActiveStreamMetadata !== "function") {
        logger.warn("ApplicationStreamingStore.getStreamerActiveStreamMetadata no existe: no se puede simular stream en esta build.");
        return false;
    }
    if (!active) {
        saved = store.getStreamerActiveStreamMetadata;
        store.getStreamerActiveStreamMetadata = () => ({
            id: stream.id,
            name: stream.name,
            pid: stream.pid,
            sourceName: stream.sourceName
        });
        active = true;
    }
    return true;
}

/** Restaura el método original. */
export function stopFakeStream(): void {
    const store = ApplicationStreamingStore as any;
    if (!active) return;
    if (store && saved) store.getStreamerActiveStreamMetadata = saved;
    saved = null;
    active = false;
}

/** ¿Hay un stream falso activo? */
export function fakeStreamActive(): boolean {
    return active;
}
