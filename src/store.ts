/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — detección tolerante del store de Quests / tolerant quest store lookup.
 * Prueba varios nombres y formas; si Discord los cambia, cae a una búsqueda por forma.
 * Tries several names and shapes; if Discord renames them, falls back to a shape search.
 */

import { Logger } from "@utils/Logger";
import { findAll } from "@webpack";
import { Flux } from "@webpack/common";

export const logger = new Logger("QuestTracker");

const STORE_NAMES = ["QuestsStore", "QuestStore", "QuestsStoreV2"];

/**
 * Flux events we only LISTEN to so the panel refreshes. We never dispatch any of them.
 * Eventos Flux que solo ESCUCHAMOS para refrescar. Nunca despachamos ninguno.
 */
export const QUEST_EVENTS = [
    "QUESTS_FETCH_CURRENT_QUESTS_SUCCESS",
    "QUESTS_FETCH_CURRENT_QUESTS_FAILURE",
    "QUESTS_UPDATE_QUEST",
    "QUESTS_USER_STATUS_UPDATE",
    "QUESTS_ENROLL_SUCCESS",
    "QUESTS_CLAIM_REWARD_SUCCESS",
    "QUESTS_DISMISS_CONTENT_SUCCESS",
    "QUESTS_SEND_HEARTBEAT_SUCCESS"
];

let cached: any;

function looksLikeQuestStore(s: any): boolean {
    if (!s || typeof s !== "object") return false;
    try {
        const hasGetter = typeof s.getQuest === "function";
        const q = s.quests;
        return hasGetter && (q instanceof Map || (q && typeof q === "object"));
    } catch {
        return false;
    }
}

export function getQuestStore(force = false): any {
    if (cached && !force) return cached;

    try {
        const all: any[] = (Flux as any)?.Store?.getAll?.() ?? [];
        for (const name of STORE_NAMES) {
            const s = all.find(st => {
                try { return st?.getName?.() === name; } catch { return false; }
            });
            if (s) return (cached = s);
        }
        const byShape = all.find(looksLikeQuestStore);
        if (byShape) return (cached = byShape);
    } catch (e) {
        logger.debug("Flux store list unavailable", e);
    }

    try {
        const mods = findAll(m => looksLikeQuestStore(m) || (typeof m?.getQuests === "function" && typeof m?.getQuest === "function"));
        if (mods.length) return (cached = mods[0]);
    } catch (e) {
        logger.debug("Shape search failed", e);
    }

    return undefined;
}

/** Subscribe to the store's own change listener (works even if event names change). */
export function subscribeStore(cb: () => void): () => void {
    const store = getQuestStore();
    if (!store?.addChangeListener) return () => { };
    try {
        store.addChangeListener(cb);
        return () => {
            try { store.removeChangeListener?.(cb); } catch { /* ignore */ }
        };
    } catch {
        return () => { };
    }
}
