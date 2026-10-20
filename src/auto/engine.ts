/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — motor del modo automático / automation engine.
 *
 * Qué hace, en una frase: acepta la Quest, convence al propio cliente de Discord de que
 * estás viendo el vídeo / jugando / en la actividad (o manda los latidos de actividad
 * que el cliente mandaría), espera a que Discord acredite el progreso y, si lo activas,
 * reclama la recompensa. Una tarea cada vez y con pausas, sin martillear la API.
 *
 * Límites que NO cruza nunca:
 *  - no automatiza logros dentro de actividades (los valida el backend, no el cliente);
 *  - no resuelve captchas ni pide OAuth;
 *  - no envía heartbeats inventados a mano: usa el store del cliente o el endpoint real;
 *  - si Discord marca la cuenta con suspensión de Quests, se para sola.
 *
 * One task at a time, paced. It never automates in-activity achievements, never solves
 * captchas or asks for OAuth, and it stops itself if Discord reports a Quest suspension.
 */

import * as DataStore from "@api/DataStore";
import { ChannelStore, FluxDispatcher, GuildChannelStore, UserStore } from "@webpack/common";

import { StringKey, t } from "../i18n";
import { parseQuest } from "../quests";
import { settings } from "../settings";
import { getQuestStore, logger } from "../store";
import { setAutoEnabledHook, setConsentHook } from "./bridge";
import { FakeGame, startFakeGame, stopAllFakeGames, stopFakeGame } from "./gameSpoof";
import { closeQuestVideoWindow, hideQuestVideo, showQuestVideo } from "./pipVideo";
import { repairPresenceIfNeeded, restorePresence, suppressPresence } from "./presence";
import {
    DetectedTask,
    detectTask,
    formatSeconds,
    isMobileOnly,
    jitter,
    nextVideoTimestamp,
    pickExecutable,
    questBlocker,
    readProgressSeconds,
    sanitizeName,
    selectQuestTaskConfig,
    taskEntries,
    TaskType
} from "./pure";
import {
    claimReward,
    enrollQuest,
    errorMessage,
    fetchApplication,
    httpErrorStatus,
    isTerminalHttpStatus,
    sendHeartbeat,
    sendVideoProgress
} from "./questApi";
import { startFakeStream, stopFakeStream } from "./streamSpoof";

export type AutoPhase = "queued" | "accepting" | "working" | "claiming" | "done" | "claimed" | "failed" | "blocked" | "stopped";

export interface AutoEntry {
    questId: string;
    name: string;
    phase: AutoPhase;
    taskType?: TaskType;
    cur: number;
    max: number;
    detail?: string;
    error?: string;
    updatedAt: number;
}

export interface AutoLogLine {
    time: number;
    level: "info" | "warn" | "error" | "success";
    text: string;
}

export interface AutoSnapshot {
    running: boolean;
    activeQuestId: string | null;
    entries: AutoEntry[];
    log: AutoLogLine[];
}

/* Ritmos y topes / pacing and caps */
const AUTO_TICK_MS = 30_000;
const VIDEO_INTERVAL_MIN = 8_000;
const VIDEO_INTERVAL_MAX = 11_000;
const VIDEO_MAX_TIME = 75 * 60_000;
const GAME_MAX_TIME = 40 * 60_000;
const GAME_FIRST_HEARTBEAT_MS = 100_000;
const ACTIVITY_MAX_TIME = 40 * 60_000;
const STREAM_FIRST_BEAT_MS = 90_000;
const STREAM_MAX_TIME = 6 * 60_000;
const MAX_FAILURES = 5;
const LOG_LIMIT = 200;

interface RunResult {
    ok: boolean;
    error?: string;
}

let running = false;
let consecutiveFailures = 0;
let generation = 0;
let activeQuestId: string | null = null;
let ticking = false;
let tickTimer: ReturnType<typeof setInterval> | undefined;
let manualQueue: string[] = [];
const sessionBlocked = new Set<string>();
/** Reintentos de Quests que fallaron por algo probablemente temporal. */
const retryAt = new Map<string, number>();
const retryAttempts = new Map<string, number>();
/** Recompensas que fallaron al reclamar (captcha): no se reintentan en bucle. */
const claimFailed = new Set<string>();
let lastClaimSweep = 0;
const entries = new Map<string, AutoEntry>();
let logLines: AutoLogLine[] = [];
let snapshot: AutoSnapshot = { running: false, activeQuestId: null, entries: [], log: [] };
const listeners = new Set<() => void>();
let notifier: ((title: string, body: string) => void) | undefined;
/** Cancela la espera en curso (heartbeats) cuando el usuario pulsa STOP. */
let abortCurrent: (() => void) | undefined;

/* ------------------------------------------------------------------ */
/* Estado observable / observable state                                */
/* ------------------------------------------------------------------ */

function publish(): void {
    snapshot = {
        running,
        activeQuestId,
        entries: [...entries.values()],
        log: logLines
    };
    for (const listener of listeners) {
        try {
            listener();
        } catch (e) {
            logger.debug("Auto listener falló", e);
        }
    }
}

function addLog(level: AutoLogLine["level"], text: string): void {
    logLines = [...logLines, { time: Date.now(), level, text }].slice(-LOG_LIMIT);
    if (settings.store.autoLogToConsole) logger.info(`[auto] ${text}`);
    publish();
}

function setEntry(id: string, name: string, patch: Partial<AutoEntry>): void {
    const previous = entries.get(id);
    entries.set(id, {
        questId: id,
        name,
        phase: patch.phase ?? previous?.phase ?? "queued",
        taskType: patch.taskType ?? previous?.taskType,
        cur: patch.cur ?? previous?.cur ?? 0,
        max: patch.max ?? previous?.max ?? 0,
        detail: patch.detail ?? previous?.detail,
        error: patch.error,
        updatedAt: Date.now()
    });
    publish();
}

export function getAutoSnapshot(): AutoSnapshot {
    return snapshot;
}

export function subscribeAuto(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setAutoNotifier(fn: (title: string, body: string) => void): void {
    notifier = fn;
}

function notifyAuto(title: string, body: string): void {
    try {
        notifier?.(title, body);
    } catch (e) {
        logger.debug("Notificación automática falló", e);
    }
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida / lifecycle                                           */
/* ------------------------------------------------------------------ */

export function hasAutoConsent(): boolean {
    return settings.store.autoConsent === true;
}

export function isAutoRunning(): boolean {
    return running;
}

/* ------------------------------------------------------------------ */
/* Quests seleccionadas para el modo "solo seleccionadas"              */
/* ------------------------------------------------------------------ */

const SELECTED_KEY = "QuestTracker_selectedQuests";
const selected = new Set<string>();

export function getSelectedQuestIds(): string[] {
    return [...selected];
}

export function isQuestSelected(questId: string): boolean {
    return selected.has(questId);
}

/** Marca/desmarca una Quest para el modo "solo seleccionadas". */
export function setQuestSelected(questId: string, value: boolean): void {
    if (value) selected.add(questId);
    else selected.delete(questId);
    void DataStore.set(SELECTED_KEY, [...selected])
        .catch(e => logger.debug("No se pudo guardar la selección de Quests", e));
}

async function loadSelectedQuests(): Promise<void> {
    try {
        const list = await DataStore.get<string[]>(SELECTED_KEY);
        if (!Array.isArray(list)) return;
        selected.clear();
        for (const id of list) if (id != null) selected.add(String(id));
    } catch (e) {
        logger.debug("No se pudo leer la selección de Quests", e);
    }
}

/** Prepara el motor al cargar el plugin: repara ajustes y reanuda si estaba activo. */
export function initAuto(notify: (title: string, body: string) => void): void {
    notifier = notify;

    setAutoEnabledHook(value => {
        if (value) {
            if (!startAuto()) settings.store.autoEnabled = false;
        } else {
            stopAuto();
        }
    });
    setConsentHook(value => {
        if (!value) stopAuto();
    });

    void loadSelectedQuests();
    void repairPresenceIfNeeded();
    if (settings.store.autoEnabled) {
        if (hasAutoConsent()) startAuto();
        else settings.store.autoEnabled = false;
    }
}

/** Apaga todo al descargar el plugin. */
export function shutdownAuto(): void {
    setAutoEnabledHook(null);
    setConsentHook(null);
    stopAuto();
    stopAllFakeGames();
    stopFakeStream();
    closeQuestVideoWindow();
    void restorePresence();
}

export function startAuto(): boolean {
    if (!hasAutoConsent()) {
        addLog("warn", t("autoConsentMissing"));
        return false;
    }
    if (running) return true;
    running = true;
    generation++;
    sessionBlocked.clear();
    consecutiveFailures = 0;
    addLog("info", t("autoStarted"));
    startTimer();
    // Un humano no arranca en el mismo instante en que pulsa: pequeño margen.
    const startDelay = humanOn() ? pace(3000, 12000) : 0;
    setTimeout(() => {
        if (running) void tick();
    }, startDelay);
    return true;
}

export function stopAuto(reason?: string, silent = false): void {
    if (!running) {
        // Aun así se limpia lo que pudiera haber quedado a medias.
        abortCurrent?.();
        abortCurrent = undefined;
        stopAllFakeGames();
        stopFakeStream();
        void restorePresence();
        return;
    }
    running = false;
    generation++;
    activeQuestId = null;
    abortCurrent?.();
    abortCurrent = undefined;
    stopTimer();
    manualQueue = [];
    for (const entry of entries.values()) {
        if (entry.phase === "queued" || entry.phase === "accepting" || entry.phase === "working" || entry.phase === "claiming") {
            entry.phase = "stopped";
            entry.updatedAt = Date.now();
        }
    }
    stopAllFakeGames();
    stopFakeStream();
    void restorePresence();
    if (!silent) addLog("info", reason ?? t("autoStopped"));
    publish();
}

function startTimer(): void {
    stopTimer();
    tickTimer = setInterval(() => void tick(), AUTO_TICK_MS);
}

function stopTimer(): void {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = undefined;
}

function alive(gen: number): boolean {
    return running && gen === generation;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Ritmo humano / human-like pacing                                    */
/* ------------------------------------------------------------------ */

function humanOn(): boolean {
    return settings.store.autoHumanPacing !== false;
}

/** Ritmo rápido: mismas pausas, pero más cortas (ajuste `autoFastPacing`). */
function fastPacing(): boolean {
    return settings.store.autoFastPacing === true;
}

/** Jitter con escala: si el ritmo rápido está activo, acorta la espera al 40 %. */
function pace(minMs: number, maxMs: number): number {
    if (!fastPacing()) return jitter(minMs, maxMs);
    const min = Math.max(300, Math.round(minMs * 0.4));
    const max = Math.max(min + 200, Math.round(maxMs * 0.4));
    return jitter(min, max);
}

/** Pausa "de pensar" antes de actuar; devuelve false si se detuvo el motor. */
async function think(gen: number, minMs: number, maxMs: number): Promise<boolean> {
    if (!humanOn()) return alive(gen);
    await sleep(pace(minMs, maxMs));
    return alive(gen);
}

/** Mantiene una tarea "abierta" un rato más, comprobando que sigue activa. */
async function keepAliveFor(gen: number, minMs: number, maxMs: number): Promise<void> {
    if (!humanOn()) return;
    let left = pace(minMs, maxMs);
    while (left > 0 && alive(gen)) {
        const step = Math.min(left, 5000);
        await sleep(step);
        left -= step;
    }
}

/** Pausa entre Quests: un humano no encadena una detrás de otra al instante. */
function questGapMs(): number {
    return humanOn() ? pace(20_000, 80_000) : 1500;
}

/* ------------------------------------------------------------------ */
/* Peticiones manuales / manual requests                               */
/* ------------------------------------------------------------------ */

/** Pone una Quest concreta en la cola. Devuelve false sin consentimiento. */
export function autoCompleteQuest(questId: string): boolean {
    if (!hasAutoConsent()) {
        addLog("warn", t("autoConsentMissing"));
        return false;
    }
    const quest = findRawQuest(questId);
    const name = quest ? questName(quest) : questId;
    if (!manualQueue.includes(questId)) manualQueue.push(questId);
    setEntry(questId, name, { phase: "queued", detail: t("autoQueued") });
    if (!running) startAuto();
    else void tick();
    return true;
}

/** Quita una Quest de la cola (no detiene la que ya está en marcha). */
export function cancelAutoQuest(questId: string): void {
    manualQueue = manualQueue.filter(id => id !== questId);
    const entry = entries.get(questId);
    if (entry && (entry.phase === "queued" || entry.phase === "accepting")) {
        setEntry(questId, entry.name, { phase: "stopped", detail: t("autoCancelled") });
    }
}

/** Enciende o apaga el modo automático respetando el consentimiento. */
export function setAutoEnabled(enabled: boolean): boolean {
    if (enabled) {
        if (!hasAutoConsent()) return false;
        settings.store.autoEnabled = true;
        return startAuto();
    }
    settings.store.autoEnabled = false;
    stopAuto();
    return true;
}

/** Reclama una recompensa a petición del usuario (botón del panel). */
export async function claimQuestNow(questId: string): Promise<boolean> {
    const quest = findRawQuest(questId);
    const name = quest ? questName(quest) : questId;
    setEntry(questId, name, { phase: "claiming", detail: t("autoClaiming") });
    try {
        await claimReward(questId);
        setEntry(questId, name, { phase: "claimed", detail: t("autoClaimedDetail") });
        addLog("success", t("autoClaimed", { name }));
        return true;
    } catch (e) {
        setEntry(questId, name, { phase: "done", detail: t("autoClaimManually"), error: t("autoCaptcha") });
        addLog("warn", `${t("autoClaimNowFailed")}: ${errorMessage(e)}`);
        notifyAuto(t("notifAutoClaimFailedTitle"), t("notifAutoClaimFailedBody", { name }));
        return false;
    }
}

/** Vacía el registro del panel. */
export function clearAutoLog(): void {
    logLines = [];
    publish();
}

/* ------------------------------------------------------------------ */
/* Bucle de selección / scheduler                                      */
/* ------------------------------------------------------------------ */

/** Reclama recompensas ya completadas que quedaron pendientes (una por vuelta). */
async function claimSweep(): Promise<void> {
    if (!settings.store.autoClaimRewards || !hasAutoConsent()) return;
    if (Date.now() - lastClaimSweep < 20_000) return;
    lastClaimSweep = Date.now();
    try {
        const target = readRawQuests().find(quest => {
            const id = String(quest?.id ?? "");
            return id
                && !claimFailed.has(id)
                && !!quest.userStatus?.completedAt
                && !quest.userStatus?.claimedAt
                && !isExpired(quest);
        });
        if (!target) return;
        const ok = await claimQuestNow(String(target.id));
        if (!ok) claimFailed.add(String(target.id));
    } catch (e) {
        logger.debug("No se pudieron reclamar recompensas pendientes", e);
    }
}

async function tick(): Promise<void> {
    if (ticking || !running) return;
    ticking = true;
    const gen = generation;
    try {
        if (activeQuestId) return;

        if (isSuspended()) {
            stopAuto(t("autoSuspended"));
            notifyAuto(t("notifAutoSuspendedTitle"), t("notifAutoSuspendedBody"));
            return;
        }

        await claimSweep();
        if (!alive(gen) || activeQuestId) return;

        const quests = readRawQuests();
        const candidate = pickCandidate(quests);
        if (!candidate) {
            if (!settings.store.autoEnabled && !manualQueue.length) stopAuto(undefined, true);
            return;
        }

        // Un humano no empieza a la décima de segundo: se lo piensa un poco.
        if (!await think(gen, 3000, 9000)) return;
        if (activeQuestId) return;

        activeQuestId = String(candidate.id);
        publish();
        try {
            await runQuest(candidate, gen);
        } finally {
            if (alive(gen)) {
                activeQuestId = null;
                publish();
            }
        }

        if (!alive(gen)) return;
        // Siguiente vuelta con una pausa entre Quests, como una persona.
        setTimeout(() => {
            if (alive(gen)) void tick();
        }, questGapMs());
    } catch (e) {
        addLog("error", `${t("autoFailed")}: ${errorMessage(e)}`);
        logger.error("Auto tick failed", e);
    } finally {
        ticking = false;
    }
}

function pickCandidate(quests: any[]): any | null {
    const byId = new Map(quests.map(q => [String(q.id), q]));

    /* 1. Peticiones manuales, por orden de llegada */
    for (const id of [...manualQueue]) {
        const quest = byId.get(id);
        if (!quest) {
            manualQueue = manualQueue.filter(x => x !== id);
            setEntry(id, id, { phase: "failed", error: t("autoGone") });
            continue;
        }
        if (isQuestDone(quest)) {
            manualQueue = manualQueue.filter(x => x !== id);
            setEntry(id, questName(quest), { phase: "done", detail: t("autoAlreadyDone") });
            continue;
        }
        return quest;
    }

    /* 2. Modo automático: solo si el interruptor está encendido */
    if (!settings.store.autoEnabled) return null;

    const onlySelected = settings.store.autoScope === "selected";
    const now = Date.now();
    const eligible = quests.filter(quest => {
        if (onlySelected && !selected.has(String(quest.id))) return false;
        if (sessionBlocked.has(String(quest.id))) return false;
        if ((retryAt.get(String(quest.id)) ?? 0) > now) return false;
        if (isQuestDone(quest)) return false;
        if (isExpired(quest)) return false;
        // Nunca intentar Quests que solo valida la app móvil.
        if (isMobileOnly(taskEntries(quest?.config?.tasks).map(([key]) => key))) return false;
        if (!quest.userStatus?.enrolledAt && !settings.store.autoAccept) return false;
        const detected = detectFor(quest);
        return !!detected && typeEnabled(detected.type);
    });

    eligible.sort((a, b) => {
        const aEnrolled = a.userStatus?.enrolledAt ? 0 : 1;
        const bEnrolled = b.userStatus?.enrolledAt ? 0 : 1;
        if (aEnrolled !== bEnrolled) return aEnrolled - bEnrolled;

        const aExpiry = new Date(a.config?.expiresAt ?? 0).getTime() || Infinity;
        const bExpiry = new Date(b.config?.expiresAt ?? 0).getTime() || Infinity;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;

        return percentOf(b) - percentOf(a);
    });

    return eligible[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Ejecución de una Quest / running one quest                          */
/* ------------------------------------------------------------------ */

async function runQuest(quest: any, gen: number): Promise<void> {
    const id = String(quest.id);
    const name = questName(quest);
    const taskConfig = selectQuestTaskConfig(quest.config);
    const keys = taskEntries(taskConfig?.tasks).map(([key]) => key);
    const legacyAppId = quest.config?.application?.id ?? null;
    const detected = detectTask(taskConfig, legacyAppId);
    const isDesktop = isDesktopClient();

    setEntry(id, name, { phase: "working", taskType: detected?.type, cur: 0, max: detected?.target ?? 0, detail: t("autoChecking") });

    const blocker = questBlocker({ name, keys, detected, isDesktop });
    if (blocker || !detected) {
        blockQuest(id, name, t((blocker ?? "unsupported") as StringKey));
        return;
    }
    if (!typeEnabled(detected.type)) {
        blockQuest(id, name, t("autoTypeDisabled"));
        return;
    }
    if (detected.type === "ACHIEVEMENT") {
        blockQuest(id, name, t("achievementActivity"));
        return;
    }

    /* Aceptar la Quest si aún no lo está */
    if (!quest.userStatus?.enrolledAt) {
        const manual = manualQueue.includes(id);
        if (!settings.store.autoAccept && !manual) {
            blockQuest(id, name, t("autoNotAccepted"));
            return;
        }
        setEntry(id, name, { phase: "accepting", taskType: detected.type, detail: t("autoEnrolling") });
        try {
            await enrollQuest(id);
            addLog("info", t("autoAccepted", { name }));
        } catch (e) {
            failQuest(id, name, `${t("autoEnrollFailed")}: ${errorMessage(e)}`);
            return;
        }
        if (!alive(gen)) return;
        // Tras aceptarla, un momento antes de empezar (leer la Quest, etc.).
        if (!await think(gen, 1500, 4000)) return;
    }

    const startProgress = readProgressSeconds(quest.userStatus, detected.keyName);
    if (startProgress >= detected.target) {
        await finishQuest(id, name, detected, detected.target, gen, startProgress);
        return;
    }

    let result: RunResult;
    switch (detected.type) {
        case "VIDEO":
            result = await runVideo(quest, id, name, detected, gen);
            break;
        case "GAME":
            result = await runGame(quest, id, name, detected, gen);
            break;
        case "STREAM":
            result = await runStream(quest, id, name, detected, gen);
            break;
        default:
            result = await runActivity(quest, id, name, detected, gen);
            break;
    }

    if (!alive(gen)) return;

    if (result.ok) {
        await finishQuest(id, name, detected, detected.target, gen);
    } else {
        failQuest(id, name, result.error ?? t("autoFailed"));
    }
}

/* ---------------------------- Vídeo ------------------------------- */

async function runVideo(quest: any, id: string, name: string, detected: DetectedTask, gen: number): Promise<RunResult> {
    const { target } = detected;
    let current = readProgressSeconds(quest.userStatus, detected.keyName);
    const enrolledAt = new Date(quest.userStatus?.enrolledAt ?? Date.now()).getTime() || Date.now();
    const startedAt = Date.now();
    let lastReportAt = Date.now();
    let failures = 0;

    // El vídeo real de la Quest se ve en la ventana flotante mientras se completa.
    const info = parseQuest(quest, Date.now());
    if (settings.store.autoVideoPip) void showQuestVideo(info?.videoUrl, name);

    setEntry(id, name, { phase: "working", taskType: "VIDEO", cur: current, max: target, detail: t("autoWatching") });

    try {
        while (alive(gen) && current < target) {
            const interval = humanOn()
                ? pace(9_000, 14_000)
                : jitter(VIDEO_INTERVAL_MIN, VIDEO_INTERVAL_MAX);
            await sleep(interval);
            if (!alive(gen)) return { ok: false, error: t("autoStopped") };

            const timestamp = nextVideoTimestamp(current, Date.now() - lastReportAt, target, 10, enrolledAt);
            lastReportAt = Date.now();

            try {
                const response: any = await sendVideoProgress(id, timestamp);
                failures = 0;
                const served = response?.body?.progress?.[detected.keyName]?.value;
                current = typeof served === "number" && served > current ? served : Math.max(current, timestamp);

                setEntry(id, name, { phase: "working", taskType: "VIDEO", cur: current, max: target, detail: t("autoWatching") });

                if (response?.body?.completed_at != null || current >= target) {
                    return { ok: true };
                }
            } catch (e) {
                const status = httpErrorStatus(e);
                if (isTerminalHttpStatus(status)) {
                    return { ok: false, error: `${t("autoClientError")} (HTTP ${status}). ${errorMessage(e)}` };
                }
                if (++failures >= MAX_FAILURES) {
                    return { ok: false, error: `${t("autoNetwork")}: ${errorMessage(e)}` };
                }
                addLog("warn", `${t("autoRetry")} ${failures}/${MAX_FAILURES}: ${errorMessage(e)}`);
            }

            if (Date.now() - startedAt > VIDEO_MAX_TIME) return { ok: false, error: t("autoTimeout") };
        }

        return alive(gen)
            ? { ok: true }
            : { ok: false, error: t("autoStopped") };
    } finally {
        hideQuestVideo();
    }
}

/* ----------------------- Juego de escritorio ---------------------- */

async function runGame(quest: any, id: string, name: string, detected: DetectedTask, gen: number): Promise<RunResult> {
    const { appId } = detected;
    if (!appId) return { ok: false, error: t("noAppId") };

    let app: any = null;
    try {
        app = await fetchApplication(appId);
    } catch (e) {
        logger.debug("No se pudieron leer metadatos de la app; se usa el nombre de la Quest", e);
    }

    const cleanName = sanitizeName(app?.name ?? name);
    const { exeName, relPath } = pickExecutable(app?.executables, cleanName);
    const pid = jitter(3000, 15000) * 4;
    const game: FakeGame = {
        id: String(appId),
        name: app?.name ?? name,
        icon: app?.icon,
        pid,
        pidPath: [pid],
        processName: cleanName,
        start: Date.now(),
        exeName,
        exePath: `c:/program files/${relPath.toLowerCase()}`,
        cmdLine: `C:\\Program Files\\${relPath.replace(/\//g, "\\")}`,
        executables: [{ os: "win32", name: exeName, is_launcher: false }],
        windowHandle: 0,
        fullscreenType: 0,
        overlay: true,
        sandboxed: false,
        hidden: false,
        isLauncher: false
    };

    if (settings.store.autoHideActivity) await suppressPresence();
    setEntry(id, name, {
        phase: "working",
        taskType: "GAME",
        cur: readProgressSeconds(quest.userStatus, detected.keyName),
        max: detected.target,
        detail: t("autoPlaying", { game: game.name })
    });

    startFakeGame(game);
    try {
        const result = await waitForHeartbeat(id, detected.keyName, detected.target, gen, current => {
            setEntry(id, name, { phase: "working", taskType: "GAME", cur: current, max: detected.target, detail: t("autoPlaying", { game: game.name }) });
        }, GAME_FIRST_HEARTBEAT_MS, GAME_MAX_TIME);

        // Si no hubo ni un latido, Discord no reconoció el juego: mejor decirlo claro.
        if (!result.ok && result.error === "no-heartbeat") {
            return { ok: false, error: t("autoNoHeartbeat", { minutes: Math.round(GAME_FIRST_HEARTBEAT_MS / 60000) }) };
        }
        if (result.ok) {
            // Un humano no cierra el juego justo al cruzar el objetivo: se queda abierto un rato.
            await keepAliveFor(gen, 45_000, 180_000);
        }
        return result.ok ? result : { ok: false, error: result.error ?? t("autoFailed") };
    } finally {
        stopFakeGame(pid);
        if (settings.store.autoHideActivity) await restorePresence();
    }
}

/* ---------------------------- Stream ------------------------------ */

async function runStream(quest: any, id: string, name: string, detected: DetectedTask, gen: number): Promise<RunResult> {
    const { appId } = detected;
    if (!appId) return { ok: false, error: t("noAppId") };

    let app: any = null;
    try {
        app = await fetchApplication(appId);
    } catch { /* opcional */ }

    if (!startFakeStream({ id: appId, name: app?.name ?? name, pid: jitter(3000, 15000), sourceName: app?.name ?? name })) {
        return { ok: false, error: t("streamNeedsRealLive") };
    }

    setEntry(id, name, { phase: "working", taskType: "STREAM", cur: readProgressSeconds(quest.userStatus, detected.keyName), max: detected.target, detail: t("autoStreaming") });
    try {
        const result = await waitForHeartbeat(id, detected.keyName, detected.target, gen, current => {
            setEntry(id, name, { phase: "working", taskType: "STREAM", cur: current, max: detected.target, detail: t("autoStreaming") });
        }, STREAM_FIRST_BEAT_MS, STREAM_MAX_TIME);

        if (!result.ok) return { ok: false, error: t("streamNeedsRealLive") };
        return result;
    } finally {
        stopFakeStream();
    }
}

/* -------------------------- Actividad ----------------------------- */

async function runActivity(quest: any, id: string, name: string, detected: DetectedTask, gen: number): Promise<RunResult> {
    const streamKey = findStreamKey();
    if (!streamKey) return { ok: false, error: t("autoNoVoice") };

    const { target } = detected;
    let current = readProgressSeconds(quest.userStatus, detected.keyName);
    const startedAt = Date.now();
    let failures = 0;
    let stalled = 0;

    setEntry(id, name, { phase: "working", taskType: "ACTIVITY", cur: current, max: target, detail: t("autoActivity") });

    while (alive(gen) && current < target) {
        try {
            const response: any = await sendHeartbeat(id, streamKey, detected.appId, false);
            failures = 0;
            const reported = response?.body?.progress?.[detected.keyName]?.value;
            if (typeof reported === "number") {
                current = reported;
                stalled = 0;
            } else if (++stalled >= MAX_FAILURES) {
                return { ok: false, error: t("autoNoProgress") };
            }

            setEntry(id, name, { phase: "working", taskType: "ACTIVITY", cur: current, max: target, detail: t("autoActivity") });

            if (current >= target) {
                try {
                    await sendHeartbeat(id, streamKey, detected.appId, true);
                } catch (e) {
                    logger.debug("Heartbeat terminal falló", e);
                }
                return { ok: true };
            }
        } catch (e) {
            const status = httpErrorStatus(e);
            if (isTerminalHttpStatus(status)) {
                return { ok: false, error: `${t("autoClientError")} (HTTP ${status}). ${errorMessage(e)}` };
            }
            if (++failures >= MAX_FAILURES) {
                return { ok: false, error: `${t("autoNetwork")}: ${errorMessage(e)}` };
            }
        }

        if (Date.now() - startedAt > ACTIVITY_MAX_TIME) return { ok: false, error: t("autoTimeout") };
        await sleep(humanOn() ? jitter(22_000, 27_000) : jitter(19_000, 22_000));
    }

    return alive(gen) ? { ok: true } : { ok: false, error: t("autoStopped") };
}

/* ------------------------------------------------------------------ */
/* Espera de heartbeats del cliente / waiting for the client's beats   */
/* ------------------------------------------------------------------ */

function waitForHeartbeat(
    questId: string,
    key: string,
    target: number,
    gen: number,
    onProgress: (current: number) => void,
    firstBeatMs: number,
    overallMs: number
): Promise<RunResult> {
    return new Promise<RunResult>(resolve => {
        let settled = false;
        let anyBeat = false;
        let failures = 0;

        const cleanup = () => {
            clearTimeout(firstBeatTimer);
            clearTimeout(overallTimer);
            abortCurrent = undefined;
            try {
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onSuccess);
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onFailure);
            } catch (e) {
                logger.debug("No se pudo desuscribir de heartbeats", e);
            }
        };

        const settle = (result: RunResult) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
        };

        // STOP tiene que desbloquear esta espera: si no, el motor se quedaría colgado
        // en un await y no volvería a arrancar.
        abortCurrent = () => settle({ ok: false, error: "stopped" });

        const onSuccess = (data: any) => {
            if (settled) return;
            if (!alive(gen)) return settle({ ok: false, error: "stopped" });
            if (String(data?.questId) !== questId) return;

            anyBeat = true;
            failures = 0;
            const current = readProgressSeconds(data?.userStatus, key);
            onProgress(current);
            if (current >= target) settle({ ok: true });
        };

        const onFailure = (data: any) => {
            if (settled) return;
            if (String(data?.questId) !== questId) return;
            failures++;
            const status = httpErrorStatus(data?.error ?? data);
            addLog("warn", `${t("autoHeartbeatFailed")} ${failures}/${MAX_FAILURES}${status ? ` (HTTP ${status})` : ""}`);
            if (failures >= MAX_FAILURES) settle({ ok: false, error: t("autoHeartbeatErrors") });
        };

        const firstBeatTimer = setTimeout(() => {
            if (!anyBeat && !settled) settle({ ok: false, error: "no-heartbeat" });
        }, firstBeatMs);

        const overallTimer = setTimeout(() => settle({ ok: false, error: t("autoTimeout") }), overallMs);

        try {
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onSuccess);
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onFailure);
        } catch (e) {
            settle({ ok: false, error: errorMessage(e) });
        }
    });
}

/* ------------------------------------------------------------------ */
/* Terminar, reclamar o fallar / finish, claim or fail                 */
/* ------------------------------------------------------------------ */

async function finishQuest(id: string, name: string, detected: DetectedTask, target: number, gen: number, current?: number): Promise<void> {
    manualQueue = manualQueue.filter(x => x !== id);
    consecutiveFailures = 0;
    retryAt.delete(id);
    retryAttempts.delete(id);
    claimFailed.delete(id);
    const cur = current ?? target;

    if (!settings.store.autoClaimRewards) {
        setEntry(id, name, {
            phase: "done",
            taskType: detected.type,
            cur,
            max: target,
            detail: t("autoClaimManually")
        });
        addLog("success", t("autoCompleted", { name }));
        notifyAuto(t("notifAutoDoneTitle"), t("notifAutoDoneBody", { name }));
        return;
    }

    setEntry(id, name, { phase: "claiming", taskType: detected.type, cur, max: target, detail: t("autoClaiming") });
    // Un humano tarda un poco en ir a reclamar la recompensa.
    if (!await think(gen, 8000, 30000)) return;
    try {
        const response: any = await claimReward(id);
        const claimed = response?.body?.claimed_at != null || response?.status === 204;
        if (!alive(gen)) return;
        if (claimed) {
            setEntry(id, name, { phase: "claimed", taskType: detected.type, cur, max: target, detail: t("autoClaimedDetail") });
            addLog("success", t("autoClaimed", { name }));
            notifyAuto(t("notifAutoClaimedTitle"), t("notifAutoClaimedBody", { name }));
        } else {
            setEntry(id, name, { phase: "done", taskType: detected.type, cur, max: target, detail: t("autoClaimManually") });
            addLog("warn", t("autoClaimUnconfirmed", { name }));
        }
    } catch (e) {
        // Lo más habitual aquí es que Discord pida captcha: se deja para el usuario.
        setEntry(id, name, {
            phase: "done",
            taskType: detected.type,
            cur,
            max: target,
            detail: t("autoClaimManually"),
            error: t("autoCaptcha")
        });
        addLog("warn", `${t("autoCaptcha")} ${errorMessage(e)}`);
        notifyAuto(t("notifAutoDoneTitle"), t("notifAutoDoneBody", { name }));
    }
}

function failQuest(id: string, name: string, reason: string): void {
    manualQueue = manualQueue.filter(x => x !== id);
    const attempts = (retryAttempts.get(id) ?? 0) + 1;
    if (settings.store.autoRetry !== false && attempts <= 2) {
        retryAttempts.set(id, attempts);
        const waitMs = jitter(120_000, 300_000);
        retryAt.set(id, Date.now() + waitMs);
        const min = Math.round(waitMs / 60_000);
        setEntry(id, name, { phase: "failed", error: reason });
        addLog("warn", t("autoRetryScheduled", { name, min, n: attempts }));
        return;
    }
    retryAt.delete(id);
    retryAttempts.delete(id);
    sessionBlocked.add(id);
    setEntry(id, name, { phase: "failed", error: reason });
    addLog("error", `${name}: ${reason}`);
    notifyAuto(t("notifAutoErrorTitle"), `${name}: ${reason}`);

    // Seguridad de la cuenta: si fallan muchas seguidas, se para solo.
    consecutiveFailures++;
    if (consecutiveFailures >= 5) {
        addLog("error", t("autoTooManyFailures"));
        notifyAuto(t("notifAutoErrorTitle"), t("autoTooManyFailures"));
        stopAuto(t("autoTooManyFailures"));
    }
}

function blockQuest(id: string, name: string, reason: string): void {
    sessionBlocked.add(id);
    manualQueue = manualQueue.filter(x => x !== id);
    setEntry(id, name, { phase: "blocked", error: reason });
    addLog("warn", `${name}: ${reason}`);
}

/* ------------------------------------------------------------------ */
/* Utilidades de Quests / quest helpers                                */
/* ------------------------------------------------------------------ */

function readRawQuests(): any[] {
    const store = getQuestStore();
    if (!store) return [];
    let raw: any;
    try {
        raw = store.quests ?? store.getQuests?.();
    } catch {
        return [];
    }
    if (!raw) return [];
    if (typeof raw.values === "function") {
        try {
            return Array.from(raw.values());
        } catch {
            return [];
        }
    }
    if (Array.isArray(raw)) return raw;
    return Object.values(raw);
}

function findRawQuest(questId: string): any | undefined {
    return readRawQuests().find(quest => String(quest.id) === questId);
}

function questName(quest: any): string {
    return quest?.config?.messages?.questName
        ?? quest?.config?.messages?.quest_name
        ?? quest?.config?.application?.name
        ?? String(quest?.id ?? "?");
}

function isQuestDone(quest: any): boolean {
    return !!(quest?.userStatus?.completedAt || quest?.userStatus?.claimedAt);
}

function isExpired(quest: any): boolean {
    const store = getQuestStore();
    if (typeof store?.isQuestExpired === "function") {
        try {
            return store.isQuestExpired(quest.id) === true;
        } catch { /* se usa la fecha */ }
    }
    const end = new Date(quest?.config?.expiresAt ?? NaN).getTime();
    return !Number.isNaN(end) && end <= Date.now();
}

function detectFor(quest: any): DetectedTask | null {
    const taskConfig = selectQuestTaskConfig(quest?.config);
    return detectTask(taskConfig, quest?.config?.application?.id);
}

function typeEnabled(type: TaskType): boolean {
    switch (type) {
        case "VIDEO": return settings.store.autoVideos;
        case "GAME": return settings.store.autoGames;
        case "STREAM": return settings.store.autoStreams;
        case "ACTIVITY": return settings.store.autoActivities;
        default: return false;
    }
}

function percentOf(quest: any): number {
    const detected = detectFor(quest);
    if (!detected || detected.target <= 0) return 0;
    return Math.min(1, readProgressSeconds(quest?.userStatus, detected.keyName) / detected.target);
}

/** ¿Discord ha suspendido el acceso a Quests de esta cuenta? */
function isSuspended(): boolean {
    const store = getQuestStore() as any;
    if (!store) return false;
    try {
        const until = new Date(store.questAccessSuspendedUntil ?? NaN).getTime();
        if (!Number.isNaN(until) && until > Date.now()) return true;
        return store.isQuestAccessSuspended === true;
    } catch {
        return false;
    }
}

function isDesktopClient(): boolean {
    return typeof (window as any).DiscordNative !== "undefined";
}

/**
 * Clave de stream (`call:<canal>:<usuario>` o `guild:<servidor>:<canal>:<usuario>`) que
 * espera el heartbeat de actividad. Prefiere una llamada privada y cae a un canal de voz.
 */
function findStreamKey(): string | null {
    try {
        const ownerId = UserStore?.getCurrentUser?.()?.id;
        if (!ownerId) return null;

        const dmChannelId = (ChannelStore as any)?.getSortedPrivateChannels?.()?.[0]?.id;
        if (dmChannelId) return `call:${dmChannelId}:${ownerId}`;

        const guilds = (GuildChannelStore as any)?.getAllGuilds?.() ?? {};
        for (const guild of Object.values<any>(guilds)) {
            const voiceChannel = guild?.VOCAL?.[0]?.channel;
            const guildId = voiceChannel?.guild_id ?? guild?.id;
            if (voiceChannel?.id && guildId) return `guild:${guildId}:${voiceChannel.id}:${ownerId}`;
        }
        return null;
    } catch (e) {
        logger.debug("No se pudo calcular la clave de stream", e);
        return null;
    }
}

/** Texto de progreso para el panel ("12 min 30 s de 15 min"). */
export function progressText(entry: AutoEntry): string | undefined {
    if (!entry.max) return undefined;
    return `${formatSeconds(entry.cur)} / ${formatSeconds(entry.max)}`;
}
