/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { fireAutoEnabledChanged, fireConsentChanged } from "./auto/bridge";

export const settings = definePluginSettings({
    lang: {
        type: OptionType.SELECT,
        description: "Language / Idioma",
        options: [
            { label: "Auto (Discord)", value: "auto", default: true },
            { label: "Español", value: "es" },
            { label: "English", value: "en" }
        ]
    },
    showChatButton: {
        type: OptionType.BOOLEAN,
        description: "Show the Quest button in the chat bar / Mostrar el botón de Quests en la barra del chat",
        default: true
    },
    notifyNew: {
        type: OptionType.BOOLEAN,
        description: "Notify when a new quest appears / Avisar cuando aparece una Quest nueva",
        default: true
    },
    notifyExpiring: {
        type: OptionType.BOOLEAN,
        description: "Notify about quests about to expire / Avisar de Quests a punto de caducar",
        default: true
    },
    expiryHours: {
        type: OptionType.NUMBER,
        description: "Hours before expiry to warn / Horas antes de caducar para avisar",
        default: 24
    },
    notifyNearComplete: {
        type: OptionType.BOOLEAN,
        description: "Notify when a quest is almost complete / Avisar cuando una Quest está casi completa",
        default: true
    },
    nearCompletePercent: {
        type: OptionType.SLIDER,
        description: "Progress % that counts as 'almost complete' / % de progreso que cuenta como 'casi completa'",
        markers: [50, 60, 70, 80, 90, 95],
        default: 80,
        stickToMarkers: true
    },
    notifyClaimable: {
        type: OptionType.BOOLEAN,
        description: "Notify when a reward is ready to claim (you claim it yourself) / Avisar cuando puedes reclamar (lo reclamas tú)",
        default: true
    },
    questRoute: {
        type: OptionType.STRING,
        description: "Discord route for 'Open in Discord' / Ruta de Discord para 'Abrir en Discord'",
        default: "/quest-home"
    },
    logToConsole: {
        type: OptionType.BOOLEAN,
        description: "Log the quest list to the console (debug) / Volcar la lista en la consola (depuración)",
        default: false
    },

    /* ------------------------------------------------------------------ */
    /* Modo automático / automation                                        */
    /* ------------------------------------------------------------------ */

    autoConsent: {
        type: OptionType.BOOLEAN,
        description:
            "⚠️ AUTOMATIZACIÓN: actívalo solo si aceptas el riesgo. Discord prohíbe automatizar Quests y desde " +
            "2026 sanciona cuentas por 'Inauthentic Quest Completion' (bloqueo de Quests y aviso en la cuenta). " +
            "Puedes perder el acceso a las Quests o la cuenta. El plugin no hace nada irreversible por sí mismo, " +
            "pero la sanción de Discord no la controla el plugin.\n" +
            "⚠️ AUTOMATION: only enable if you accept the risk. Discord bans quest automation and has been " +
            "sanctioning accounts for 'Inauthentic Quest Completion'. You may lose Quest access or the account.",
        default: false,
        onChange: (value: boolean) => fireConsentChanged(value)
    },
    autoEnabled: {
        type: OptionType.BOOLEAN,
        description:
            "Master switch: accept and complete the quests allowed by the toggles below. Requires the risk " +
            "acknowledgement above. / Interruptor maestro: aceptar y completar las Quests permitidas abajo. " +
            "Requiere el aviso de riesgo de arriba.",
        default: false,
        onChange: (value: boolean) => fireAutoEnabledChanged(value)
    },
    autoAccept: {
        type: OptionType.BOOLEAN,
        description:
            "Accept the quest for you before starting it. Turn it off to only complete quests you accepted by " +
            "hand in Discord. / Aceptar la Quest automáticamente antes de empezar. Si lo apagas, solo completa " +
            "las que hayas aceptado tú en Discord.",
        default: true
    },
    autoClaimRewards: {
        type: OptionType.BOOLEAN,
        description:
            "Claim the reward right after completing a quest. Discord may ask for a captcha: then the claim fails " +
            "and the panel tells you to do it by hand (the plugin never bypasses a captcha). Off by default so the " +
            "decision to claim stays yours. / Reclamar la recompensa al terminar. Si Discord pide captcha, el plugin " +
            "no lo salta: te avisa para que lo hagas tú. Apagado por defecto.",
        default: false
    },
    autoVideos: {
        type: OptionType.BOOLEAN,
        description: "Automate WATCH_VIDEO quests / Automatizar Quests de ver vídeo",
        default: true
    },
    autoGames: {
        type: OptionType.BOOLEAN,
        description:
            "Automate PLAY_ON_DESKTOP quests (spoofs a running process). Desktop app only. / " +
            "Automatizar Quests de jugar en escritorio (simula un proceso en ejecución). Solo app de escritorio.",
        default: true
    },
    autoActivities: {
        type: OptionType.BOOLEAN,
        description:
            "Automate PLAY_ACTIVITY quests (sends the activity heartbeat). / " +
            "Automatizar Quests de actividad (manda el heartbeat de actividad).",
        default: true
    },
    autoStreams: {
        type: OptionType.BOOLEAN,
        description:
            "Try STREAM_ON_DESKTOP quests. Discord also requires a real Go Live and another person in the call, so " +
            "this usually does NOT complete: the engine tries and reports it instead of hanging. Off by default. / " +
            "Intentar Quests de stream. Discord exige además un Go Live real y otra persona en la llamada, así que " +
            "normalmente NO se completan. Apagado por defecto.",
        default: false
    },
    autoHideActivity: {
        type: OptionType.BOOLEAN,
        description:
            "Hide your 'Playing X' status while a game is spoofed, by turning Discord's own 'Display current activity " +
            "as a status message' off and restoring it afterwards (a breadcrumb puts it back if Discord dies mid-way). / " +
            "Ocultar tu estado 'Jugando X' mientras dura el spoof, apagando el ajuste de Discord y restaurándolo después.",
        default: true
    },
    autoLogToConsole: {
        type: OptionType.BOOLEAN,
        description: "Also log the automation to the console (debug) / Escribir también el registro automático en la consola",
        default: false
    },
    autoHumanPacing: {
        type: OptionType.BOOLEAN,
        description:
            "Pacing that looks human: thinks for a few seconds before each action, leaves gaps between quests, keeps the " +
            "game 'open' a bit longer after finishing and waits before claiming. / Ritmo más humano: piensa unos segundos " +
            "antes de cada acción, deja pausas entre Quests, mantiene el juego abierto un poco más y espera antes de reclamar.",
        default: true
    },
    autoScope: {
        type: OptionType.SELECT,
        description:
            "What the automation picks: every allowed quest, or only the ones you star with ☆ in the panel. / " +
            "Qué automatiza: todas las Quests permitidas, o solo las que marques con ☆ en el panel.",
        options: [
            { label: "Todas las permitidas / All allowed", value: "all", default: true },
            { label: "Solo las marcadas con ☆ / Only starred", value: "selected" }
        ]
    },
    autoVideoPip: {
        type: OptionType.BOOLEAN,
        description:
            "Play the quest's real video in a floating Picture-in-Picture window while the engine completes the watch-video " +
            "quest. It does not block the mouse or the rest of the desktop, resumes itself if paused and is muted. / " +
            "Reproduce el vídeo real de la Quest en una ventana flotante (PiP) mientras el motor completa el progreso. " +
            "No bloquea el ratón ni el escritorio, se reanuda si se pausa y está silenciada.",
        default: true
    },
    autoVideoSound: {
        type: OptionType.BOOLEAN,
        description:
            "Start the quest video with sound. Off by default (muted). You can also toggle it from the 🔇/🔊 button on " +
            "the floating video. / Empezar el vídeo con sonido. Apagado por defecto (silenciado). También puedes " +
            "cambiarlo con el botón 🔇/🔊 del vídeo flotante.",
        default: false
    },
    showQuestPageOverlay: {
        type: OptionType.BOOLEAN,
        description:
            "Show a floating progress panel on Discord's Quests page (/quest-home) with every quest's percentage, reward " +
            "and time left. / Muestra un panel flotante con el progreso en la página de Misiones de Discord.",
        default: true
    }
});
