/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — ocultar temporalmente tu estado "Jugando" mientras dura el spoof.
 *
 * Sin esto, tus amigos verían "Jugando <juego>" durante la Quest aunque el juego no esté
 * abierto. Se apaga el ajuste propio de Discord `status.showCurrentGame` SOLO mientras
 * hay un juego falso y se restaura al acabar. Si Discord se cierra de golpe, se deja una
 * miga en DataStore y la siguiente carga lo vuelve a encender: el ajuste nunca se queda
 * apagado para siempre.
 *
 * While a fake game is installed, Discord's own `status.showCurrentGame` is turned off and
 * restored afterwards. If Discord dies mid-way, a DataStore breadcrumb makes the next load
 * turn it back on, so the setting can never be left off for good.
 */

import * as DataStore from "@api/DataStore";
import { getUserSettingLazy } from "@api/UserSettings";

import { logger } from "../store";

const BREADCRUMB_KEY = "QuestTracker_presenceSuppressed";

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

let saved: boolean | null = null;

/** ¿Está apagado por nosotros ahora mismo? */
export function presenceSuppressed(): boolean {
    return saved !== null;
}

/**
 * Apaga "mostrar actividad" si estaba encendido. Idempotente.
 * Devuelve true si realmente cambió algo.
 */
export async function suppressPresence(): Promise<boolean> {
    if (saved !== null) return false;
    try {
        const current = ShowCurrentGame.getSetting() === true;
        saved = current;
        if (!current) return false;

        // La miga se escribe ANTES de cambiar el ajuste: si el renderer muere entre
        // ambas cosas, queda constancia de que hay que restaurarlo.
        await DataStore.set(BREADCRUMB_KEY, true);
        await ShowCurrentGame.updateSetting(false);
        logger.info("Estado 'Jugando' oculto mientras dura el spoof.");
        return true;
    } catch (e) {
        saved = null;
        logger.warn("No se pudo ocultar el estado 'Jugando' (ajuste status.showCurrentGame no disponible):", e);
        return false;
    }
}

/** Restaura "mostrar actividad" si lo apagamos nosotros. */
export async function restorePresence(): Promise<void> {
    if (saved === null) return;
    const previous = saved;
    saved = null;
    if (!previous) {
        await DataStore.del(BREADCRUMB_KEY).catch(() => { });
        return;
    }
    try {
        await ShowCurrentGame.updateSetting(true);
        await DataStore.del(BREADCRUMB_KEY);
        logger.info("Estado 'Jugando' restaurado.");
    } catch (e) {
        // La miga se queda: la próxima carga lo reintenta.
        logger.error("No se pudo restaurar 'mostrar actividad'. La próxima carga lo reintentará.", e);
    }
}

/**
 * Repara una sesión anterior que terminó sin restaurar el ajuste.
 * Se llama al cargar el plugin, no al empezar una Quest.
 */
export async function repairPresenceIfNeeded(): Promise<void> {
    try {
        if (!await DataStore.get(BREADCRUMB_KEY)) return;
        await ShowCurrentGame.updateSetting(true);
        await DataStore.del(BREADCRUMB_KEY);
        logger.info("Sesión anterior sin restaurar: 'mostrar actividad' vuelve a estar encendido.");
    } catch (e) {
        logger.warn("No se pudo reparar 'mostrar actividad' de una sesión anterior:", e);
    }
}
