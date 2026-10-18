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

import { t } from "./i18n";
import { settings } from "./settings";
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

const MOBILE_BUTTON_RE = /ver en el m[oó]vil|view on mobile|voir sur mobile|auf dem handy|auf dem mobil/i;

/**
 * Pulsa el botón oficial «Ver en el móvil» de Discord para que muestre SU QR.
 * Es solo navegación/UI: no completa ni acredita nada.
 */
export function openMobileQuestQR(): void {
    const findAndClick = (): boolean => {
        const nodes = document.querySelectorAll<HTMLElement>("button, a, [role='button']");
        for (const node of Array.from(nodes)) {
            const text = (node.textContent ?? "").trim();
            if (text.length <= 40 && MOBILE_BUTTON_RE.test(text)) {
                node.click();
                return true;
            }
        }
        return false;
    };

    if (findAndClick()) return;

    // Si no estamos en Misiones, ir y reintentar unos segundos (el QR lo pinta Discord).
    openQuestsInDiscord();
    let tries = 0;
    const timer = setInterval(() => {
        if (findAndClick()) {
            clearInterval(timer);
            return;
        }
        if (++tries >= 8) {
            clearInterval(timer);
            showToast({ text: t("mobileQRFailed") });
        }
    }, 500);
}

/** Opens an external https link in the system browser (solo tras confirmar). */
export function openExternal(url: string | undefined) {
    if (!url) return;
    try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") return;
    } catch {
        return;
    }
    // Nunca se abre el navegador sin permiso: evita ventanas inesperadas.
    if (settings.store.externalLinksConfirm !== false && !window.confirm(t("externalConfirm"))) {
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
