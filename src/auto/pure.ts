/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — lógica pura del modo automático / pure automation logic.
 *
 * Este archivo NO importa nada de Vencord ni de Discord: son funciones deterministas
 * que se pueden probar con `node --test tests/`. El motor (engine.ts) es quien habla
 * con el cliente.
 *
 * This file imports nothing from Vencord or Discord: deterministic helpers that can be
 * unit tested with `node --test tests/`. The engine (engine.ts) talks to the client.
 *
 * La elección de ejecutable y la familia de tareas están ADAPTADAS del proyecto Orion
 * (discord-quest-completer, Copyright (c) 2026 Gabriel Bertolassi, licencia MIT).
 * Ver THIRD_PARTY_NOTICES.md.
 */

/** Tipos de tarea que el motor sabe conducir. / Task families the engine can drive. */
export type TaskType = "VIDEO" | "GAME" | "STREAM" | "ACTIVITY" | "ACHIEVEMENT";

export interface DetectedTask {
    type: TaskType;
    /** Clave concreta de la tarea en el config (p. ej. WATCH_VIDEO). */
    keyName: string;
    /** Segundos necesarios. */
    target: number;
    /** Id de aplicación de la tarea (la usa Discord desde julio 2026). */
    appId: string | null;
}

/** Tareas que solo existen en consola: ningún cliente de escritorio puede hacerlas. */
export const CONSOLE_ONLY_KEYS = new Set(["PLAY_ON_XBOX", "PLAY_ON_PLAYSTATION"]);

/** Tareas que solo valida la app móvil de Discord (no se pueden falsear desde el PC). */
export function isMobileOnly(keys: string[]): boolean {
    return keys.length > 0 && keys.every(key => /MOBILE$/i.test(key));
}

/** Tareas que se validan fuera del alcance de un mod de cliente. / Cannot be driven from the client. */
export const UNAUTOMATABLE_KEYS: Readonly<Record<string, string>> = {
    ACHIEVEMENT_IN_GAME: "achievementInGame"
};

/** Map, array u objeto → lista de entradas. */
export function taskEntries(tasks: unknown): Array<[string, any]> {
    if (!tasks) return [];
    if (tasks instanceof Map) return Array.from(tasks.entries()) as Array<[string, any]>;
    if (typeof tasks === "object") return Object.entries(tasks as Record<string, any>);
    return [];
}

export function taskForKey(config: any, key: string): any {
    const tasks = config?.tasks;
    if (tasks instanceof Map) return tasks.get(key);
    return tasks?.[key];
}

/**
 * taskConfigV2 manda cuando trae tareas; taskConfig (antiguo) se usa como respaldo.
 * V2 first: some payloads keep the legacy object beside it and the old metadata lies.
 */
export function selectQuestTaskConfig(config: any): any | null {
    const current = config?.taskConfigV2;
    if (taskEntries(current?.tasks).length > 0) return current;

    const legacy = config?.taskConfig;
    if (taskEntries(legacy?.tasks).length > 0) return legacy;

    return current ?? legacy ?? null;
}

/** Progreso en segundos de una tarea, leyendo Map u objeto. */
export function readProgressSeconds(userStatus: any, key: string): number {
    const progress = userStatus?.progress;
    const entry = progress instanceof Map ? progress.get(key) : progress?.[key];
    const value = Number(entry?.value ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
    // Campo antiguo de stream / legacy stream field
    const legacy = Number(userStatus?.streamProgressSeconds ?? 0);
    return Number.isFinite(legacy) && legacy > 0 ? legacy : 0;
}

/**
 * Id de la aplicación de una tarea.
 *
 * En julio de 2026 Discord movió el id de `config.application.id` a
 * `config.taskConfigV2.tasks.<KEY>.applications[0].id`. Leer solo la ruta nueva
 * (con la vieja como respaldo) es lo que hace que el spoof de juego siga funcionando.
 */
export function appIdForTask(config: any, keyName: string, legacyAppId?: string | null): string | null {
    const fromTask = taskForKey(config, keyName)?.applications?.[0]?.id;
    if (fromTask != null && fromTask !== "") return String(fromTask);
    if (legacyAppId != null && legacyAppId !== "") return String(legacyAppId);
    return null;
}

/** Elige la clave exacta preferida y nunca una de consola. / Prefer exact, never console. */
export function selectTaskKey(keys: string[], prefer: string[] = []): string | undefined {
    const exact = keys.find(key => prefer.includes(key));
    if (exact) return exact;
    return keys.find(key => !CONSOLE_ONLY_KEYS.has(key));
}

/**
 * Familia de tarea a conducir, en orden de prioridad.
 *
 * STREAM va después de GAME/VIDEO porque Discord exige un Go Live real y otra persona
 * en el canal antes de leer el stream falso, así que solo sirve como último recurso.
 */
export function selectTaskFamily(keys: string[]): { type: TaskType; keyName: string; } | null {
    const rules: Array<{ type: TaskType; match: (key: string) => boolean; prefer?: string[]; }> = [
        { type: "ACHIEVEMENT", match: key => key === "ACHIEVEMENT_IN_ACTIVITY" },
        { type: "ACTIVITY", match: key => key === "PLAY_ACTIVITY" },
        { type: "VIDEO", match: key => key.includes("VIDEO"), prefer: ["WATCH_VIDEO"] },
        { type: "GAME", match: key => key.startsWith("PLAY"), prefer: ["PLAY_ON_DESKTOP"] },
        { type: "STREAM", match: key => key.startsWith("STREAM"), prefer: ["STREAM_ON_DESKTOP"] },
        { type: "ACTIVITY", match: key => key.includes("ACTIVITY") }
    ];

    for (const rule of rules) {
        const keyName = keys.find(key => rule.match(key) && !CONSOLE_ONLY_KEYS.has(key)
            && (!rule.prefer || rule.prefer.includes(key) || !rule.prefer.some(p => keys.includes(p))));
        if (keyName) return { type: rule.type, keyName };
    }

    return null;
}

/** True si la Quest solo ofrece tareas de consola. */
export function isConsoleOnly(keys: string[]): boolean {
    return keys.length > 0 && keys.every(key => CONSOLE_ONLY_KEYS.has(key));
}

/** Deduce qué tarea debe conducir este cliente y con qué app, o null si no puede. */
export function detectTask(config: any, legacyAppId?: string | null): DetectedTask | null {
    const entries = taskEntries(config?.tasks);
    const keys = entries.map(([key]) => key);

    const family = selectTaskFamily(keys);
    if (family) {
        return {
            type: family.type,
            keyName: family.keyName,
            target: Number(taskForKey(config, family.keyName)?.target ?? 0) || 0,
            appId: appIdForTask(config, family.keyName, legacyAppId)
        };
    }

    if (isConsoleOnly(keys)) return null;

    // Sin familia reconocida pero con app: se intenta como juego de escritorio.
    if (legacyAppId && entries.length > 0) {
        return {
            type: "GAME",
            keyName: "PLAY_ON_DESKTOP",
            target: Number(entries[0][1]?.target ?? 0) || 0,
            appId: String(legacyAppId)
        };
    }

    return null;
}

export interface RunnabilityQuest {
    name: string;
    keys: string[];
    detected: DetectedTask | null;
    isDesktop: boolean;
}

/**
 * Motivo por el que este cliente NO puede conducir una Quest (texto para el registro),
 * o null cuando sí puede. Todas las razones son permanentes durante la sesión.
 */
export function questBlocker(q: RunnabilityQuest): string | null {
    // Móvil: exigiría simular el cliente móvil; el plugin no lo hace.
    if (isMobileOnly(q.keys)) return "mobileOnly";

    if (!q.detected) {
        if (!q.keys.length) return "noTasks";
        if (isConsoleOnly(q.keys)) return "consoleOnly";
        const named = q.keys.find(key => key in UNAUTOMATABLE_KEYS);
        if (named) return UNAUTOMATABLE_KEYS[named];
        return "unsupported";
    }

    const { type, target, appId } = q.detected;

    if (!q.isDesktop && (type === "GAME" || type === "STREAM")) return "needsDesktop";
    if (target <= 0) return "invalidTarget";
    if ((type === "GAME" || type === "STREAM") && !appId) return "noAppId";

    return null;
}

/** ¿La Quest ya caducó? NaN/no fecha se trata como vigente (igual que Discord). */
export function isQuestExpired(expiresAt: unknown, now = Date.now()): boolean {
    const end = new Date(expiresAt as any).getTime();
    return !Number.isNaN(end) && end <= now;
}

/** Nombre de juego limpio para fabricar rutas de ejecutable plausibles. */
export function sanitizeName(name: string): string {
    return String(name).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, " ");
}

/**
 * Elige el ejecutable win32 de la app y su ruta relativa.
 *
 * Discord no devuelve `executables[]` en orden estable y a veces incluye builds de test
 * o lanzadores. Se ordenan por preferencia y se deduplica la carpeta del juego.
 */
export function pickExecutable(executables: unknown, cleanName: string): { exeName: string; relPath: string; } {
    const loose = (v: string): string => v.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const fallbackExe = `${cleanName.replace(/\s+/g, "")}.exe`;

    const win32 = (Array.isArray(executables) ? executables : [])
        .filter((x: any) => x?.os === "win32" && typeof x.name === "string" && x.name.length > 0)
        .map((x: any) => x.name.replace(">", "").replace(/\\/g, "/"));
    if (win32.length === 0) return { exeName: fallbackExe, relPath: `${cleanName}/${fallbackExe}` };

    const rank = (n: string): string => [
        /(^|[-_./ ])test([-_. ]|\.exe$)/i.test(n) ? "1" : "0", // build interna
        /launcher/i.test(n) ? "1" : "0", // lanzador, no el juego
        n.includes("/") ? "1" : "0", // hay que adivinar carpeta
        n
    ].join("");
    const chosen = win32.slice().sort((a, b) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0))[0];
    const parts = chosen.split("/").filter(Boolean);
    const exeName = parts[parts.length - 1];
    const dirs = parts.slice(0, -1);
    const alreadyRooted = dirs.length > 0 && loose(dirs[0]) === loose(cleanName);

    return { exeName, relPath: (alreadyRooted ? parts : [cleanName, ...parts]).join("/") };
}

/**
 * Siguiente timestamp (segundos) para `/quests/{id}/video-progress`.
 *
 * Discord rechaza avances por delante del tiempo real transcurrido desde la inscripción
 * (con un pequeño margen), así que el paso nunca supera `elapsed + margen` y nunca baja
 * del progreso actual. El resultado se limita al objetivo.
 */
export function nextVideoTimestamp(current: number, elapsedMs: number, target: number, maxAheadSeconds: number, enrolledAt?: number): number {
    const elapsed = Math.max(0, elapsedMs) / 1000;
    const cap = enrolledAt && enrolledAt > 0 ? Math.floor((Date.now() - enrolledAt) / 1000) + maxAheadSeconds : Infinity;
    const stepped = Math.min(target, current + elapsed);
    return Math.max(current, Math.min(stepped, cap));
}

/** "12 min 30 s" / "1 h 05 min" / "45 s" */
export function formatSeconds(total: number): string {
    const s = Math.max(0, Math.round(total));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rest = s % 60;
    if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
    if (m > 0) return `${m} min ${String(rest).padStart(2, "0")} s`;
    return `${rest} s`;
}

/** Pausa aleatoria dentro de un rango, para no martillear la API con un patrón fijo. */
export function jitter(minMs: number, maxMs: number, random: () => number = Math.random): number {
    const min = Math.min(minMs, maxMs);
    const max = Math.max(minMs, maxMs);
    return Math.floor(random() * (max - min + 1)) + min;
}

