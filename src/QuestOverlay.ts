/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — panel flotante con el progreso dentro de la página de Misiones.
 *
 * Se monta solo en Discord → Misiones (/quest-home) y muestra todas las Quests con su
 * progreso, recompensa, tiempo restante y estado. Desde su cabecera puedes:
 *   - arrastrarlo a donde quieras (y recuerda la posición),
 *   - abrir el panel completo,
 *   - maximizar/restaurar (más ancho y con detalle),
 *   - minimizar a una pastilla,
 *   - detener o activar la automatización.
 * Vive en su propio contenedor (nunca dentro del DOM de React de Discord) para no
 * romper la página si Discord cambia.
 *
 * Floating, draggable quest-progress panel on Discord's own Quests page. Position is
 * remembered; header controls open the full panel, maximize/restore, minimize and
 * stop/start automation.
 */

import * as DataStore from "@api/DataStore";

import { getAutoSnapshot, setAutoEnabled } from "./auto/engine";
import { formatDuration, StringKey, t } from "./i18n";
import { openQuestPanel } from "./QuestPanel";
import { isExpiringSoon, QuestInfo, QuestStatus, readQuestsFrom } from "./quests";
import { settings } from "./settings";
import { getQuestStore, logger, subscribeStore } from "./store";

const CONTAINER_ID = "vc-qt-questpage";
const POS_KEY = "QuestTracker_overlayPos";
const WIDTH_KEY = "QuestTracker_overlayWidth";

type OverlayMode = "normal" | "wide" | "mini";

const STATUS_KEYS: Record<QuestStatus, StringKey> = {
    available: "statusAvailable",
    inProgress: "statusInProgress",
    completed: "statusCompleted",
    claimed: "statusClaimed",
    expired: "statusExpired"
};
const STATUS_ORDER: Record<QuestStatus, number> = {
    completed: 0,
    inProgress: 1,
    available: 2,
    claimed: 3,
    expired: 4
};

let container: HTMLDivElement | null = null;
let routerTimer: ReturnType<typeof setInterval> | undefined;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let refreshDebounce: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;
let resizeBound = false;
let visibilityBound = false;
let lastSignature = "";
let mode: OverlayMode = "normal";

function setMode(next: OverlayMode): void {
    mode = next;
    customWidth = null;
    void DataStore.del(WIDTH_KEY).catch(() => { });
    lastSignature = "";
    refresh();
}

/**
 * ¿Estamos en la página de Misiones de Discord?
 * Solo mira la ruta: leer `document.body.innerText` cada segundo obliga a Discord a
 * recalcular el layout de toda la página y era el mayor coste del panel.
 */
function isQuestPage(): boolean {
    try {
        const path = location.pathname;
        return path.startsWith("/quest-home") || path.startsWith("/quests");
    } catch {
        return false;
    }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function iconButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const button = el("button", "vc-qt-overlay-icon", icon);
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", event => {
        event.stopPropagation();
        onClick();
    });
    return button;
}

function sortQuests(list: QuestInfo[]): QuestInfo[] {
    return [...list]
        .filter(q => q.status !== "expired")
        .sort((a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
            || (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));
}

function autoLine(): string {
    const snapshot = getAutoSnapshot();
    if (!snapshot.running) return t("overlayAutoOff");
    const active = snapshot.activeQuestId ? snapshot.entries.find(e => e.questId === snapshot.activeQuestId) : undefined;
    if (!active) return t("overlayAutoWaiting");
    const pct = active.max > 0 ? Math.round(Math.min(1, active.cur / active.max) * 100) : 0;
    return active.max > 0
        ? t("overlayAutoWorkingPct", { name: active.name, p: pct })
        : t("overlayAutoWorking", { name: active.name });
}

function buildHeader(quests: QuestInfo[]): HTMLElement {
    const { running } = getAutoSnapshot();
    const head = el("div", "vc-qt-overlay-head");

    const title = el("div", "vc-qt-overlay-title", `🏆 ${t("overlayTitle")}`);
    title.title = t("overlayTitle");

    const actions = el("div", "vc-qt-overlay-actions");
    actions.append(
        iconButton(mode === "mini" ? "▢" : "—", t(mode === "mini" ? "overlayExpand" : "overlayMinimize"), () => setMode(mode === "mini" ? "normal" : "mini")),
        iconButton("⛶", t(mode === "wide" ? "overlayRestore" : "overlayMaximize"), () => setMode(mode === "wide" ? "normal" : "wide")),
        iconButton(running ? "⏹" : "▶", t(running ? "overlayStop" : "overlayStart"), () => {
            setAutoEnabled(!getAutoSnapshot().running);
            lastSignature = "";
            refresh();
        })
    );

    const openBtn = mode === "mini"
        ? iconButton("▤", t("overlayOpenPanel"), () => openQuestPanel())
        : el("button", "vc-qt-overlay-btn", t("overlayOpenPanel"));
    if (openBtn instanceof HTMLButtonElement && !openBtn.title) {
        openBtn.type = "button";
        openBtn.addEventListener("click", event => {
            event.stopPropagation();
            openQuestPanel();
        });
    }
    actions.append(openBtn);

    head.append(title, actions);

    const wrap = el("div");
    wrap.append(head);

    const auto = el("div", "vc-qt-overlay-auto" + (running ? "" : " vc-qt-overlay-auto-off"), autoLine());
    wrap.append(auto);

    if (mode === "mini") {
        const counts = quests.filter(q => q.status === "inProgress" || q.status === "completed").length;
        wrap.append(el("div", "vc-qt-overlay-mini", `${counts}/${quests.length}`));
        return wrap;
    }

    const inProgress = quests.filter(q => q.status === "inProgress").length;
    const claimable = quests.filter(q => q.status === "completed").length;
    const summary = el("div", "vc-qt-overlay-summary",
        `${inProgress} ${t("summaryInProgress")} · ${claimable} ${t("summaryClaimable")}`);
    wrap.append(summary);
    return wrap;
}

function buildRow(quest: QuestInfo): HTMLElement {
    const pct = Math.round(quest.progress * 100);
    const mobileOnly = quest.tasks.length > 0 && quest.tasks.every(task => /MOBILE$/i.test(task.key));
    const row = el("div", "vc-qt-overlay-row vc-qt-overlay-row-" + quest.status);
    row.title = `${quest.name} · ${quest.reward} · ${pct}%`;
    row.addEventListener("click", () => openQuestPanel());

    const top = el("div", "vc-qt-overlay-top");
    const name = el("div", "vc-qt-overlay-name", quest.name);
    const pctEl = el("span", "vc-qt-overlay-pct", `${pct}%`);
    const status = el("span", "vc-qt-overlay-status vc-qt-overlay-status-" + (mobileOnly ? "mobile" : quest.status),
        t(mobileOnly ? "overlayMobile" : STATUS_KEYS[quest.status]));
    if (mobileOnly) status.title = t("mobileOnly");
    top.append(name, pctEl, status);

    const bar = el("div", "vc-qt-overlay-bar");
    const fill = el("div", "vc-qt-overlay-fill vc-qt-overlay-fill-" + quest.status);
    fill.style.width = `${pct}%`;
    bar.append(fill);

    const meta = el("div", "vc-qt-overlay-meta");
    const reward = el("span", undefined, `🎁 ${quest.reward}`);
    const right = el("span", undefined, mobileOnly
        ? t("overlayMobileHint")
        : quest.status === "completed" || quest.status === "claimed"
            ? t("overlayClaimable")
            : quest.expiresAt
                ? `${t("timeLeft")}: ${formatDuration(quest.expiresAt - Date.now())}`
                : "");
    if (quest.expiresAt && isExpiringSoon(quest, settings.store.expiryHours ?? 24)) {
        right.classList.add("vc-qt-overlay-soon");
    }
    meta.append(reward, right);

    row.append(top, bar, meta);
    return row;
}

/* ------------------------------------------------------------------ */
/* Arrastrar y recordar la posición / drag and remember position       */
/* ------------------------------------------------------------------ */

let savedPos: { left: number; top: number; } | null = null;
let customWidth: number | null = null;
let posRequested = false;

const MIN_WIDTH = 300;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function defaultWidth(): number {
    return mode === "wide" ? 470 : mode === "mini" ? 280 : 330;
}

function currentWidth(): number {
    return customWidth ?? defaultWidth();
}

function applyPos(): void {
    if (!container || !savedPos) return;
    const width = container.offsetWidth || currentWidth();
    container.style.left = `${clamp(savedPos.left, 0, window.innerWidth - width - 8)}px`;
    container.style.top = `${clamp(savedPos.top, 0, window.innerHeight - 60)}px`;
    container.style.right = "auto";
}

function setPos(left: number, top: number): void {
    savedPos = { left, top };
    applyPos();
}

function setWidth(width: number): void {
    if (!container) return;
    customWidth = clamp(Math.round(width), MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 40));
    container.style.width = `${customWidth}px`;
    applyPos();
    // El ancho cambia el diseño interno (modo estrecho): re-renderizar.
    lastSignature = "";
    refresh();
}

function loadPos(): void {
    if (posRequested) return;
    posRequested = true;
    void DataStore.get<{ left: number; top: number; }>(POS_KEY)
        .then(pos => {
            if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
                savedPos = pos;
                applyPos();
            }
        })
        .catch(e => logger.debug("No se pudo leer la posición del panel", e));
    void DataStore.get<number>(WIDTH_KEY)
        .then(width => {
            if (typeof width === "number" && Number.isFinite(width)) {
                customWidth = clamp(width, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 40));
                setWidth(customWidth);
            }
        })
        .catch(e => logger.debug("No se pudo leer el ancho del panel", e));
}

/** Asa de la esquina para ensanchar el panel arrastrando. */
function makeResizeGrip(): HTMLElement {
    const grip = el("div", "vc-qt-overlay-grip");
    grip.title = t("overlayResize");
    grip.addEventListener("mousedown", (event: MouseEvent) => {
        if (event.button !== 0 || !container) return;
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = container.offsetWidth || currentWidth();
        container.classList.add("vc-qt-resizing");
        const move = (e: MouseEvent) => setWidth(startWidth + (e.clientX - startX));
        const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
            container?.classList.remove("vc-qt-resizing");
            if (customWidth != null) {
                void DataStore.set(WIDTH_KEY, customWidth)
                    .catch(e => logger.debug("No se pudo guardar el ancho del panel", e));
            }
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    });
    return grip;
}

function attachDrag(host: HTMLElement): void {
    host.addEventListener("mousedown", (event: MouseEvent) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement | null;
        if (!target?.closest?.(".vc-qt-overlay-head") || target.closest("button")) return;

        const rect = host.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        host.classList.add("vc-qt-dragging");
        event.preventDefault();

        const move = (e: MouseEvent) => {
            const width = host.offsetWidth || rect.width;
            setPos(
                clamp(e.clientX - offsetX, 0, window.innerWidth - width - 8),
                clamp(e.clientY - offsetY, 0, window.innerHeight - 60)
            );
        };
        const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
            host.classList.remove("vc-qt-dragging");
            if (savedPos) {
                void DataStore.set(POS_KEY, savedPos)
                    .catch(e => logger.debug("No se pudo guardar la posición del panel", e));
            }
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    });

    // Doble clic en la cabecera: vuelve a la esquina por defecto.
    host.addEventListener("dblclick", (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest?.(".vc-qt-overlay-head") || target.closest("button")) return;
        savedPos = null;
        host.style.left = "";
        host.style.top = "";
        host.style.right = "";
        void DataStore.del(POS_KEY).catch(() => { });
    });

    // Un único listener de resize en toda la sesión (antes se acumulaba uno por montaje).
    if (!resizeBound) {
        resizeBound = true;
        window.addEventListener("resize", () => applyPos());
    }
}
function render(quests: QuestInfo[]): void {
    if (!container) return;

    const width = currentWidth();
    // Hash barato en vez de JSON.stringify de todas las Quests.
    let hash = 2166136261;
    hash = Math.imul(hash ^ mode.length, 16777619);
    hash = Math.imul(hash ^ width, 16777619);
    for (const q of quests) {
        hash = Math.imul(hash ^ Math.round(q.progress * 1000), 16777619);
        hash = Math.imul(hash ^ STATUS_ORDER[q.status], 16777619);
        if (q.expiresAt) hash = Math.imul(hash ^ q.expiresAt, 16777619);
    }
    const auto = autoLine();
    for (let i = 0; i < auto.length; i++) hash = Math.imul(hash ^ auto.charCodeAt(i), 16777619);
    const signature = `${quests.length}:${hash}`;
    if (signature === lastSignature) return;
    lastSignature = signature;

    container.style.width = `${width}px`;
    if (savedPos) applyPos();

    const root = el("div", "vc-qt-overlay vc-qt-overlay-mode-" + mode);
    root.classList.toggle("vc-qt-overlay-narrow", width < 320);
    root.append(buildHeader(quests));

    if (mode !== "mini") {
        if (!quests.length) root.append(el("div", "vc-qt-overlay-empty", t("overlayNoQuests")));
        for (const quest of quests) root.append(buildRow(quest));
    }

    container.replaceChildren(root);
    container.append(makeResizeGrip());
    if (savedPos) applyPos();
}

function refresh(): void {
    try {
        const all = sortQuests(readQuestsFrom(getQuestStore()));
        // Por defecto solo lo que importa: en curso y recompensas por reclamar.
        const quests = settings.store.overlayShowAll
            ? all
            : all.filter(q => q.status === "inProgress" || q.status === "completed");
        render(quests);
    } catch (e) {
        logger.debug("Overlay de Misiones falló", e);
    }
}

/** Refresco agrupado: varios eventos del store seguidos no repintan varias veces. */
function scheduleRefresh(delay = 350): void {
    if (refreshDebounce) return;
    refreshDebounce = setTimeout(() => {
        refreshDebounce = undefined;
        if (!document.hidden) refresh();
    }, delay);
}

function onVisibilityChange(): void {
    if (!document.hidden) refresh();
}

function mount(): void {
    if (container) return;
    container = el("div");
    container.id = CONTAINER_ID;
    container.setAttribute("data-vc-qt", "overlay");
    document.body.appendChild(container);
    attachDrag(container);
    loadPos();
    lastSignature = "";
    refresh();
    // Refresco de respaldo cada 5 s: los cambios reales llegan por el store (agrupados) y
    // nada de trabajo con la ventana minimizada. El store y los avisos siguen al día.
    refreshTimer = setInterval(() => {
        if (!document.hidden) refresh();
    }, 5000);
    if (!visibilityBound) {
        visibilityBound = true;
        document.addEventListener("visibilitychange", onVisibilityChange);
    }
    unsubscribe = subscribeStore(() => scheduleRefresh());
}

function unmount(): void {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = undefined;
    if (refreshDebounce) clearTimeout(refreshDebounce);
    refreshDebounce = undefined;
    if (visibilityBound) {
        visibilityBound = false;
        document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    unsubscribe?.();
    unsubscribe = undefined;
    container?.remove();
    container = null;
    lastSignature = "";
}

/** Arranca el vigilante de ruta: monta/desmonta el panel al entrar/salir de Misiones. */
export function startQuestPageOverlay(): void {
    if (routerTimer) return;
    const sync = () => {
        const active = settings.store.showQuestPageOverlay !== false && isQuestPage();
        if (active) mount();
        else if (container) unmount();
    };
    routerTimer = setInterval(sync, 1000);
    setTimeout(sync, 1500);
}

export function stopQuestPageOverlay(): void {
    if (routerTimer) clearInterval(routerTimer);
    routerTimer = undefined;
    unmount();
}
