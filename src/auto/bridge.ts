/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — puente entre Ajustes y el motor automático.
 *
 * settings.ts no puede importar engine.ts (engine ya importa settings) sin cerrar un
 * ciclo, así que ambos hablan por este módulo, que no importa nada. El motor registra
 * sus handlers al arrancar y los limpia al parar.
 *
 * settings.ts cannot import engine.ts without a cycle, so both talk through this
 * dependency-free module. The engine registers its handlers at start and clears them at stop.
 */

type Handler<T> = (value: T) => void;

let onAutoEnabledChanged: Handler<boolean> | null = null;
let onConsentChanged: Handler<boolean> | null = null;

export function setAutoEnabledHook(fn: Handler<boolean> | null): void {
    onAutoEnabledChanged = fn;
}

export function fireAutoEnabledChanged(value: boolean): void {
    onAutoEnabledChanged?.(value);
}

export function setConsentHook(fn: Handler<boolean> | null): void {
    onConsentChanged = fn;
}

export function fireConsentChanged(value: boolean): void {
    onConsentChanged?.(value);
}
