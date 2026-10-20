/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * QuestTracker — vídeo de la Quest en una ventana flotante.
 *
 * Discord (Electron) no permite Document Picture-in-Picture, pero SÍ el PiP nativo del
 * elemento <video>. Se reproduce el vídeo real de la Quest en un recuadro dentro de
 * Discord y, en cuanto hay un clic/tecla del usuario (el navegador exige un gesto), salta
 * a una ventana flotante del sistema que queda por encima de todo, no roba el foco y deja
 * usar el ratón con normalidad. Si se pausa, se reanuda solo. Silenciado por defecto.
 *
 * Electron blocks Document PiP, but the native <video> PiP works: the quest's real video
 * plays in a small in-Discord box and pops out to a system floating window on the user's
 * next click/key (browsers require a gesture). Muted, auto-resume, mouse stays usable.
 */

import { t } from "../i18n";
import { settings } from "../settings";
import { logger } from "../store";

let box: HTMLDivElement | null = null;
let video: HTMLVideoElement | null = null;
let idle: HTMLElement | null = null;
let current: { url: string; title: string; } | null = null;
let gestureBound = false;
let pauseGuard: ReturnType<typeof setTimeout> | undefined;
let paintMuteButton: (() => void) | undefined;

/** Silenciado por defecto; el botón 🔇/🔊 (o el ajuste) activa el sonido. */
function soundEnabled(): boolean {
    try {
        return settings.store.autoVideoSound === true;
    } catch {
        return false;
    }
}

function applySound(): void {
    if (video) video.muted = !soundEnabled();
    paintMuteButton?.();
}

function ensureBox(): boolean {
    if (box) {
        applySound();
        return true;
    }
    try {
        const container = document.createElement("div");
        container.id = "vc-qt-pip-fallback";

        const player = document.createElement("video");
        player.autoplay = true;
        player.playsInline = true;
        player.muted = true;
        player.controls = false;
        player.style.display = "none";
        player.addEventListener("pause", scheduleResume);
        player.addEventListener("enterpictureinpicture", () => { container.style.display = "none"; });
        player.addEventListener("leavepictureinpicture", () => {
            if (current) container.style.display = "";
        });

        const placeholder = document.createElement("div");
        placeholder.className = "vc-qt-pip-idle";
        placeholder.textContent = t("pipIdle");

        const bar = document.createElement("div");
        bar.className = "vc-qt-pip-bar";

        const muteBtn = document.createElement("button");
        muteBtn.type = "button";
        muteBtn.className = "vc-qt-pip-btn";
        const paintMute = () => {
            muteBtn.textContent = soundEnabled() ? "🔊" : "🔇";
            muteBtn.title = soundEnabled() ? t("pipMute") : t("pipUnmute");
        };
        paintMuteButton = paintMute;
        paintMute();
        muteBtn.addEventListener("click", event => {
            event.stopPropagation();
            settings.store.autoVideoSound = !soundEnabled();
            applySound();
        });

        const popBtn = document.createElement("button");
        popBtn.type = "button";
        popBtn.className = "vc-qt-pip-btn";
        popBtn.textContent = "⧉";
        popBtn.title = t("pipPopout");
        popBtn.addEventListener("click", event => {
            event.stopPropagation();
            popOutQuestVideo();
        });
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "vc-qt-pip-btn";
        closeBtn.textContent = "×";
        closeBtn.title = t("pipClose");
        closeBtn.addEventListener("click", event => {
            event.stopPropagation();
            closeQuestVideoWindow();
        });
        bar.append(muteBtn, popBtn, closeBtn);

        container.append(player, placeholder, bar);
        // Arranca oculto: solo aparece cuando hay un vídeo real reproduciéndose.
        container.style.display = "none";
        document.body.appendChild(container);
        box = container;
        video = player;
        idle = placeholder;
        bindGesture();
        return true;
    } catch (e) {
        logger.warn("No se pudo crear el recuadro de vídeo flotante:", e);
        return false;
    }
}

/** El navegador exige un gesto para el PiP: en el primer clic/tecla, salta a ventana. */
function bindGesture(): void {
    if (gestureBound) return;
    gestureBound = true;
    const attempt = (event?: Event) => {
        // Los clics dentro del recuadro son para sus botones (silenciar, cerrar…).
        const target = event?.target as HTMLElement | null;
        if (target?.closest?.("#vc-qt-pip-fallback")) return;
        if (!current || !video || document.pictureInPictureElement) return;
        if (!document.pictureInPictureEnabled) return;
        video.requestPictureInPicture?.().catch(() => { /* se queda en el recuadro */ });
    };
    document.addEventListener("pointerdown", attempt, true);
    document.addEventListener("keydown", attempt, true);
}

function scheduleResume(): void {
    if (!current || !video) return;
    clearTimeout(pauseGuard);
    pauseGuard = setTimeout(() => {
        if (!current || !video || video.ended) return;
        video.play().catch(() => { /* silencio */ });
    }, 300);
}

/** Salta la ventana flotante del vídeo (necesita gesto del usuario: se llama desde un botón). */
export function popOutQuestVideo(): void {
    if (!video || !current) return;
    if (document.pictureInPictureElement) return;
    if (!document.pictureInPictureEnabled) return;
    video.requestPictureInPicture?.().catch(e => logger.debug("PiP rechazado:", e));
}

/** Prepara el recuadro de vídeo. Es síncrono; se llama desde un clic para dejar listo el gesto. */
export async function warmQuestVideoWindow(): Promise<boolean> {
    if (!settings.store.autoVideoPip) return false;
    return ensureBox();
}

/** Solo vídeos https de los CDN de Discord: nada de URLs arbitrarias. */
const VIDEO_HOST_RE = /(^|\.)(discordapp\.(com|net)|discord\.com|discord\.media)$/i;

function safeVideoUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.protocol !== "https:") return null;
        if (!VIDEO_HOST_RE.test(u.hostname)) return null;
        return u.href;
    } catch {
        return null;
    }
}

/** Reproduce el vídeo real de una Quest en el recuadro flotante. */
export async function showQuestVideo(url: string | undefined, title: string): Promise<void> {
    if (!settings.store.autoVideoPip) return;
    const safe = safeVideoUrl(url);
    if (!safe) {
        logger.warn("Vídeo de Quest ignorado: la URL no es del CDN de Discord.");
        return;
    }
    current = { url: safe, title };
    if (!ensureBox() || !video) return;
    applySound();
    try {
        if (video.src !== safe) {
            video.src = safe;
            video.load();
        }
        if (idle) idle.style.display = "none";
        video.style.display = "block";
        if (box) box.style.display = "";
        video.muted = !soundEnabled();
        await video.play();
        // Si el usuario ya dio permiso antes (PiP activo), se mantiene; si no, queda en el recuadro.
        if (document.pictureInPictureElement === video) return;
    } catch (e) {
        logger.debug("El vídeo de la Quest no se pudo reproducir (CSP o red):", e);
        video.muted = true;
        video.play().catch(() => { /* silencio */ });
    }
}

/** Deja de reproducir y oculta el recuadro (queda listo para la siguiente Quest). */
export function hideQuestVideo(): void {
    current = null;
    clearTimeout(pauseGuard);
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture?.().catch(() => { /* silencio */ });
    }
    if (!video) return;
    try {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.style.display = "none";
    } catch { /* silencio */ }
    if (idle) idle.style.display = "flex";
    if (box) box.style.display = "none";
}

/** Cierra el recuadro flotante (al descargar el plugin). */
export function closeQuestVideoWindow(): void {
    hideQuestVideo();
    box?.remove();
    box = null;
    video = null;
    idle = null;
    paintMuteButton = undefined;
}
