/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

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
    }
});
