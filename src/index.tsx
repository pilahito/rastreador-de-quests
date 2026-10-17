/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — rastreador de Quests con modo automático OPCIONAL.
 *
 * El rastreador solo lee las Quests que el cliente ya tiene en memoria y te avisa.
 * El modo automático viene APAGADO por defecto, exige aceptar un aviso de riesgo y se
 * puede detener en cualquier momento; al detenerlo se limpia todo lo que haya simulado.
 *
 * The tracker only reads the quests the client already holds and notifies you.
 * Automation is OFF by default, requires accepting a risk notice and can be stopped at
 * any time; stopping cleans up everything it spoofed.
 */

import "./style.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import definePlugin from "@utils/types";
import { showToast } from "@webpack/common";

import { getAutoSnapshot, hasAutoConsent, initAuto, isAutoRunning, setAutoEnabled, setQuestSelected, shutdownAuto } from "./auto/engine";
import { hideQuestVideo, showQuestVideo, warmQuestVideoWindow } from "./auto/pipVideo";
import { openAutoConsent } from "./AutoConsent";
import { recordHistory } from "./history";
import { setLang, t } from "./i18n";
import { startQuestPageOverlay, stopQuestPageOverlay } from "./QuestOverlay";
import { openQuestPanel, readCurrentQuests } from "./QuestPanel";
import { isExpiringSoon, QuestInfo } from "./quests";
import { settings } from "./settings";
import { getQuestStore, logger, QUEST_EVENTS, subscribeStore } from "./store";

const LEGACY_SEEN_KEY = "QuestTracker_seenQuestIds";
const STATE_KEY = "QuestTracker_state_v2";

type NotifyKind = "expiring" | "near" | "claim";

interface TrackerState {
    seen: string[];
    notified: Record<string, NotifyKind[]>;
}

function QuestIcon({ height = 20, width = 20, className }: { height?: number | string; width?: number | string; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" height={height} width={width} className={className} aria-hidden="true">
            <path
                fill="currentColor"
                d="M7 3h10v2h3a1 1 0 0 1 1 1v2a5 5 0 0 1-4.1 4.92A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1a5 5 0 0 1-3.9-2.98A5 5 0 0 1 3 8V6a1 1 0 0 1 1-1h3V3Zm0 4H5v1a3 3 0 0 0 2 2.83V7Zm10 0v3.83A3 3 0 0 0 19 8V7h-2Z"
            />
        </svg>
    );
}

const QuestChatButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat || !settings.store.showChatButton) return null;
    return (
        <ChatBarButton tooltip={t("openPanel")} onClick={() => openQuestPanel()}>
            <QuestIcon />
        </ChatBarButton>
    );
};

async function loadState(): Promise<TrackerState> {
    const state = await DataStore.get<TrackerState>(STATE_KEY);
    if (state?.seen) return { seen: state.seen, notified: state.notified ?? {} };

    // Migrate v1.0 data / migrar datos de la v1.0
    const legacy = await DataStore.get<string[]>(LEGACY_SEEN_KEY);
    return { seen: Array.isArray(legacy) ? legacy : [], notified: {} };
}

function notify(title: string, body: string) {
    void showNotification({
        title: `QuestTracker · ${title}`,
        body,
        onClick: () => openQuestPanel()
    });
}

/** Activa o desactiva el modo automático; si falta el aviso de riesgo, lo abre. */
function toggleAutomation() {
    setLang(settings.store.lang);
    // Aprovecha el clic (gesto de usuario) para dejar lista la ventana flotante del vídeo.
    if (settings.store.autoVideoPip) void warmQuestVideoWindow();
    if (!hasAutoConsent()) {
        showToast({ text: t("autoConsentNeeded"), variant: "danger" } as any);
        openAutoConsent(() => {
            // El motor arranca solo con el cambio del ajuste.
            settings.store.autoEnabled = true;
        });
        return;
    }
    const next = !(settings.store.autoEnabled || isAutoRunning());
    setAutoEnabled(next);
    showToast({ text: t(next ? "autoStarted" : "autoStopped"), variant: next ? "success" : "secondary" } as any);
}

function logQuests(quests: QuestInfo[]) {
    logger.info(`Found / Encontradas: ${quests.length} quest(s)`);
    for (const q of quests) {
        logger.info(`- ${q.name} [${q.category}/${q.status}] ${Math.round(q.progress * 100)}% · ${q.reward} · expires ${q.expiresAt ? new Date(q.expiresAt).toISOString() : "?"}`);
    }
}

let checking = false;
let pending = false;

async function checkForChanges() {
    if (checking) {
        pending = true;
        return;
    }
    checking = true;
    try {
        setLang(settings.store.lang);
        const { quests } = readCurrentQuests();
        if (!quests.length) return;
        if (settings.store.logToConsole) logQuests(quests);

        await recordHistory(quests);

        const state = await loadState();
        const s = settings.store;
        const firstRun = state.seen.length === 0;
        const seen = new Set(state.seen);

        const mark = (id: string, kind: NotifyKind) => {
            const list = state.notified[id] ?? (state.notified[id] = []);
            if (list.includes(kind)) return false;
            list.push(kind);
            return true;
        };

        for (const q of quests) {
            const isNew = !seen.has(q.id);
            seen.add(q.id);

            if (firstRun) {
                // Remember what was already true so we don't spam on first run
                if (q.status === "completed") mark(q.id, "claim");
                continue;
            }

            if (isNew && s.notifyNew && (q.status === "available" || q.status === "inProgress")) {
                notify(t("notifNewTitle"), `${q.name} — ${t("reward")}: ${q.reward}`);
            }

            if (s.notifyExpiring && q.status !== "claimed" && isExpiringSoon(q, s.expiryHours ?? 24) && mark(q.id, "expiring")) {
                notify(t("notifExpiringTitle"), `${q.name} — ${t("timeLeft")}: ${new Date(q.expiresAt!).toLocaleString()}`);
            }

            if (s.notifyNearComplete && q.status === "inProgress" && q.progress * 100 >= (s.nearCompletePercent ?? 80) && mark(q.id, "near")) {
                notify(t("notifNearTitle"), `${q.name}: ${t("notifNearBody", { p: Math.round(q.progress * 100) })}`);
            }

            if (s.notifyClaimable && q.status === "completed" && mark(q.id, "claim")) {
                notify(t("notifClaimTitle"), `${q.name} — ${q.reward}. ${t("notifClaimBody")}`);
            }
        }

        // Forget flags of quests that no longer exist / olvidar flags de quests que ya no existen
        const current = new Set(quests.map(q => q.id));
        for (const id of Object.keys(state.notified)) if (!current.has(id)) delete state.notified[id];

        if (firstRun) logger.info(`${t("firstRun")} (${quests.length})`);
        // Solo se escribe si algo cambió de verdad (evita escrituras en IndexedDB cada minuto).
        const nextState: TrackerState = { seen: [...seen].slice(-1000), notified: state.notified };
        const serialized = JSON.stringify(nextState);
        if (serialized !== lastSavedState) {
            await DataStore.set(STATE_KEY, nextState);
            lastSavedState = serialized;
        }
    } catch (e) {
        logger.error("Quest check failed / Falló la comprobación de Quests", e);
    } finally {
        checking = false;
        if (pending) {
            pending = false;
            scheduleCheck();
        }
    }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void checkForChanges(), 1500);
}

let unsubscribeStore: (() => void) | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let intervalTimer: ReturnType<typeof setInterval> | undefined;
let lastSavedState = "";

function attachToStore(attempt = 0) {
    if (getQuestStore(attempt > 0)) {
        unsubscribeStore = subscribeStore(scheduleCheck);
        scheduleCheck();
        return;
    }
    if (attempt === 6) {
        logger.warn(
            "Quest store not found yet. Open Discover → Quests once. / " +
            "Todavía no encuentro el store de Quests. Abre Descubrir → Quests una vez."
        );
    }
    // Keep retrying slowly / seguir reintentando despacio
    retryTimer = setTimeout(() => attachToStore(attempt + 1), attempt < 6 ? 5000 : 60_000);
}

export default definePlugin({
    name: "RastreadorDeQuests",
    description:
        "Quest tracker with an OPTIONAL automation mode (off by default): panel, notifications, history. " +
        "Automation requires accepting a risk notice. / " +
        "Rastreador de Quests con modo automático OPCIONAL (apagado por defecto): panel, avisos e historial. " +
        "El modo automático exige aceptar un aviso de riesgo.",
    searchTerms: ["rastreador", "quests", "misiones", "recompensas", "auto", "automático", "discord"],
    authors: [{ name: "pilahito", id: 0n }],
    tags: ["Utility", "Notifications", "Commands"],
    dependencies: ["CommandsAPI", "ChatInputButtonAPI", "UserSettingsAPI"],

    settings,

    chatBarButton: {
        icon: QuestIcon,
        render: QuestChatButton
    },

    toolboxActions: {
        "Rastreador de Quests: Quests": () => {
            setLang(settings.store.lang);
            openQuestPanel();
        },
        "Rastreador de Quests: Automático on/off": () => toggleAutomation()
    },

    commands: [
        {
            name: "quests",
            description: "Open the QuestTracker panel / Abre el panel de QuestTracker",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute() {
                setLang(settings.store.lang);
                openQuestPanel();
            }
        },
        {
            name: "questauto",
            description: "Turn QuestTracker automation on/off / Activa o desactiva el modo automático",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute() {
                toggleAutomation();
            }
        }
    ],

    // We only LISTEN to these events / solo ESCUCHAMOS estos eventos
    flux: Object.fromEntries(QUEST_EVENTS.map(ev => [ev, () => scheduleCheck()])),

    /** Public read-only helper for other plugins / devtools. */
    getQuests: () => readCurrentQuests().quests,
    openPanel: openQuestPanel,

    start() {
        setLang(settings.store.lang);
        initAuto(notify);
        startQuestPageOverlay();
        retryTimer = setTimeout(() => attachToStore(0), 3000);
        // Periodic re-check for time-based warnings / comprobación periódica de caducidad
        intervalTimer = setInterval(scheduleCheck, 5 * 60_000);

        // Ayuda de depuración para devtools / devtools helper (solo lectura + prueba de vídeo).
        (globalThis as any).QuestTrackerDebug = {
            quests: () => readCurrentQuests().quests,
            auto: () => getAutoSnapshot(),
            openPanel: openQuestPanel,
            showVideo: (url: string) => showQuestVideo(url, "test"),
            hideVideo: () => hideQuestVideo(),
            selectQuest: (id: string, on = true) => setQuestSelected(id, on),
            setScope: (value: string) => {
                settings.store.autoScope = value;
                return settings.store.autoScope;
            },
            startAuto: () => setAutoEnabled(true),
            stopAuto: () => setAutoEnabled(false)
        };
    },

    stop() {
        clearTimeout(retryTimer);
        clearTimeout(debounceTimer);
        clearInterval(intervalTimer);
        unsubscribeStore?.();
        unsubscribeStore = undefined;
        stopQuestPageOverlay();
        shutdownAuto();
        try {
            delete (globalThis as any).QuestTrackerDebug;
        } catch { /* nada */ }
    }
});
