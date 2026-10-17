/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — llamadas a la API de Quests que ya usa el propio cliente.
 *
 * Todas las peticiones salen por `RestAPI`, el cliente autenticado de Discord: es la
 * misma vía que usa su interfaz. No hay servidores intermedios ni tokens propios.
 *
 * Every request goes through Discord's own authenticated `RestAPI`, the same path its UI
 * uses. No middleman servers and no custom tokens.
 */

import { RestAPI } from "@webpack/common";

import { getQuestStore } from "../store";

/**
 * `QuestLocationMap.QUEST_HOME_DESKTOP`. Es la ubicación que el cliente envía al aceptar
 * o reclamar desde la página de Quests; se manda la misma.
 */
const QUEST_LOCATION_DESKTOP = 11;

/**
 * Blob de atribución que el servidor sella por Quest y devuelve en la lista. El cliente
 * lo reenvía sin tocarlo al aceptar y al reclamar. No se inventa nada: se devuelve el
 * valor que Discord entregó.
 */
export function trafficMetadataSealed(questId: string): string | null {
    try {
        return getQuestStore()?.getQuest?.(questId)?.trafficMetadataSealed ?? null;
    } catch {
        return null;
    }
}

/** Status HTTP de un error de RestAPI, si lo trae. */
export function httpErrorStatus(e: any): number | undefined {
    const raw = e?.status ?? e?.statusCode ?? e?.httpStatus;
    return Number.isFinite(Number(raw)) && raw != null ? Number(raw) : undefined;
}

/** Mensaje legible de un error de RestAPI. */
export function errorMessage(e: any): string {
    const fromBody = e?.body?.message ?? e?.body?.error;
    if (typeof fromBody === "string" && fromBody) return fromBody;
    if (typeof e?.message === "string" && e.message) return e.message;
    if (typeof e === "string" && e) return e;
    try {
        return JSON.stringify(e).slice(0, 200);
    } catch {
        return "unknown error";
    }
}

/** Errores en los que insistir no tiene sentido: la Quest no está disponible. */
export function isTerminalHttpStatus(status: number | undefined): boolean {
    return status != null && [400, 403, 404, 409, 410].includes(status);
}

/** Aceptar (inscribirse en) una Quest. / Accept (enrol in) a quest. */
export async function enrollQuest(questId: string): Promise<any> {
    return RestAPI.post({
        url: `/quests/${questId}/enroll`,
        body: {
            location: QUEST_LOCATION_DESKTOP,
            is_targeted: false,
            metadata_sealed: null,
            traffic_metadata_sealed: trafficMetadataSealed(questId)
        }
    });
}

/**
 * Reclamar la recompensa. Puede pedir captcha: en ese caso Discord responde con error y
 * el panel te manda a reclamarla a mano. El plugin nunca intenta saltarse un captcha.
 *
 * Claim the reward. Discord may answer with a captcha challenge; the plugin never tries
 * to bypass it, it just tells you to claim in Discord's own Quests page.
 */
export async function claimReward(questId: string): Promise<any> {
    return RestAPI.post({
        url: `/quests/${questId}/claim-reward`,
        body: {
            platform: 0,
            location: QUEST_LOCATION_DESKTOP,
            is_targeted: false,
            metadata_sealed: null,
            traffic_metadata_sealed: trafficMetadataSealed(questId)
        }
    });
}

/** Progreso de vídeo (segundos del vídeo que llevas visto). */
export async function sendVideoProgress(questId: string, timestamp: number): Promise<any> {
    return RestAPI.post({
        url: `/quests/${questId}/video-progress`,
        body: { timestamp }
    });
}

/**
 * Heartbeat de actividad: el mismo que manda el cliente cuando estás en una actividad
 * de voz. `terminal: true` cierra la sesión.
 */
export async function sendHeartbeat(questId: string, streamKey: string, applicationId: string | null, terminal: boolean): Promise<any> {
    return RestAPI.post({
        url: `/quests/${questId}/heartbeat`,
        body: {
            stream_key: streamKey,
            application_id: applicationId ?? "",
            terminal
        }
    });
}

/** Metadatos públicos de la app (nombre, ejecutables, icono) para el spoof de juego. */
export async function fetchApplication(appId: string): Promise<any> {
    const res = await RestAPI.get({ url: `/applications/public?application_ids=${encodeURIComponent(appId)}` });
    return res?.body?.[0] ?? null;
}
