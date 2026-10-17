/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — accesos rápidos que SOLO navegan / shortcuts that ONLY navigate.
 * No aceptan, no completan ni reclaman nada. / They never accept, complete or claim anything.
 */

import { closeAllModals, NavigationRouter, SettingsRouter, showToast } from "@webpack/common";

import { logger } from "./store";

/** Opens Discord's own Quests page so YOU can do the quest. */
export function openQuestsInDiscord(route = "/quest-home") {
    try {
        closeAllModals();
    } catch { /* ignore */ }

    try {
        NavigationRouter.transitionTo(route);
        return;
    } catch (e) {
        logger.warn("Quest route failed, falling back to settings", e);
    }

    // Older clients kept Quests in User Settings / clientes antiguos: Quests en Ajustes
    for (const target of ["inventory_panel", "Inventory", "quests"]) {
        try {
            void SettingsRouter.openUserSettings(target);
            return;
        } catch { /* try next */ }
    }
    showToast({ text: "Discord → Quests" });
}

/** Opens an external https link in the system browser. */
export function openExternal(url: string | undefined) {
    if (!url) return;
    try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") return;
    } catch {
        return;
    }
    try {
        if (typeof VencordNative !== "undefined" && VencordNative?.native?.openExternal) {
            void VencordNative.native.openExternal(url);
            return;
        }
    } catch { /* fallback below */ }
    window.open(url, "_blank", "noopener,noreferrer");
}
