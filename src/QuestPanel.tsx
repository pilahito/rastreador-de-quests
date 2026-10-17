/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 pilahito
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* QuestTracker — panel de Quests (rastreador + modo automático opcional) */

import { Button } from "@components/Button";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, showToast, TextInput, useEffect, useMemo, useState } from "@webpack/common";

import {
    autoCompleteQuest,
    AutoEntry,
    AutoPhase,
    AutoSnapshot,
    cancelAutoQuest,
    claimQuestNow,
    clearAutoLog,
    getAutoSnapshot,
    getSelectedQuestIds,
    hasAutoConsent,
    isAutoRunning,
    setAutoEnabled,
    setQuestSelected,
    subscribeAuto
} from "./auto/engine";
import { warmQuestVideoWindow } from "./auto/pipVideo";
import { openAutoConsent } from "./AutoConsent";
import { clearHistory, getHistory, HistoryEntry } from "./history";
import { formatDate, formatDuration, StringKey, t } from "./i18n";
import { openExternal, openQuestsInDiscord } from "./nav";
import { isExpiringSoon, QuestInfo, QuestStatus, readQuestsFrom, SortKey, sortQuests, TaskCategory } from "./quests";
import { settings } from "./settings";
import { getQuestStore, subscribeStore } from "./store";

const STATUS_KEYS: Record<QuestStatus, StringKey> = {
    available: "statusAvailable",
    inProgress: "statusInProgress",
    completed: "statusCompleted",
    claimed: "statusClaimed",
    expired: "statusExpired"
};

const TYPE_KEYS: Record<TaskCategory, StringKey> = {
    video: "typeVideo",
    play: "typePlay",
    stream: "typeStream",
    activity: "typeActivity",
    other: "typeOther"
};

const TYPE_ICONS: Record<TaskCategory, string> = {
    video: "▶",
    play: "🎮",
    stream: "📡",
    activity: "🧩",
    other: "★"
};

const PHASE_KEYS: Record<AutoPhase, StringKey> = {
    queued: "autoPhaseQueued",
    accepting: "autoPhaseAccepting",
    working: "autoPhaseWorking",
    claiming: "autoPhaseClaiming",
    done: "autoPhaseDone",
    claimed: "autoPhaseClaimed",
    failed: "autoPhaseFailed",
    blocked: "autoPhaseBlocked",
    stopped: "autoPhaseStopped"
};

const BUSY_PHASES: AutoPhase[] = ["queued", "accepting", "working", "claiming"];

const SORT_KEYS: Record<SortKey, StringKey> = {
    expiry: "sortExpiry",
    progress: "sortProgress",
    name: "sortName",
    newest: "sortNewest"
};

export function readCurrentQuests(force = false): { quests: QuestInfo[]; found: boolean; } {
    const store = getQuestStore(force);
    return { quests: readQuestsFrom(store), found: !!store };
}

function useLiveQuests() {
    const [state, setState] = useState(() => readCurrentQuests());
    const [, setTick] = useState(0);

    useEffect(() => {
        const update = () => setState(readCurrentQuests());
        const unsub = subscribeStore(update);
        const timer = setInterval(() => setTick(n => n + 1), 30_000);
        return () => {
            unsub();
            clearInterval(timer);
        };
    }, []);

    return [state, () => setState(readCurrentQuests(true))] as const;
}

function useAutoSnapshot(): AutoSnapshot {
    const [snapshot, setSnapshot] = useState(getAutoSnapshot);
    useEffect(() => subscribeAuto(() => setSnapshot(getAutoSnapshot())), []);
    return snapshot;
}

function Chip({ active, onClick, children }: { active: boolean; onClick(): void; children: React.ReactNode; }) {
    return (
        <button type="button" className={"vc-qt-chip" + (active ? " vc-qt-chip-active" : "")} onClick={onClick}>
            {children}
        </button>
    );
}

function minutes(sec: number) {
    return Math.floor(sec / 60);
}

function hintFor(q: QuestInfo): string | undefined {
    if (q.status === "completed") return t("claimableHint");
    if (q.status === "available") return t("acceptHint");
    if (q.status !== "inProgress") return undefined;
    switch (q.category) {
        case "play": return t("playHint");
        case "stream": return t("streamHint");
        case "video": return t("videoHint");
        default: return undefined;
    }
}

function QuestCard({ q, entry, selected, onAuto, onClaim, onCancel, onToggleSelect }: {
    q: QuestInfo;
    entry?: AutoEntry;
    selected: boolean;
    onAuto(q: QuestInfo): void;
    onClaim(q: QuestInfo): void;
    onCancel(q: QuestInfo): void;
    onToggleSelect(q: QuestInfo): void;
}) {
    const [imgOk, setImgOk] = useState(true);
    const pct = Math.round(q.progress * 100);
    const now = Date.now();
    const soon = isExpiringSoon(q, settings.store.expiryHours ?? 24, now);
    const hint = hintFor(q);

    const busy = entry != null && BUSY_PHASES.includes(entry.phase);
    const canAuto = (q.status === "inProgress" || q.status === "available") && q.category !== "other";
    const claimable = q.status === "completed";

    return (
        <div className={`vc-qt-card vc-qt-status-${q.status}`}>
            <div className="vc-qt-thumb">
                {q.imageUrl && imgOk
                    ? <img src={q.imageUrl} alt="" loading="lazy" onError={() => setImgOk(false)} />
                    : <span>{TYPE_ICONS[q.category]}</span>}
            </div>

            <div className="vc-qt-body">
                <div className="vc-qt-row">
                    <div className="vc-qt-title" title={q.name}>{q.name}</div>
                    <span className={`vc-qt-badge vc-qt-badge-${q.status}`}>{t(STATUS_KEYS[q.status])}</span>
                </div>

                <div className="vc-qt-meta">
                    <span>{q.game}{q.publisher && q.publisher !== q.game ? ` · ${q.publisher}` : ""}</span>
                    <span className="vc-qt-type">{TYPE_ICONS[q.category]} {t(TYPE_KEYS[q.category])}</span>
                </div>

                <div className="vc-qt-progress" title={`${pct}%`}>
                    <div className="vc-qt-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="vc-qt-meta">
                    <span>
                        {t("progress")}: <b>{pct}%</b>
                        {q.targetSeconds > 0 && ` · ${minutes(Math.min(q.progressSeconds, q.targetSeconds))} ${t("of")} ${minutes(q.targetSeconds)} ${t("minutes")}`}
                    </span>
                    <span className={soon ? "vc-qt-soon" : undefined}>
                        {q.expiresAt
                            ? (q.expiresAt > now ? `${t("timeLeft")}: ${formatDuration(q.expiresAt - now)}` : t("expired"))
                            : t("noExpiry")}
                    </span>
                </div>

                <div className="vc-qt-reward">🎁 {t("reward")}: <b>{q.reward}</b></div>
                {hint && <div className={"vc-qt-hint" + (q.status === "completed" ? " vc-qt-hint-claim" : "")}>{hint}</div>}

                {entry && (entry.detail || entry.error) && (
                    <div className={"vc-qt-auto-note" + (entry.error ? " vc-qt-auto-note-error" : "")}>
                        <b>{t(PHASE_KEYS[entry.phase])}</b>
                        {entry.detail ? ` · ${entry.detail}` : ""}
                        {entry.error ? ` · ${entry.error}` : ""}
                    </div>
                )}

                <div className="vc-qt-actions">
                    {claimable && (
                        <Button size="small" variant="primary" onClick={() => onClaim(q)}>
                            {t("autoButtonClaim")}
                        </Button>
                    )}
                    {canAuto && (
                        <Button
                            size="small"
                            variant={selected ? "primary" : "secondary"}
                            title={t(selected ? "unselectQuest" : "selectQuest")}
                            onClick={() => onToggleSelect(q)}
                        >
                            {selected ? "★" : "☆"}
                        </Button>
                    )}
                    {canAuto && !busy && (
                        <Button size="small" variant="secondary" onClick={() => onAuto(q)}>
                            ▶ {t("autoButtonAuto")}
                        </Button>
                    )}
                    {busy && (
                        <Button size="small" variant="dangerSecondary" onClick={() => onCancel(q)}>
                            {t("autoButtonCancel")}
                        </Button>
                    )}
                    {q.status !== "expired" && q.status !== "claimed" && (
                        <Button size="small" variant="secondary" onClick={() => openQuestsInDiscord(settings.store.questRoute || "/quest-home")}>
                            {t("openInDiscord")}
                        </Button>
                    )}
                    {q.gameUrl && (
                        <Button size="small" variant="secondary" title={t("externalNote")} onClick={() => openExternal(q.gameUrl)}>
                            {t("openGame")}
                        </Button>
                    )}
                    {q.videoUrl && (
                        <Button size="small" variant="secondary" title={t("externalNote")} onClick={() => openExternal(q.videoUrl)}>
                            {t("openVideo")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function AutoEntryCard({ entry }: { entry: AutoEntry; }) {
    const pct = entry.max > 0 ? Math.min(100, Math.round((entry.cur / entry.max) * 100)) : 0;
    return (
        <div className="vc-qt-card vc-qt-autoentry">
            <div className="vc-qt-body">
                <div className="vc-qt-row">
                    <div className="vc-qt-title">{entry.name}</div>
                    <span className={"vc-qt-autochip vc-qt-autochip-" + entry.phase}>{t(PHASE_KEYS[entry.phase])}</span>
                </div>
                {entry.max > 0 && (
                    <div className="vc-qt-progress" title={`${pct}%`}>
                        <div className="vc-qt-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                )}
                <div className="vc-qt-meta">
                    <span>{entry.detail ?? ""}</span>
                    {entry.max > 0 && <span>{pct}%</span>}
                </div>
                {entry.error && <div className="vc-qt-auto-note vc-qt-auto-note-error">{entry.error}</div>}
            </div>
        </div>
    );
}

function QuestsTab({ snapshot }: { snapshot: AutoSnapshot; }) {
    const [{ quests, found }, refresh] = useLiveQuests();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<QuestStatus | "all">("all");
    const [type, setType] = useState<TaskCategory | "all">("all");
    const [sort, setSort] = useState<SortKey>("expiry");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(getSelectedQuestIds()));
    const [scope, setScope] = useState<string>(settings.store.autoScope ?? "all");

    function changeScope(value: string) {
        settings.store.autoScope = value;
        setScope(value);
    }

    function toggleSelect(q: QuestInfo) {
        const next = new Set(selectedIds);
        const on = !next.has(q.id);
        setQuestSelected(q.id, on);
        if (on) next.add(q.id);
        else next.delete(q.id);
        setSelectedIds(next);
    }

    const hours = settings.store.expiryHours ?? 24;
    const summary = useMemo(() => ({
        inProgress: quests.filter(q => q.status === "inProgress").length,
        claimable: quests.filter(q => q.status === "completed").length,
        expiring: quests.filter(q => q.status !== "completed" && isExpiringSoon(q, hours)).length
    }), [quests, hours]);

    const presentTypes = useMemo(() => [...new Set(quests.map(q => q.category))], [quests]);
    const entryById = useMemo(() => new Map(snapshot.entries.map(e => [e.questId, e])), [snapshot.entries]);

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return sortQuests(quests.filter(q =>
            (status === "all" || q.status === status) &&
            (type === "all" || q.category === type) &&
            (!needle || `${q.name} ${q.game} ${q.publisher ?? ""} ${q.reward}`.toLowerCase().includes(needle))
        ), sort);
    }, [quests, query, status, type, sort]);

    function enableAutomation() {
        // Gesto de usuario: deja lista la ventana flotante del vídeo.
        if (settings.store.autoVideoPip) void warmQuestVideoWindow();
        if (!hasAutoConsent()) {
            openAutoConsent(() => {
                setAutoEnabled(true);
            });
            return;
        }
        setAutoEnabled(true);
    }

    function disableAutomation() {
        setAutoEnabled(false);
    }

    function runOne(q: QuestInfo) {
        if (settings.store.autoVideoPip) void warmQuestVideoWindow();
        if (!hasAutoConsent()) {
            openAutoConsent(() => {
                if (!autoCompleteQuest(q.id)) showToast({ text: t("autoConsentMissing"), variant: "danger" } as any);
            });
            return;
        }
        if (autoCompleteQuest(q.id)) showToast({ text: t("autoQueued"), variant: "success" } as any);
    }

    async function claimOne(q: QuestInfo) {
        const ok = await claimQuestNow(q.id);
        showToast({
            text: ok ? t("autoClaimed", { name: q.name }) : t("autoCaptcha"),
            variant: ok ? "success" : "danger"
        } as any);
    }

    const activeEntry = snapshot.activeQuestId ? entryById.get(snapshot.activeQuestId) : undefined;

    return (
        <div className="vc-qt-tab">
            <div className={"vc-qt-autobar" + (snapshot.running ? " vc-qt-autobar-running" : "")}>
                <div className="vc-qt-autobar-info">
                    <div className="vc-qt-autobar-title">
                        ⚙️ {t("autoSectionTitle")}
                        <span className={"vc-qt-autostate" + (snapshot.running ? " vc-qt-autostate-on" : "")}>
                            {snapshot.running ? t("autoStatusRunning") : t("autoStatusIdle")}
                        </span>
                    </div>
                    <div className="vc-qt-meta">
                        {snapshot.running
                            ? (activeEntry ? t("autoStatusActive", { name: activeEntry.name }) : t("autoStatusWaiting"))
                            : t("autoManualOnlyHint")}
                    </div>
                </div>
                <div className="vc-qt-actions">
                    <Button
                        size="small"
                        variant={snapshot.running ? "dangerPrimary" : "primary"}
                        onClick={snapshot.running ? disableAutomation : enableAutomation}
                    >
                        {snapshot.running ? t("autoDisable") : t("autoEnable")}
                    </Button>
                </div>
            </div>

            <div className="vc-qt-filters">
                <span className="vc-qt-label">{t("scopeLabel")}</span>
                <Chip active={scope === "all"} onClick={() => changeScope("all")}>{t("scopeAll")}</Chip>
                <Chip active={scope === "selected"} onClick={() => changeScope("selected")}>{t("scopeSelected")}</Chip>
                <span className="vc-qt-meta">
                    {scope === "selected"
                        ? `${t("selectedCount", { n: selectedIds.size })} · ${t("scopeHintSelected")}`
                        : t("scopeHintAll")}
                </span>
            </div>

            <div className="vc-qt-summary">
                <span><b>{quests.length}</b> Quests</span>
                <span><b>{summary.inProgress}</b> {t("summaryInProgress")}</span>
                <span className={summary.claimable ? "vc-qt-claim" : undefined}><b>{summary.claimable}</b> {t("summaryClaimable")}</span>
                <span className={summary.expiring ? "vc-qt-soon" : undefined}><b>{summary.expiring}</b> {t("summaryExpiring")}</span>
                <Button size="small" variant="secondary" onClick={refresh}>↻ {t("refresh")}</Button>
            </div>

            <TextInput value={query} onChange={setQuery} placeholder={t("search")} />

            <div className="vc-qt-filters">
                <span className="vc-qt-label">{t("filterStatus")}</span>
                <Chip active={status === "all"} onClick={() => setStatus("all")}>{t("all")}</Chip>
                {(Object.keys(STATUS_KEYS) as QuestStatus[]).map(s => (
                    <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{t(STATUS_KEYS[s])}</Chip>
                ))}
            </div>
            <div className="vc-qt-filters">
                <span className="vc-qt-label">{t("filterType")}</span>
                <Chip active={type === "all"} onClick={() => setType("all")}>{t("all")}</Chip>
                {(Object.keys(TYPE_KEYS) as TaskCategory[]).filter(c => presentTypes.includes(c)).map(c => (
                    <Chip key={c} active={type === c} onClick={() => setType(c)}>{TYPE_ICONS[c]} {t(TYPE_KEYS[c])}</Chip>
                ))}
            </div>
            <div className="vc-qt-filters">
                <span className="vc-qt-label">{t("sortBy")}</span>
                {(Object.keys(SORT_KEYS) as SortKey[]).map(k => (
                    <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{t(SORT_KEYS[k])}</Chip>
                ))}
            </div>

            {!found && <div className="vc-qt-empty">{t("storeMissing")}</div>}
            {found && !visible.length && <div className="vc-qt-empty">{t("emptyQuests")}</div>}

            <div className="vc-qt-list">
                {visible.map(q => (
                    <QuestCard
                        key={q.id}
                        q={q}
                        entry={entryById.get(q.id)}
                        selected={selectedIds.has(q.id)}
                        onAuto={runOne}
                        onClaim={claimOne}
                        onCancel={qc => cancelAutoQuest(qc.id)}
                        onToggleSelect={toggleSelect}
                    />
                ))}
            </div>
        </div>
    );
}

function AutoTab({ snapshot }: { snapshot: AutoSnapshot; }) {
    const consent = hasAutoConsent();
    const [scope, setScope] = useState<string>(settings.store.autoScope ?? "all");
    const [selectedCount, setSelectedCount] = useState<number>(() => getSelectedQuestIds().length);

    useEffect(() => {
        setSelectedCount(getSelectedQuestIds().length);
    }, [snapshot.entries]);

    function changeScope(value: string) {
        settings.store.autoScope = value;
        setScope(value);
        setSelectedCount(getSelectedQuestIds().length);
    }

    const activeEntry = snapshot.activeQuestId
        ? snapshot.entries.find(e => e.questId === snapshot.activeQuestId)
        : undefined;
    const queued = snapshot.entries.filter(e => BUSY_PHASES.includes(e.phase) && e.questId !== snapshot.activeQuestId);

    function enable() {
        if (settings.store.autoVideoPip) void warmQuestVideoWindow();
        if (!hasAutoConsent()) {
            openAutoConsent(() => {
                setAutoEnabled(true);
            });
            return;
        }
        setAutoEnabled(true);
    }

    const log = [...snapshot.log].reverse();

    return (
        <div className="vc-qt-tab">
            <div className="vc-qt-warnbox">
                <div className="vc-qt-warnbox-title">⚠️ {t("autoWarningTitle")}</div>
                <p>{t("autoWarningBody")}</p>
                {!consent && (
                    <Button size="small" variant="dangerPrimary" onClick={enable}>
                        {t("autoEnable")}
                    </Button>
                )}
            </div>

            <div className="vc-qt-summary">
                <span>{snapshot.running ? t("autoStatusRunning") : t("autoStatusIdle")}</span>
                <Button
                    size="small"
                    variant={snapshot.running ? "dangerPrimary" : "primary"}
                    onClick={() => setAutoEnabled(!snapshot.running)}
                >
                    {snapshot.running ? t("autoDisable") : t("autoEnable")}
                </Button>
            </div>

            <div className="vc-qt-filters">
                <span className="vc-qt-label">{t("scopeLabel")}</span>
                <Chip active={scope === "all"} onClick={() => changeScope("all")}>{t("scopeAll")}</Chip>
                <Chip active={scope === "selected"} onClick={() => changeScope("selected")}>{t("scopeSelected")}</Chip>
                <span className="vc-qt-meta">
                    {scope === "selected"
                        ? `${t("selectedCount", { n: selectedCount })} · ${t("scopeHintSelected")}`
                        : t("scopeHintAll")}
                </span>
            </div>
            {scope === "selected" && selectedCount === 0 && (
                <div className="vc-qt-hint">{t("autoSelectNone")}</div>
            )}

            {activeEntry && (
                <div className="vc-qt-auto-section">
                    <div className="vc-qt-row"><b>{t("autoCurrent")}</b></div>
                    <AutoEntryCard entry={activeEntry} />
                </div>
            )}

            <div className="vc-qt-auto-section">
                <div className="vc-qt-row">
                    <b>{t("autoQueue")}</b>
                    <span className="vc-qt-meta">{queued.length}</span>
                </div>
                {queued.length
                    ? queued.map(e => <AutoEntryCard key={e.questId} entry={e} />)
                    : <div className="vc-qt-empty">{t("autoQueueEmpty")}</div>}
            </div>

            <div className="vc-qt-auto-section">
                <div className="vc-qt-row">
                    <b>{t("autoLogTitle")}</b>
                    <Button size="small" variant="secondary" onClick={clearAutoLog}>{t("autoClearLog")}</Button>
                </div>
                {log.length
                    ? (
                        <div className="vc-qt-log">
                            {log.map((line, index) => (
                                <div key={index} className={"vc-qt-logline vc-qt-log-" + line.level}>
                                    <span className="vc-qt-logtime">{new Date(line.time).toLocaleTimeString()}</span>
                                    <span>{line.text}</span>
                                </div>
                            ))}
                        </div>
                    )
                    : <div className="vc-qt-empty">{t("autoEmptyLog")}</div>}
            </div>

            <div className="vc-qt-footer">{t("autoSettingsHint")}</div>
        </div>
    );
}

function HistoryTab() {
    const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

    useEffect(() => {
        void getHistory().then(setEntries);
    }, []);

    if (entries == null) return <div className="vc-qt-empty">…</div>;
    if (!entries.length) return <div className="vc-qt-empty">{t("emptyHistory")}</div>;

    return (
        <div className="vc-qt-tab">
            <div className="vc-qt-summary">
                <span><b>{entries.length}</b> Quests</span>
                <span><b>{entries.filter(e => e.claimedAt).length}</b> {t("statusClaimed").toLowerCase()}</span>
                <Button
                    size="small"
                    variant="dangerSecondary"
                    onClick={async () => {
                        await clearHistory();
                        setEntries([]);
                        showToast({ text: t("historyCleared"), variant: "success" } as any);
                    }}
                >
                    {t("clearHistory")}
                </Button>
            </div>
            <div className="vc-qt-list">
                {entries.map(e => (
                    <div key={e.id} className={`vc-qt-card vc-qt-status-${e.claimedAt ? "claimed" : "completed"}`}>
                        <div className="vc-qt-body">
                            <div className="vc-qt-row">
                                <div className="vc-qt-title">{e.name}</div>
                                <span className={`vc-qt-badge vc-qt-badge-${e.claimedAt ? "claimed" : "completed"}`}>
                                    {t(e.claimedAt ? "statusClaimed" : "statusCompleted")}
                                </span>
                            </div>
                            <div className="vc-qt-meta"><span>{e.game}</span><span>🎁 {e.reward}</span></div>
                            <div className="vc-qt-meta">
                                {e.completedAt && <span>{t("completedOn")}: {formatDate(e.completedAt)}</span>}
                                {e.claimedAt && <span>{t("claimedOn")}: {formatDate(e.claimedAt)}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuestPanel({ modalProps }: { modalProps: RenderModalProps; }) {
    const [tab, setTab] = useState<"quests" | "auto" | "history">("quests");
    const snapshot = useAutoSnapshot();
    const running = snapshot.running || isAutoRunning();

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={`🏆 ${t("panelTitle")}`}
            subtitle={t("panelSubtitle")}
            actions={[{ text: t("close"), variant: "secondary", onClick: modalProps.onClose }]}
        >
            <div className="vc-qt-root">
                <div className="vc-qt-tabs">
                    <Chip active={tab === "quests"} onClick={() => setTab("quests")}>{t("tabQuests")}</Chip>
                    <Chip active={tab === "auto"} onClick={() => setTab("auto")}>⚙️ {t("tabAuto")}</Chip>
                    <Chip active={tab === "history"} onClick={() => setTab("history")}>{t("tabHistory")}</Chip>
                </div>
                {tab === "quests" && <QuestsTab snapshot={snapshot} />}
                {tab === "auto" && <AutoTab snapshot={snapshot} />}
                {tab === "history" && <HistoryTab />}
                <div className="vc-qt-footer">
                    {running ? `⚠️ ${t("autoFooter")}` : `🔒 ${t("readOnlyFooter")}`}
                </div>
            </div>
        </Modal>
    );
}

export function openQuestPanel() {
    // Este clic suele ser un gesto de usuario: aprovecharlo para dejar lista la ventana
    // flotante del vídeo (Document PiP exige activación por gesto).
    if (settings.store.autoVideoPip) void warmQuestVideoWindow();
    openModal(modalProps => <QuestPanel modalProps={modalProps} />);
}
