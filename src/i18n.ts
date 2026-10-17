/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* QuestTracker — textos bilingües / bilingual strings */

export type Lang = "es" | "en";

const es = {
    pluginDescription: "Rastreador de Quests de solo lectura: panel, avisos e historial.",
    panelTitle: "Quests de Discord",
    panelSubtitle: "Solo lectura: tú haces y reclamas las Quests dentro de Discord.",
    openPanel: "Abrir panel de Quests",
    commandDescription: "Abre el panel de QuestTracker (solo lectura)",
    close: "Cerrar",
    refresh: "Actualizar",

    tabQuests: "Quests",
    tabHistory: "Historial",

    search: "Buscar por nombre, juego o recompensa…",
    filterStatus: "Estado",
    filterType: "Tipo",
    sortBy: "Ordenar",
    all: "Todas",

    statusAvailable: "Sin aceptar",
    statusInProgress: "En curso",
    statusCompleted: "Completada",
    statusClaimed: "Reclamada",
    statusExpired: "Caducada",

    typeVideo: "Ver vídeo",
    typePlay: "Jugar",
    typeStream: "Stream",
    typeActivity: "Actividad",
    typeOther: "Otra",

    sortExpiry: "Caduca antes",
    sortProgress: "Más progreso",
    sortName: "Nombre",
    sortNewest: "Más nuevas",

    reward: "Recompensa",
    progress: "Progreso",
    timeLeft: "Quedan",
    expired: "Caducada",
    noExpiry: "Sin fecha de fin",
    minutes: "min",
    of: "de",

    summaryInProgress: "en curso",
    summaryClaimable: "por reclamar",
    summaryExpiring: "caducan pronto",

    claimableHint: "¡Completada! Reclama tu recompensa tú mismo en Discord.",
    acceptHint: "Acéptala en Discord para empezar a sumar progreso.",
    playHint: "Juega con Discord abierto para avanzar.",
    streamHint: "Haz stream del juego en una llamada para avanzar.",
    videoHint: "Mira el vídeo desde la propia Quest en Discord.",

    openInDiscord: "Abrir en Discord",
    openGame: "Página del juego",
    openVideo: "Ver vídeo (navegador)",
    externalNote: "Se abre fuera de Discord: no suma progreso.",

    emptyQuests: "No hay Quests que coincidan.",
    storeMissing: "No encuentro el store de Quests. Abre una vez Descubrir → Quests y pulsa Actualizar.",
    emptyHistory: "Todavía no hay Quests completadas en el historial.",
    clearHistory: "Borrar historial",
    historyCleared: "Historial borrado",
    completedOn: "Completada",
    claimedOn: "Reclamada",

    firstRun: "Primera ejecución: Quests registradas sin avisar",
    notifNewTitle: "Quest nueva disponible",
    notifExpiringTitle: "Quest a punto de caducar",
    notifNearTitle: "¡Casi la tienes!",
    notifNearBody: "llevas un {p}% de progreso",
    notifClaimTitle: "Ya puedes reclamar tu recompensa",
    notifClaimBody: "Reclámala tú en Discord → Quests",

    readOnlyFooter: "QuestTracker no completa, simula ni reclama nada: solo te informa."
};

const en: typeof es = {
    pluginDescription: "Read-only Quest tracker: panel, notifications and history.",
    panelTitle: "Discord Quests",
    panelSubtitle: "Read-only: you do and claim Quests yourself inside Discord.",
    openPanel: "Open Quest panel",
    commandDescription: "Open the QuestTracker panel (read-only)",
    close: "Close",
    refresh: "Refresh",

    tabQuests: "Quests",
    tabHistory: "History",

    search: "Search by name, game or reward…",
    filterStatus: "Status",
    filterType: "Type",
    sortBy: "Sort",
    all: "All",

    statusAvailable: "Not accepted",
    statusInProgress: "In progress",
    statusCompleted: "Completed",
    statusClaimed: "Claimed",
    statusExpired: "Expired",

    typeVideo: "Watch video",
    typePlay: "Play",
    typeStream: "Stream",
    typeActivity: "Activity",
    typeOther: "Other",

    sortExpiry: "Expires first",
    sortProgress: "Most progress",
    sortName: "Name",
    sortNewest: "Newest",

    reward: "Reward",
    progress: "Progress",
    timeLeft: "Left",
    expired: "Expired",
    noExpiry: "No end date",
    minutes: "min",
    of: "of",

    summaryInProgress: "in progress",
    summaryClaimable: "to claim",
    summaryExpiring: "expiring soon",

    claimableHint: "Completed! Claim your reward yourself in Discord.",
    acceptHint: "Accept it in Discord to start earning progress.",
    playHint: "Play with Discord open to make progress.",
    streamHint: "Stream the game in a call to make progress.",
    videoHint: "Watch the video from the Quest itself in Discord.",

    openInDiscord: "Open in Discord",
    openGame: "Game page",
    openVideo: "Watch video (browser)",
    externalNote: "Opens outside Discord: it does not add progress.",

    emptyQuests: "No Quests match.",
    storeMissing: "Quest store not found. Open Discover → Quests once and press Refresh.",
    emptyHistory: "No completed Quests in the history yet.",
    clearHistory: "Clear history",
    historyCleared: "History cleared",
    completedOn: "Completed",
    claimedOn: "Claimed",

    firstRun: "First run: Quests recorded silently",
    notifNewTitle: "New Quest available",
    notifExpiringTitle: "Quest about to expire",
    notifNearTitle: "Almost there!",
    notifNearBody: "you are at {p}% progress",
    notifClaimTitle: "You can claim your reward",
    notifClaimBody: "Claim it yourself in Discord → Quests",

    readOnlyFooter: "QuestTracker never completes, simulates or claims anything: it only informs you."
};

const strings = { es, en };

export type StringKey = keyof typeof es;

let currentLang: Lang = "es";

export function setLang(lang: string | undefined) {
    if (lang === "es" || lang === "en") {
        currentLang = lang;
        return;
    }
    // "auto": follow Discord / browser locale
    const locale = (document?.documentElement?.lang || navigator?.language || "es").toLowerCase();
    currentLang = locale.startsWith("es") ? "es" : "en";
}

export function getLang(): Lang {
    return currentLang;
}

export function t(key: StringKey, vars?: Record<string, string | number>): string {
    let s: string = strings[currentLang]?.[key] ?? es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
}

/** "2 d 4 h", "3 h 12 min", "45 min" */
export function formatDuration(ms: number): string {
    if (ms <= 0) return t("expired");
    const min = Math.floor(ms / 60000);
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d > 0) return `${d} d ${h} h`;
    if (h > 0) return `${h} h ${m} ${t("minutes")}`;
    return `${Math.max(m, 1)} ${t("minutes")}`;
}

export function formatDate(d: Date | number | undefined): string {
    if (d == null) return "?";
    try {
        return new Date(d).toLocaleString(currentLang === "es" ? "es-ES" : "en-US", { dateStyle: "medium", timeStyle: "short" });
    } catch {
        return new Date(d).toISOString();
    }
}
