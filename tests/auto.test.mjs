/*
 * QuestTracker â€” pruebas de la lÃ³gica pura del modo automÃ¡tico.
 *
 * Se ejecutan sin Vencord ni Discord: `node --test tests/`.
 * Run without Vencord or Discord: `node --test tests/`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
    detectTask,
    formatSeconds,
    isConsoleOnly,
    isQuestExpired,
    jitter,
    nextVideoTimestamp,
    pickExecutable,
    questBlocker,
    readProgressSeconds,
    sanitizeName,
    selectQuestTaskConfig,
    selectTaskFamily
} from "../src/auto/pure.ts";

const taskConfig = (tasks) => ({ tasks });

test("selectQuestTaskFamily prefiere la clave exacta de escritorio", () => {
    const family = selectTaskFamily(["WATCH_VIDEO_ON_MOBILE", "WATCH_VIDEO"]);
    assert.deepEqual(family, { type: "VIDEO", keyName: "WATCH_VIDEO" });

    const game = selectTaskFamily(["PLAY_ON_XBOX", "PLAY_ON_DESKTOP", "PLAY_ON_PLAYSTATION"]);
    assert.deepEqual(game, { type: "GAME", keyName: "PLAY_ON_DESKTOP" });
});

test("selectQuestTaskFamily distingue actividad y logro", () => {
    assert.deepEqual(selectTaskFamily(["PLAY_ACTIVITY"]), { type: "ACTIVITY", keyName: "PLAY_ACTIVITY" });
    assert.deepEqual(selectTaskFamily(["ACHIEVEMENT_IN_ACTIVITY"]), { type: "ACHIEVEMENT", keyName: "ACHIEVEMENT_IN_ACTIVITY" });
    assert.equal(selectTaskFamily(["PLAY_ON_XBOX"]), null);
});

test("detectTask lee el app id de la ruta nueva (julio 2026)", () => {
    const config = taskConfig({
        PLAY_ON_DESKTOP: { target: 900, applications: [{ id: "1234567890" }] }
    });
    const detected = detectTask(config, "legacy-id");
    assert.equal(detected.type, "GAME");
    assert.equal(detected.appId, "1234567890");
    assert.equal(detected.target, 900);
});

test("detectTask usa el app id antiguo como respaldo", () => {
    const config = taskConfig({ PLAY_ON_DESKTOP: { target: 60 } });
    const detected = detectTask(config, 42);
    assert.equal(detected.appId, "42");
});

test("detectTask no inventa tareas de consola ni vacÃ­as", () => {
    assert.equal(detectTask(taskConfig({ PLAY_ON_XBOX: { target: 60 } }), "1"), null);
    assert.equal(detectTask({}, "1"), null);
});

test("readProgressSeconds lee Map, objeto y el campo antiguo de stream", () => {
    assert.equal(readProgressSeconds({ progress: { WATCH_VIDEO: { value: 123 } } }, "WATCH_VIDEO"), 123);
    assert.equal(readProgressSeconds({ progress: new Map([["WATCH_VIDEO", { value: 77 }]]) }, "WATCH_VIDEO"), 77);
    assert.equal(readProgressSeconds({ progress: {}, streamProgressSeconds: 55 }, "STREAM_ON_DESKTOP"), 55);
    assert.equal(readProgressSeconds(null, "WATCH_VIDEO"), 0);
});

test("questBlocker nombra cada motivo y deja pasar lo vÃ¡lido", () => {
    const video = { type: "VIDEO", keyName: "WATCH_VIDEO", target: 60, appId: null };
    assert.equal(questBlocker({ name: "q", keys: ["WATCH_VIDEO"], detected: video, isDesktop: false }), null);

    const game = { type: "GAME", keyName: "PLAY_ON_DESKTOP", target: 60, appId: "1" };
    assert.equal(questBlocker({ name: "q", keys: ["PLAY_ON_DESKTOP"], detected: game, isDesktop: false }), "needsDesktop");
    assert.equal(questBlocker({ name: "q", keys: [], detected: null, isDesktop: true }), "noTasks");
    assert.equal(questBlocker({ name: "q", keys: ["PLAY_ON_XBOX"], detected: null, isDesktop: true }), "consoleOnly");
    assert.equal(questBlocker({ name: "q", keys: ["RARE"], detected: null, isDesktop: true }), "unsupported");
    assert.equal(questBlocker({ name: "q", keys: ["ACHIEVEMENT_IN_GAME"], detected: null, isDesktop: true }), "achievementInGame");
    assert.equal(questBlocker({ name: "q", keys: ["WATCH_VIDEO"], detected: { ...video, target: 0 }, isDesktop: true }), "invalidTarget");
});

test("pickExecutable prefiere el binario del juego y no duplica la carpeta", () => {
    const exe = pickExecutable([
        { os: "win32", name: "test/marvel-test.exe" },
        { os: "win32", name: "MarvelRivals/Launcher.exe" },
        { os: "win32", name: "MarvelRivals/marvel.exe" }
    ], "Marvel Rivals");
    assert.equal(exe.exeName, "marvel.exe");
    assert.equal(exe.relPath, "MarvelRivals/marvel.exe");

    const nested = pickExecutable([{ os: "win32", name: "Dragonheir Silent Gods/dragonheir.exe" }], "Dragonheir Silent Gods");
    assert.equal(nested.exeName, "dragonheir.exe");
    assert.equal(nested.relPath, "Dragonheir Silent Gods/dragonheir.exe");
});

test("pickExecutable cae a un nombre plausible sin metadatos", () => {
    const exe = pickExecutable(undefined, "Some Game");
    assert.equal(exe.exeName, "SomeGame.exe");
    assert.equal(exe.relPath, "Some Game/SomeGame.exe");
});

test("nextVideoTimestamp nunca se pasa del objetivo ni del reloj real", () => {
    assert.equal(nextVideoTimestamp(0, 8000, 600, 10), 8);
    assert.equal(nextVideoTimestamp(590, 60_000, 600, 10), 600);
    assert.equal(nextVideoTimestamp(30, 0, 600, 10), 30);

    const enrolledAt = Date.now() - 5_000;
    const capped = nextVideoTimestamp(0, 60_000, 600, 10, enrolledAt);
    assert.ok(capped <= 16, `no debe adelantarse al tiempo real, fue ${capped}`);
});

test("formatSeconds y sanitizeName", () => {
    assert.equal(formatSeconds(45), "45 s");
    assert.equal(formatSeconds(150), "2 min 30 s");
    assert.equal(formatSeconds(3_900), "1 h 05 min");
    assert.equal(sanitizeName("  Apex: Legendsâ„¢ / X "), "Apex Legends X");
});

test("isQuestExpired trata fechas rotas como vigentes", () => {
    assert.equal(isQuestExpired("2000-01-01T00:00:00Z"), true);
    assert.equal(isQuestExpired("2999-01-01T00:00:00Z"), false);
    assert.equal(isQuestExpired(undefined), false);
    assert.equal(isQuestExpired("not a date"), false);
});

test("selectQuestTaskConfig prefiere V2 con tareas", () => {
    const config = {
        taskConfigV2: { tasks: { WATCH_VIDEO: { target: 30 } } },
        taskConfig: { tasks: { WATCH_VIDEO: { target: 999 } } }
    };
    assert.equal(selectQuestTaskConfig(config).tasks.WATCH_VIDEO.target, 30);
    assert.equal(selectQuestTaskConfig({ taskConfig: { tasks: { WATCH_VIDEO: { target: 5 } } } }).tasks.WATCH_VIDEO.target, 5);
});

test("jitter respeta el rango", () => {
    assert.equal(jitter(5, 10, () => 0), 5);
    assert.equal(jitter(5, 10, () => 0.999999), 10);
    assert.equal(jitter(10, 5, () => 0.5), 8);
});

test("isConsoleOnly", () => {
    assert.equal(isConsoleOnly(["PLAY_ON_XBOX", "PLAY_ON_PLAYSTATION"]), true);
    assert.equal(isConsoleOnly(["PLAY_ON_XBOX", "PLAY_ON_DESKTOP"]), false);
    assert.equal(isConsoleOnly([]), false);
});


