/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — lectura tolerante de Quests / tolerant quest parsing.
 * Solo lee objetos que el cliente ya tiene en memoria. Nunca modifica ni envía nada.
 * Only reads objects the client already has in memory. Never mutates or sends anything.
 */

export type TaskCategory = "video" | "play" | "stream" | "activity" | "other";
export type QuestStatus = "available" | "inProgress" | "completed" | "claimed" | "expired";

export interface QuestTask {
    key: string;
    category: TaskCategory;
    /** seconds required / segundos necesarios */
    target: number;
    /** seconds already done (as reported by the client) / segundos hechos (según el cliente) */
    value: number;
}

export interface QuestInfo {
    id: string;
    name: string;
    game: string;
    publisher?: string;
    tasks: QuestTask[];
    category: TaskCategory;
    /** 0..1 */
    progress: number;
    progressSeconds: number;
    targetSeconds: number;
    reward: string;
    startsAt?: number;
    expiresAt?: number;
    enrolledAt?: number;
    completedAt?: number;
    claimedAt?: number;
    status: QuestStatus;
    gameUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
}

/** Map, Collection, array or plain object → array. */
export function toArray(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw instanceof Map || typeof raw.values === "function") {
        try { return [...raw.values()]; } catch { /* fallthrough */ }
    }
    if (typeof raw === "object") return Object.values(raw);
    return [];
}

function pick<T = any>(obj: any, ...paths: string[]): T | undefined {
    for (const p of paths) {
        let cur = obj;
        for (const part of p.split(".")) {
            if (cur == null) break;
            cur = cur[part];
        }
        if (cur != null && cur !== "") return cur as T;
    }
    return undefined;
}

function toMs(value: any): number | undefined {
    if (value == null || value === "") return undefined;
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
    const ms = Date.parse(String(value));
    return Number.isNaN(ms) ? undefined : ms;
}

function categoryOf(key: string): TaskCategory {
    const k = key.toUpperCase();
    if (k.includes("VIDEO")) return "video";
    if (k.includes("STREAM")) return "stream";
    if (k.includes("ACTIVITY")) return "activity";
    if (k.includes("PLAY")) return "play";
    return "other";
}

function isSafeHttpUrl(url: unknown): boolean {
    if (typeof url !== "string") return false;
    try {
        const u = new URL(url);
        return u.protocol === "https:" || u.protocol === "http:";
    } catch {
        return false;
    }
}

function assetUrl(questId: string, asset: any): string | undefined {
    if (typeof asset !== "string" || !asset) return undefined;
    if (isSafeHttpUrl(asset)) return asset;
    const path = asset.startsWith("quests/") ? asset : `quests/${questId}/${asset}`;
    return `https://cdn.discordapp.com/${path}`;
}

function readTasks(q: any): { tasks: QuestTask[]; joinOperator: string; } {
    const cfg = q?.config ?? {};
    const taskCfg = cfg.taskConfigV2 ?? cfg.taskConfig ?? cfg.task_config_v2 ?? cfg.task_config ?? {};
    const rawTasks = taskCfg.tasks ?? {};
    const progress = q?.userStatus?.progress ?? q?.user_status?.progress ?? {};
    const tasks: QuestTask[] = [];

    for (const [key, task] of Object.entries<any>(rawTasks)) {
        if (!task) continue;
        const target = Number(task.target ?? task.targetSeconds ?? 0) || 0;
        let value = Number(progress?.[key]?.value ?? 0) || 0;

        // Legacy stream progress field / campo antiguo de progreso de stream
        if (value === 0 && categoryOf(key) === "stream") {
            value = Number(q?.userStatus?.streamProgressSeconds ?? q?.user_status?.stream_progress_seconds ?? 0) || 0;
        }
        tasks.push({ key, category: categoryOf(String(task.type ?? key)), target, value });
    }

    // Very old shape: single task / forma muy antigua: una sola tarea
    if (!tasks.length) {
        const type = String(taskCfg.type ?? cfg.taskType ?? "");
        if (type) tasks.push({ key: type, category: categoryOf(type), target: Number(taskCfg.target ?? 0) || 0, value: 0 });
    }

    return { tasks, joinOperator: String(taskCfg.joinOperator ?? taskCfg.join_operator ?? "or").toLowerCase() };
}

function readReward(q: any): string {
    const cfg = q?.config ?? {};
    const rewards = toArray(pick(cfg, "rewardsConfig.rewards", "rewards_config.rewards", "rewards"));
    const first = rewards[0];
    if (!first) return pick<string>(cfg, "messages.rewardName", "messages.reward_name") ?? "?";

    const orbs = first.orbQuantity ?? first.orb_quantity;
    if (typeof orbs === "number" && orbs > 0) return `${orbs} Orbs`;

    return pick<string>(first, "messages.nameWithArticle", "messages.name", "messages.name_with_article", "name")
        ?? String(first.type ?? "?");
}

/** Parse one raw quest object. Returns undefined if it is unusable. */
export function parseQuest(q: any, now = Date.now()): QuestInfo | undefined {
    if (!q || typeof q !== "object") return undefined;
    const id = String(q.id ?? q.questId ?? q.config?.id ?? "");
    if (!id) return undefined;

    const cfg = q.config ?? {};
    const us = q.userStatus ?? q.user_status ?? {};
    const { tasks, joinOperator } = readTasks(q);

    // "or": the best task counts; "and": the worst one / "or": cuenta la mejor; "and": la peor
    const ratios = tasks.map(tk => (tk.target > 0 ? Math.min(tk.value / tk.target, 1) : 0));
    let mainIdx = 0;
    if (ratios.length) {
        const fn = joinOperator === "and" ? Math.min : Math.max;
        const best = fn(...ratios);
        mainIdx = Math.max(0, ratios.indexOf(best));
    }
    const main = tasks[mainIdx];

    const enrolledAt = toMs(us.enrolledAt ?? us.enrolled_at);
    const completedAt = toMs(us.completedAt ?? us.completed_at);
    const claimedAt = toMs(us.claimedAt ?? us.claimed_at);
    const expiresAt = toMs(cfg.expiresAt ?? cfg.expires_at ?? q.expiresAt);
    const startsAt = toMs(cfg.startsAt ?? cfg.starts_at ?? q.startsAt);

    let status: QuestStatus;
    if (claimedAt) status = "claimed";
    else if (completedAt) status = "completed";
    else if (expiresAt && expiresAt <= now) status = "expired";
    else if (enrolledAt) status = "inProgress";
    else status = "available";

    let progress = main ? ratios[mainIdx] : 0;
    if (completedAt || claimedAt) progress = 1;

    const app = cfg.application ?? {};
    const videoTask = tasks.find(tk => tk.category === "video");
    const rawVideoTask = videoTask ? (cfg.taskConfigV2 ?? cfg.taskConfig ?? {})?.tasks?.[videoTask.key] : undefined;
    const videoUrl = pick<string>(rawVideoTask, "assets.video.url", "assets.videoLowRes.url")
        ?? pick<string>(cfg, "videoMetadata.assets.videoPlayerVideo.url");
    const gameUrl = pick<string>(app, "link") ?? pick<string>(cfg, "ctaConfig.link", "cta_config.link");

    return {
        id,
        name: pick<string>(cfg, "messages.questName", "messages.quest_name") ?? app.name ?? q.name ?? id,
        game: pick<string>(cfg, "messages.gameTitle", "messages.game_title") ?? app.name ?? "?",
        publisher: pick<string>(cfg, "messages.gamePublisher", "messages.game_publisher"),
        tasks,
        category: main?.category ?? "other",
        progress,
        progressSeconds: main?.value ?? 0,
        targetSeconds: main?.target ?? 0,
        reward: readReward(q),
        startsAt,
        expiresAt,
        enrolledAt,
        completedAt,
        claimedAt,
        status,
        gameUrl: gameUrl && isSafeHttpUrl(gameUrl) ? gameUrl : undefined,
        videoUrl: videoUrl && isSafeHttpUrl(videoUrl) ? videoUrl : undefined,
        imageUrl: assetUrl(id, pick(cfg, "assets.gameTile", "assets.game_tile", "assets.logotype", "assets.hero"))
    };
}

/** Read all quests from a store-like object. Read-only. */
export function readQuestsFrom(store: any): QuestInfo[] {
    if (!store) return [];
    let raw: any;
    try {
        raw = store.quests ?? store.getQuests?.() ?? store._quests ?? store.questsById;
    } catch {
        raw = undefined;
    }
    const now = Date.now();
    const out: QuestInfo[] = [];
    for (const q of toArray(raw)) {
        try {
            const parsed = parseQuest(q, now);
            if (parsed) out.push(parsed);
        } catch { /* skip malformed quest / omitir quest rota */ }
    }
    return out;
}

export type SortKey = "expiry" | "progress" | "name" | "newest";

const STATUS_ORDER: Record<QuestStatus, number> = { completed: 0, inProgress: 1, available: 2, claimed: 3, expired: 4 };

export function sortQuests(list: QuestInfo[], key: SortKey): QuestInfo[] {
    const copy = [...list];
    switch (key) {
        case "progress":
            return copy.sort((a, b) => b.progress - a.progress || STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        case "name":
            return copy.sort((a, b) => a.name.localeCompare(b.name));
        case "newest":
            return copy.sort((a, b) => (b.startsAt ?? 0) - (a.startsAt ?? 0));
        case "expiry":
        default:
            return copy.sort((a, b) =>
                STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
                (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
    }
}

export function isExpiringSoon(q: QuestInfo, hours: number, now = Date.now()): boolean {
    if (!q.expiresAt || q.status === "claimed" || q.status === "expired") return false;
    const left = q.expiresAt - now;
    return left > 0 && left < hours * 3600_000;
}
