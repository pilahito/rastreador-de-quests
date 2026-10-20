/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* QuestTracker — textos bilingües / bilingual strings */

export type Lang = "es" | "en";

const es = {
    pluginDescription: "Rastreador de Quests + modo automático opcional: panel, avisos e historial.",
    panelTitle: "Quests de Discord",
    panelSubtitle: "Rastreador y, si lo activas tú, modo automático. Apagado por defecto.",
    openPanel: "Abrir panel de Quests",
    commandDescription: "Abre el panel de QuestTracker",
    commandAutoDescription: "Activa o desactiva el modo automático de QuestTracker",
    close: "Cerrar",
    refresh: "Actualizar",

    tabQuests: "Quests",
    tabAuto: "Automático",
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
    externalConfirm: "¿Abrir este enlace en tu navegador? Discord no suma progreso.",

    emptyQuests: "No hay Quests que coincidan.",
    storeMissing: "No encuentro el store de Quests. Abre una vez Descubrir → Quests y pulsa Actualizar.",
    emptyHistory: "Todavía no hay Quests completadas en el historial.",
    clearHistory: "Borrar historial",
    historyCleared: "Historial borrado",
    completedOn: "Completada",
    claimedOn: "Reclamada",

    firstRun: "Primera ejecución: Quests registradas sin avisar",
    notifNewTitle: "Quest nueva disponible",
    notifMobileTitle: "Quest solo para móvil",
    notifMobileBody: "Ábrela en la app de Discord del teléfono para completarla.",
    notifExpiringTitle: "Quest a punto de caducar",
    notifNearTitle: "¡Casi la tienes!",
    notifNearBody: "llevas un {p}% de progreso",
    notifClaimTitle: "Ya puedes reclamar tu recompensa",
    notifClaimBody: "Reclámala tú en Discord → Quests",

    readOnlyFooter: "El rastreador no completa, simula ni reclama nada: solo te informa.",
    autoFooter: "Modo automático opcional y apagado por defecto: tú decides cuándo se activa y qué puede hacer.",

    /* ------------------------------------------------------------------ */
    /* Modo automático / automation                                        */
    /* ------------------------------------------------------------------ */

    autoSectionTitle: "Modo automático",
    autoSectionSubtitle: "Opcional y apagado por defecto: acepta y completa Quests por ti. El riesgo es tuyo.",
    autoWarningTitle: "Aviso de precaución",
    autoWarningBody:
        "Automatizar Quests va contra las normas de Discord: desde 2026 sancionan cuentas por " +
        "'Inauthentic Quest Completion' con bloqueo de Quests y aviso en la cuenta. El plugin no hace nada " +
        "irreversible por sí mismo, pero la sanción de Discord no la controla el plugin. Si no lo tienes claro, " +
        "déjalo apagado.",
    autoConsentNeeded: "Necesitas aceptar el aviso de riesgo para activarlo.",
    autoEnable: "Activar",
    autoDisable: "Detener",
    autoCompleteAll: "Completar todas",
    autoStatusIdle: "Detenido",
    autoStatusRunning: "En marcha",
    autoStatusActive: "Trabajando en: {name}",
    autoStatusWaiting: "En marcha, esperando Quests…",
    autoCurrent: "Tarea actual",
    autoQueue: "En cola",
    autoQueueEmpty: "Nada en cola.",
    autoLogTitle: "Registro",
    autoClearLog: "Limpiar registro",
    autoEmptyLog: "Sin actividad todavía.",
    autoSubmitHint: "El botón Auto de cada Quest la completa solo, sin encender el interruptor maestro.",
    autoButtonAuto: "Auto",
    autoButtonCancel: "Quitar",
    autoButtonClaim: "Reclamar",
    autoButtonClaiming: "Reclamando…",
    autoManualOnlyHint: "Interruptor maestro apagado: solo corre las Quests que pidas con Auto.",
    autoSettingsHint: "Los ajustes del modo automático están en Ajustes → Vencord → Plugins → QuestTracker.",
    autoProgressText: "{cur} de {max}",

    autoPhaseQueued: "En cola",
    autoPhaseAccepting: "Aceptando",
    autoPhaseWorking: "En curso",
    autoPhaseClaiming: "Reclamando",
    autoPhaseDone: "Completada",
    autoPhaseClaimed: "Reclamada",
    autoPhaseFailed: "Error",
    autoPhaseBlocked: "No disponible",
    autoPhaseStopped: "Detenida",

    autoConsentTitle: "Antes de activar el modo automático",
    autoConsentIntro: "Vas a permitir que QuestTracker acepte y complete Quests por ti. Esto es lo que debes saber:",
    autoConsentBullet1: "Va contra las normas de Discord. Desde 2026 hay sanciones por automatizar Quests.",
    autoConsentBullet2: "El plugin no salta captchas, no pide OAuth y no lee ni envía tu token.",
    autoConsentBullet3: "Todo lo que simula (juego, stream, ajustes) se limpia al detener o al cerrar el plugin.",
    autoConsentBullet4: "Aun así, la sanción de Discord es cosa suya y puede afectar a la cuenta entera: la decides tú.",
    autoConsentAccept: "Acepto el riesgo y activo",
    autoConsentCancel: "Cancelar",

    autoStarted: "Modo automático iniciado.",
    autoStopped: "Modo automático detenido.",
    autoConsentMissing: "Falta aceptar el aviso de riesgo (Ajustes → QuestTracker).",
    autoSuspended: "Discord ha suspendido el acceso a Quests de esta cuenta: modo automático parado.",
    autoTooManyFailures: "Demasiados fallos seguidos: automatización detenida por seguridad.",
    autoQueued: "En cola para completar.",
    autoCancelled: "Quitada de la cola.",
    autoChecking: "Comprobando la tarea…",
    autoEnrolling: "Aceptando la Quest…",
    autoAccepted: "Quest aceptada: {name}",
    autoEnrollFailed: "No se pudo aceptar la Quest",
    autoWatching: "Viendo el vídeo…",
    autoPlaying: "Jugando a {game}…",
    autoStreaming: "Simulando stream…",
    autoActivity: "Mandando latidos de actividad…",
    autoClaiming: "Reclamando la recompensa…",
    autoClaimManually: "Completada: reclama la recompensa en Discord.",
    autoClaimedDetail: "Recompensa reclamada.",
    autoClaimUnconfirmed: "Petición de recompensa enviada, sin confirmación de Discord: {name}",
    autoCompleted: "Quest completada: {name}",
    autoClaimed: "Recompensa reclamada: {name}",
    autoAlreadyDone: "Ya estaba completada.",
    autoGone: "Esa Quest ya no existe.",
    autoTypeDisabled: "Ese tipo de tarea está desactivado en Ajustes.",
    autoNotAccepted: "No está aceptada y auto-aceptar está apagado.",
    autoFailed: "El modo automático falló",
    autoClientError: "Discord rechazó la petición",
    autoNetwork: "Error de red",
    autoRetry: "Reintentando",
    autoTimeout: "Tiempo máximo agotado.",
    autoNoHeartbeat: "Discord no reconoció el juego en {minutes} min (no abrió heartbeat).",
    autoHeartbeatFailed: "Latido de Discord fallido",
    autoHeartbeatErrors: "Demasiados heartbeats fallidos.",
    autoNoProgress: "Discord no acreditó progreso.",
    autoNoVoice: "No encontré llamada ni canal de voz para el heartbeat.",
    autoCaptcha: "Puede requerir captcha: reclama tú la recompensa en Discord.",
    autoClaimNowFailed: "No se pudo reclamar la recompensa",

    /* Motivos por los que una Quest no se puede automatizar / unautomatable reasons */
    noTasks: "No tiene tareas que este cliente pueda hacer.",
    consoleOnly: "Solo se puede hacer en consola.",
    mobileOnly: "Solo se puede hacer desde el móvil (app de Discord).",
    mobileQR: "Ver QR en el móvil",
    mobileQRFailed: "Abre la Quest en Misiones y pulsa «Ver en el móvil».",
    unsupported: "Tipo de tarea no soportado.",
    needsDesktop: "Necesita la app de escritorio de Discord.",
    invalidTarget: "Objetivo inválido.",
    noAppId: "No trae el id de la aplicación.",
    achievementInGame: "Necesita un logro conseguido dentro del juego real.",
    achievementActivity: "Los logros dentro de actividades los valida el backend de Discord: no se automatizan.",
    streamNeedsRealLive: "Discord exige un Go Live real y otra persona en la llamada; no se puede simular.",

    notifAutoDoneTitle: "Quest completada (auto)",
    notifAutoDoneBody: "{name} — reclama la recompensa en Discord.",
    notifAutoClaimedTitle: "Recompensa reclamada (auto)",
    notifAutoClaimedBody: "{name} — recompensa reclamada.",
    notifAutoErrorTitle: "El modo automático se paró en una Quest",
    notifAutoSuspendedTitle: "Quests suspendidas en tu cuenta",
    notifAutoSuspendedBody: "Discord bloqueó el acceso a Quests. El modo automático se detuvo.",
    notifAutoClaimFailedTitle: "No se pudo reclamar la recompensa",
    notifAutoClaimFailedBody: "{name} — reclámala tú en Discord (posible captcha).",

    overlayTitle: "Progreso de Misiones",
    overlayOpenPanel: "Abrir panel",
    overlayNoQuests: "No hay Quests disponibles.",
    overlayClaimable: "¡Recompensa lista!",
    overlayAutoWorking: "Auto: trabajando en {name}",
    overlayAutoWorkingPct: "Auto: {name} · {p}%",
    overlayAutoWaiting: "Auto en marcha",
    pipIdle: "Aquí saldrá el vídeo de la Quest.",
    pipClose: "Cerrar vídeo",
    pipPopout: "Sacar a ventana flotante",
    pipMute: "Silenciar",
    pipUnmute: "Activar sonido",
    overlayAutoOff: "Auto detenido",
    overlayMinimize: "Minimizar",
    overlayExpand: "Expandir",
    overlayMaximize: "Maximizar",
    overlayRestore: "Restaurar tamaño",
    overlayStop: "Detener la automatización",
    overlayStart: "Activar la automatización",
    overlayResize: "Arrastra para ensanchar",
    overlayMobile: "Móvil",
    overlayMobileHint: "Hazla en el móvil",
    scopeLabel: "Automatizar",
    scopeAll: "Todas",
    scopeSelected: "Seleccionadas",
    scopeHintAll: "Se completan todas las Quests permitidas por los tipos activos.",
    scopeHintSelected: "Solo se completan las Quests marcadas con ☆.",
    selectQuest: "Marcar para el automático",
    unselectQuest: "Quitar del automático",
    selectedCount: "{n} marcadas",
    selectAll: "Marcar todas",
    clearSelection: "Quitar todas",
    autoSelectNone: "Modo seleccionadas: marca con ☆ las Quests que quieras automatizar.",
    autoRetryScheduled: "Reintento de {name} en {min} min (intento {n}/2)."
};

const en: typeof es = {
    pluginDescription: "Quest tracker + optional automation: panel, notifications and history.",
    panelTitle: "Discord Quests",
    panelSubtitle: "Tracker and, if you turn it on, automation. Off by default.",
    openPanel: "Open Quest panel",
    commandDescription: "Open the QuestTracker panel",
    commandAutoDescription: "Turn QuestTracker automation on or off",
    close: "Close",
    refresh: "Refresh",

    tabQuests: "Quests",
    tabAuto: "Automation",
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
    externalConfirm: "Open this link in your browser? It does not add Discord progress.",

    emptyQuests: "No Quests match.",
    storeMissing: "Quest store not found. Open Discover → Quests once and press Refresh.",
    emptyHistory: "No completed Quests in the history yet.",
    clearHistory: "Clear history",
    historyCleared: "History cleared",
    completedOn: "Completed",
    claimedOn: "Claimed",

    firstRun: "First run: Quests recorded silently",
    notifNewTitle: "New Quest available",
    notifMobileTitle: "Mobile-only Quest",
    notifMobileBody: "Open it in Discord's mobile app to complete it.",
    notifExpiringTitle: "Quest about to expire",
    notifNearTitle: "Almost there!",
    notifNearBody: "you are at {p}% progress",
    notifClaimTitle: "You can claim your reward",
    notifClaimBody: "Claim it yourself in Discord → Quests",

    readOnlyFooter: "The tracker never completes, simulates or claims anything: it only informs you.",
    autoFooter: "Automation is optional and off by default: you decide when it is enabled and what it may do.",

    autoSectionTitle: "Automation",
    autoSectionSubtitle: "Optional and off by default: accepts and completes Quests for you. The risk is yours.",
    autoWarningTitle: "Careful",
    autoWarningBody:
        "Automating Quests breaks Discord's rules: since 2026 they sanction accounts for 'Inauthentic Quest " +
        "Completion' with Quest locks and an account notice. The plugin does nothing irreversible by itself, " +
        "but Discord's sanction is not something the plugin controls. If you are not sure, leave it off.",
    autoConsentNeeded: "You must accept the risk notice to enable it.",
    autoEnable: "Enable",
    autoDisable: "Stop",
    autoCompleteAll: "Complete all",
    autoStatusIdle: "Stopped",
    autoStatusRunning: "Running",
    autoStatusActive: "Working on: {name}",
    autoStatusWaiting: "Running, waiting for Quests…",
    autoCurrent: "Current task",
    autoQueue: "Queue",
    autoQueueEmpty: "Nothing queued.",
    autoLogTitle: "Log",
    autoClearLog: "Clear log",
    autoEmptyLog: "No activity yet.",
    autoSubmitHint: "The Auto button on a Quest completes just that one, without the master switch.",
    autoButtonAuto: "Auto",
    autoButtonCancel: "Remove",
    autoButtonClaim: "Claim",
    autoButtonClaiming: "Claiming…",
    autoManualOnlyHint: "Master switch off: only the Quests you run with Auto will be completed.",
    autoSettingsHint: "Automation settings live in Settings → Vencord → Plugins → QuestTracker.",
    autoProgressText: "{cur} of {max}",

    autoPhaseQueued: "Queued",
    autoPhaseAccepting: "Accepting",
    autoPhaseWorking: "Working",
    autoPhaseClaiming: "Claiming",
    autoPhaseDone: "Completed",
    autoPhaseClaimed: "Claimed",
    autoPhaseFailed: "Error",
    autoPhaseBlocked: "Unavailable",
    autoPhaseStopped: "Stopped",

    autoConsentTitle: "Before enabling automation",
    autoConsentIntro: "You are about to let QuestTracker accept and complete Quests for you. What you should know:",
    autoConsentBullet1: "It breaks Discord's rules. Since 2026 there are sanctions for automating Quests.",
    autoConsentBullet2: "The plugin never bypasses captchas, never asks for OAuth and never reads or sends your token.",
    autoConsentBullet3: "Everything it spoofs (game, stream, settings) is cleaned up on stop or on plugin shutdown.",
    autoConsentBullet4: "Even so, Discord's sanction is theirs to apply and can hit the whole account: that call is yours.",
    autoConsentAccept: "I accept the risk and enable",
    autoConsentCancel: "Cancel",

    autoStarted: "Automation started.",
    autoStopped: "Automation stopped.",
    autoConsentMissing: "Risk notice not accepted yet (Settings → QuestTracker).",
    autoSuspended: "Discord has suspended Quest access on this account: automation stopped.",
    autoTooManyFailures: "Too many consecutive failures: automation stopped for safety.",
    autoQueued: "Queued to complete.",
    autoCancelled: "Removed from the queue.",
    autoChecking: "Checking the task…",
    autoEnrolling: "Accepting the Quest…",
    autoAccepted: "Quest accepted: {name}",
    autoEnrollFailed: "Could not accept the Quest",
    autoWatching: "Watching the video…",
    autoPlaying: "Playing {game}…",
    autoStreaming: "Spoofing the stream…",
    autoActivity: "Sending activity heartbeats…",
    autoClaiming: "Claiming the reward…",
    autoClaimManually: "Completed: claim the reward in Discord.",
    autoClaimedDetail: "Reward claimed.",
    autoClaimUnconfirmed: "Reward request sent, unconfirmed by Discord: {name}",
    autoCompleted: "Quest completed: {name}",
    autoClaimed: "Reward claimed: {name}",
    autoAlreadyDone: "Already completed.",
    autoGone: "That Quest no longer exists.",
    autoTypeDisabled: "That task type is disabled in Settings.",
    autoNotAccepted: "Not accepted and auto-accept is off.",
    autoFailed: "Automation failed",
    autoClientError: "Discord rejected the request",
    autoNetwork: "Network error",
    autoRetry: "Retrying",
    autoTimeout: "Time limit reached.",
    autoNoHeartbeat: "Discord did not recognise the game within {minutes} min (no heartbeat opened).",
    autoHeartbeatFailed: "Discord heartbeat failed",
    autoHeartbeatErrors: "Too many failed heartbeats.",
    autoNoProgress: "Discord credited no progress.",
    autoNoVoice: "No call or voice channel found for the heartbeat.",
    autoCaptcha: "May require a captcha: claim the reward yourself in Discord.",
    autoClaimNowFailed: "Could not claim the reward",

    noTasks: "It has no tasks this client can do.",
    consoleOnly: "Console only.",
    mobileOnly: "Mobile app only (Discord's mobile app).",
    mobileQR: "Show mobile QR",
    mobileQRFailed: "Open the Quest on Misiones and press “View on mobile”.",
    unsupported: "Unsupported task type.",
    needsDesktop: "Needs the Discord desktop app.",
    invalidTarget: "Invalid target.",
    noAppId: "No application id in the config.",
    achievementInGame: "Needs an achievement earned inside the real game.",
    achievementActivity: "In-activity achievements are validated by Discord's backend: they are not automated.",
    streamNeedsRealLive: "Discord requires a real Go Live and another person in the call; it cannot be spoofed.",

    notifAutoDoneTitle: "Quest completed (auto)",
    notifAutoDoneBody: "{name} — claim the reward in Discord.",
    notifAutoClaimedTitle: "Reward claimed (auto)",
    notifAutoClaimedBody: "{name} — reward claimed.",
    notifAutoErrorTitle: "Automation stopped on a Quest",
    notifAutoSuspendedTitle: "Quest access suspended on your account",
    notifAutoSuspendedBody: "Discord locked Quest access. Automation was stopped.",
    notifAutoClaimFailedTitle: "Could not claim the reward",
    notifAutoClaimFailedBody: "{name} — claim it yourself in Discord (possible captcha).",

    overlayTitle: "Quest progress",
    overlayOpenPanel: "Open panel",
    overlayNoQuests: "No quests available.",
    overlayClaimable: "Reward ready!",
    overlayAutoWorking: "Auto: working on {name}",
    overlayAutoWorkingPct: "Auto: {name} · {p}%",
    overlayAutoWaiting: "Auto running",
    pipIdle: "The quest video will play here.",
    pipClose: "Close video",
    pipPopout: "Pop out to floating window",
    pipMute: "Mute",
    pipUnmute: "Unmute",
    overlayAutoOff: "Auto stopped",
    overlayMinimize: "Minimize",
    overlayExpand: "Expand",
    overlayMaximize: "Maximize",
    overlayRestore: "Restore size",
    overlayStop: "Stop automation",
    overlayStart: "Start automation",
    overlayResize: "Drag to widen",
    overlayMobile: "Mobile",
    overlayMobileHint: "Do it on your phone",
    scopeLabel: "Automate",
    scopeAll: "All",
    scopeSelected: "Selected",
    scopeHintAll: "Every quest allowed by the enabled task types is completed.",
    scopeHintSelected: "Only the quests starred with ☆ are completed.",
    selectQuest: "Star for automation",
    unselectQuest: "Remove from automation",
    selectedCount: "{n} starred",
    selectAll: "Select all",
    clearSelection: "Clear all",
    autoSelectNone: "Selected mode: star the quests you want automated with ☆.",
    autoRetryScheduled: "Retry of {name} in {min} min (attempt {n}/2)."
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
