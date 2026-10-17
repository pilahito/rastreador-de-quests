/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* QuestTracker — historial local (DataStore) / local history */

import * as DataStore from "@api/DataStore";

import type { QuestInfo } from "./quests";

export interface HistoryEntry {
    id: string;
    name: string;
    game: string;
    reward: string;
    completedAt?: number;
    claimedAt?: number;
}

const HISTORY_KEY = "QuestTracker_history";
const MAX_ENTRIES = 300;

export async function getHistory(): Promise<HistoryEntry[]> {
    const list = (await DataStore.get<HistoryEntry[]>(HISTORY_KEY)) ?? [];
    return Array.isArray(list) ? list : [];
}

/** Upsert completed/claimed quests. Returns true if something changed. */
export async function recordHistory(quests: QuestInfo[]): Promise<boolean> {
    const done = quests.filter(q => q.completedAt || q.claimedAt);
    if (!done.length) return false;

    let changed = false;
    await DataStore.update<HistoryEntry[]>(HISTORY_KEY, old => {
        const list = Array.isArray(old) ? [...old] : [];
        for (const q of done) {
            const idx = list.findIndex(e => e.id === q.id);
            const entry: HistoryEntry = {
                id: q.id,
                name: q.name,
                game: q.game,
                reward: q.reward,
                completedAt: q.completedAt,
                claimedAt: q.claimedAt
            };
            if (idx === -1) {
                list.push(entry);
                changed = true;
            } else if (list[idx].claimedAt !== entry.claimedAt || list[idx].completedAt !== entry.completedAt) {
                list[idx] = { ...list[idx], ...entry };
                changed = true;
            }
        }
        list.sort((a, b) => (b.claimedAt ?? b.completedAt ?? 0) - (a.claimedAt ?? a.completedAt ?? 0));
        return list.slice(0, MAX_ENTRIES);
    });
    return changed;
}

export async function clearHistory() {
    await DataStore.del(HISTORY_KEY);
}
