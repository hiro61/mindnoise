import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerMode = "countdown" | "countup";
type TimerPhase = "idle" | "running" | "paused";
type View = "timer" | "history";

type Distraction = {
  atSecond: number;
};

type CircuitTrace = {
  path: string;
  startProgress: number;
  endProgress: number;
  node?: {
    x: number;
    y: number;
    shape?: "circle" | "square";
  };
  strokeWidth?: number;
};

export type MeditationSession = {
  id: string;
  date: string;
  weekday: string;
  mode: TimerMode;
  plannedSeconds: number;
  actualSeconds: number;
  startedAt: string;
  endedAt: string;
  distractions: Distraction[];
};

const STORAGE_KEY = "mindnoise.sessions.v1";
const MAX_SECONDS = 24 * 60 * 60;
const WEEKDAYS_SHORT = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAYS_LONG = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const CIRCUIT_TRACES: CircuitTrace[] = [
  { path: "M 530 500 L 612 500", startProgress: 0, endProgress: 0.11, node: { x: 612, y: 500 }, strokeWidth: 5 },
  { path: "M 470 500 L 388 500", startProgress: 0.004, endProgress: 0.12, node: { x: 388, y: 500 }, strokeWidth: 5 },
  { path: "M 500 470 L 500 388", startProgress: 0.008, endProgress: 0.15, node: { x: 500, y: 388, shape: "square" }, strokeWidth: 5 },
  { path: "M 500 530 L 500 612", startProgress: 0.012, endProgress: 0.18, node: { x: 500, y: 612 }, strokeWidth: 5 },
  { path: "M 612 500 L 684 500 L 684 438", startProgress: 0.17, endProgress: 0.29, node: { x: 684, y: 438 }, strokeWidth: 4 },
  { path: "M 612 500 L 672 500 L 720 548", startProgress: 0.21, endProgress: 0.34, node: { x: 720, y: 548, shape: "square" }, strokeWidth: 4 },
  { path: "M 388 500 L 316 500 L 316 442", startProgress: 0.24, endProgress: 0.37, node: { x: 316, y: 442 }, strokeWidth: 4 },
  { path: "M 388 500 L 328 500 L 280 548", startProgress: 0.28, endProgress: 0.41, node: { x: 280, y: 548, shape: "square" }, strokeWidth: 4 },
  { path: "M 500 388 L 500 326 L 560 326", startProgress: 0.33, endProgress: 0.46, node: { x: 560, y: 326 }, strokeWidth: 4 },
  { path: "M 500 388 L 448 336 L 448 282", startProgress: 0.37, endProgress: 0.5, node: { x: 448, y: 282, shape: "square" }, strokeWidth: 4 },
  { path: "M 500 612 L 500 674 L 560 674", startProgress: 0.41, endProgress: 0.54, node: { x: 560, y: 674 }, strokeWidth: 4 },
  { path: "M 500 612 L 452 660 L 452 718", startProgress: 0.45, endProgress: 0.58, node: { x: 452, y: 718, shape: "square" }, strokeWidth: 4 },
  { path: "M 684 438 L 756 438 L 792 402", startProgress: 0.52, endProgress: 0.64, node: { x: 792, y: 402 }, strokeWidth: 3 },
  { path: "M 720 548 L 786 548 L 786 616", startProgress: 0.55, endProgress: 0.68, node: { x: 786, y: 616, shape: "square" }, strokeWidth: 3 },
  { path: "M 316 442 L 244 442 L 208 406", startProgress: 0.58, endProgress: 0.71, node: { x: 208, y: 406 }, strokeWidth: 3 },
  { path: "M 280 548 L 214 548 L 214 616", startProgress: 0.61, endProgress: 0.74, node: { x: 214, y: 616, shape: "square" }, strokeWidth: 3 },
  { path: "M 560 326 L 628 326 L 664 290", startProgress: 0.65, endProgress: 0.78, node: { x: 664, y: 290 }, strokeWidth: 3 },
  { path: "M 448 282 L 382 282 L 346 246", startProgress: 0.68, endProgress: 0.81, node: { x: 346, y: 246 }, strokeWidth: 3 },
  { path: "M 560 674 L 632 674 L 676 718", startProgress: 0.71, endProgress: 0.84, node: { x: 676, y: 718, shape: "square" }, strokeWidth: 3 },
  { path: "M 452 718 L 382 718 L 344 756", startProgress: 0.74, endProgress: 0.87, node: { x: 344, y: 756 }, strokeWidth: 3 },
  { path: "M 792 402 L 834 402 L 866 370", startProgress: 0.79, endProgress: 0.91, node: { x: 866, y: 370, shape: "square" }, strokeWidth: 2.5 },
  { path: "M 786 616 L 836 616 L 866 646", startProgress: 0.81, endProgress: 0.93, node: { x: 866, y: 646 }, strokeWidth: 2.5 },
  { path: "M 208 406 L 166 406 L 134 374", startProgress: 0.83, endProgress: 0.95, node: { x: 134, y: 374, shape: "square" }, strokeWidth: 2.5 },
  { path: "M 214 616 L 164 616 L 134 646", startProgress: 0.85, endProgress: 0.97, node: { x: 134, y: 646 }, strokeWidth: 2.5 },
  { path: "M 664 290 L 704 290 L 704 248", startProgress: 0.87, endProgress: 0.98, node: { x: 704, y: 248 }, strokeWidth: 2.5 },
  { path: "M 346 246 L 306 246 L 306 204", startProgress: 0.89, endProgress: 1, node: { x: 306, y: 204, shape: "square" }, strokeWidth: 2.5 },
  { path: "M 676 718 L 720 718 L 720 764", startProgress: 0.91, endProgress: 1, node: { x: 720, y: 764 }, strokeWidth: 2.5 },
  { path: "M 344 756 L 300 756 L 300 804", startProgress: 0.93, endProgress: 1, node: { x: 300, y: 804, shape: "square" }, strokeWidth: 2.5 },
  { path: "M 684 500 L 742 472 L 790 472", startProgress: 0.78, endProgress: 0.96, node: { x: 790, y: 472 }, strokeWidth: 2 },
  { path: "M 316 500 L 258 472 L 210 472", startProgress: 0.8, endProgress: 0.98, node: { x: 210, y: 472 }, strokeWidth: 2 },
  { path: "M 500 326 L 532 282 L 532 236", startProgress: 0.82, endProgress: 1, node: { x: 532, y: 236, shape: "square" }, strokeWidth: 2 },
  { path: "M 500 674 L 468 718 L 468 764", startProgress: 0.84, endProgress: 1, node: { x: 468, y: 764 }, strokeWidth: 2 },
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function clampDuration(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return 60;
  }
  return Math.min(MAX_SECONDS, Math.max(60, Math.floor(seconds)));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

function formatElapsedMarker(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}時間${pad(minutes)}分${pad(remainingSeconds)}秒`;
  }

  return `${minutes}分${pad(remainingSeconds)}秒`;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ""}`;
  }
  return `${Math.max(1, minutes)}分`;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatHeaderDate(date: Date) {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseSessions(value: string | null): MeditationSession[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is MeditationSession => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const candidate = item as MeditationSession;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.date === "string" &&
        typeof candidate.weekday === "string" &&
        (candidate.mode === "countdown" || candidate.mode === "countup") &&
        typeof candidate.plannedSeconds === "number" &&
        typeof candidate.actualSeconds === "number" &&
        typeof candidate.startedAt === "string" &&
        typeof candidate.endedAt === "string" &&
        Array.isArray(candidate.distractions)
      );
    });
  } catch {
    return [];
  }
}

function loadSessions() {
  if (typeof window === "undefined") {
    return [];
  }
  return parseSessions(window.localStorage.getItem(STORAGE_KEY));
}

function persistSessions(sessions: MeditationSession[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getWeekDates(anchor: Date) {
  const day = anchor.getDay();
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(anchor.getDate() - day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getSessionsForDate(sessions: MeditationSession[], dateKey: string) {
  return sessions
    .filter((session) => session.date === dateKey)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

function getDaySummary(sessions: MeditationSession[]) {
  return sessions.reduce(
    (summary, session) => {
      summary.totalSeconds += session.actualSeconds;
      summary.distractions += session.distractions.length;
      summary.count += 1;
      return summary;
    },
    { totalSeconds: 0, distractions: 0, count: 0 },
  );
}

function CircuitProgress({
  progress,
  phase,
  hint,
  rippleKey,
  onClick,
}: {
  progress: number;
  phase: TimerPhase;
  hint: string;
  rippleKey: number;
  onClick: () => void;
}) {
  const normalizedProgress = clamp01(progress);

  return (
    <button
      className={`circuit-timer ${phase === "running" ? "is-running" : ""}`}
      type="button"
      onClick={onClick}
      aria-label="瞑想中に雑念が出たらクリック"
    >
      <svg className="circuit-progress" viewBox="0 0 1000 1000" aria-hidden="true">
        <defs>
          <clipPath id="circuit-clip">
            <circle cx="500" cy="500" r="398" />
          </clipPath>
        </defs>
        <circle className="circuit-field" cx="500" cy="500" r="398" />
        <circle className="circuit-inner-ring" cx="500" cy="500" r="326" />
        <g className="circuit-traces" clipPath="url(#circuit-clip)">
          {CIRCUIT_TRACES.map((trace, index) => {
            const localProgress = clamp01(
              (normalizedProgress - trace.startProgress) /
                (trace.endProgress - trace.startProgress),
            );
            const nodeOpacity = clamp01((localProgress - 0.86) / 0.14);

            return (
              <g key={`${trace.path}-${index}`}>
                <path
                  className="circuit-line"
                  d={trace.path}
                  pathLength={1}
                  style={{
                    opacity: localProgress > 0 ? 1 : 0,
                    strokeDasharray: 1,
                    strokeDashoffset: 1 - localProgress,
                    strokeWidth: trace.strokeWidth ?? 8,
                  }}
                />
                {trace.node ? (
                  trace.node.shape === "square" ? (
                    <rect
                      className="circuit-node circuit-node-square"
                      height="18"
                      style={{ opacity: nodeOpacity }}
                      width="18"
                      x={trace.node.x - 9}
                      y={trace.node.y - 9}
                    />
                  ) : (
                    <circle
                      className="circuit-node"
                      cx={trace.node.x}
                      cy={trace.node.y}
                      r="9"
                      style={{ opacity: nodeOpacity }}
                    />
                  )
                ) : null}
              </g>
            );
          })}
        </g>
        <circle className="circuit-rim" cx="500" cy="500" r="398" />
        <rect className="circuit-core" height="60" width="60" x="470" y="470" />
      </svg>
      {rippleKey > 0 ? <span className="ripple" key={rippleKey} /> : null}
      <span className="circuit-action-hint">{hint}</span>
    </button>
  );
}

function App() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>("timer");
  const [mode, setMode] = useState<TimerMode>("countdown");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [directMinutes, setDirectMinutes] = useState("10");
  const [durationSeconds, setDurationSeconds] = useState(10 * 60);
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [distractions, setDistractions] = useState<Distraction[]>([]);
  const [rippleKey, setRippleKey] = useState(0);
  const [sessions, setSessions] = useState<MeditationSession[]>(loadSessions);
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(today));
  const finishedRef = useRef(false);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);

  const weekDates = useMemo(
    () => getWeekDates(view === "timer" ? today : selectedDate),
    [selectedDate, today, view],
  );

  const selectedSessions = useMemo(
    () => getSessionsForDate(sessions, selectedDateKey),
    [selectedDateKey, sessions],
  );
  const selectedSummary = useMemo(() => getDaySummary(selectedSessions), [selectedSessions]);

  const effectiveElapsed = Math.min(elapsedSeconds, durationSeconds);
  const displaySeconds =
    mode === "countdown" ? Math.max(0, durationSeconds - effectiveElapsed) : effectiveElapsed;
  const progress = durationSeconds > 0 ? effectiveElapsed / durationSeconds : 0;
  const latestDistraction = distractions.at(-1);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (hours === 0 && minutes === 0) {
      setMinutes(1);
      return;
    }

    const nextSeconds = clampDuration(hours * 3600 + minutes * 60);
    setDurationSeconds(nextSeconds);
    setDirectMinutes(String(Math.floor(nextSeconds / 60)));
  }, [hours, minutes]);

  const resetTimerState = useCallback(() => {
    setPhase("idle");
    setElapsedSeconds(0);
    setStartedAtMs(null);
    setSessionStartedAt(null);
    setDistractions([]);
    finishedRef.current = false;
  }, []);

  const saveSession = useCallback(
    (actualSeconds: number, finalDistractions: Distraction[], startedAtIso: string) => {
      const endedAt = new Date();
      const started = new Date(startedAtIso);
      const nextSession: MeditationSession = {
        id: createId(),
        date: toDateKey(started),
        weekday: WEEKDAYS_LONG[started.getDay()],
        mode,
        plannedSeconds: durationSeconds,
        actualSeconds: Math.max(1, Math.min(MAX_SECONDS, actualSeconds)),
        startedAt: startedAtIso,
        endedAt: endedAt.toISOString(),
        distractions: finalDistractions,
      };

      setSessions((current) => [nextSession, ...current]);
      setSelectedDateKey(nextSession.date);
    },
    [durationSeconds, mode],
  );

  const finishSession = useCallback(() => {
    if (finishedRef.current || !sessionStartedAt) {
      return;
    }
    finishedRef.current = true;
    const actualSeconds = Math.max(1, Math.min(durationSeconds, elapsedSeconds));
    saveSession(actualSeconds, distractions, sessionStartedAt);
    resetTimerState();
    setView("history");
  }, [distractions, durationSeconds, elapsedSeconds, resetTimerState, saveSession, sessionStartedAt]);

  useEffect(() => {
    if (phase !== "running" || startedAtMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      setElapsedSeconds(Math.min(nextElapsed, durationSeconds));
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds, phase, startedAtMs]);

  useEffect(() => {
    if (phase === "running" && elapsedSeconds >= durationSeconds) {
      finishSession();
    }
  }, [durationSeconds, elapsedSeconds, finishSession, phase]);

  function applyDirectMinutes(value: string) {
    setDirectMinutes(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const nextSeconds = clampDuration(parsed * 60);
    setDurationSeconds(nextSeconds);
    setHours(Math.floor(nextSeconds / 3600));
    setMinutes(Math.floor((nextSeconds % 3600) / 60));
  }

  function startTimer() {
    const now = Date.now();
    finishedRef.current = false;
    setSessionStartedAt(new Date(now).toISOString());
    setStartedAtMs(now - elapsedSeconds * 1000);
    setPhase("running");
  }

  function pauseTimer() {
    setPhase("paused");
    setStartedAtMs(null);
  }

  function recordDistraction() {
    if (phase !== "running") {
      return;
    }
    setDistractions((current) => [...current, { atSecond: effectiveElapsed }]);
    setRippleKey((current) => current + 1);
  }

  function changeMode(nextMode: TimerMode) {
    if (phase !== "idle") {
      return;
    }
    setMode(nextMode);
  }

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="Mindnoise">
        <header className="app-header">
          <div>
            <p className="date-label">{formatHeaderDate(today)}</p>
            <h1>Mindnoise</h1>
            <p className="subhead">雑念を記録する瞑想タイマー</p>
          </div>
          <button className="icon-button" type="button" aria-label="設定">
            <span aria-hidden="true">○</span>
          </button>
        </header>

        <nav className="week-card" aria-label="週間カレンダー">
          {weekDates.map((date) => {
            const dateKey = toDateKey(date);
            const daySessions = getSessionsForDate(sessions, dateKey);
            const daySummary = getDaySummary(daySessions);
            const isToday = dateKey === toDateKey(today);
            const isSelected = dateKey === selectedDateKey;

            return (
              <button
                className={`day-pill ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                key={dateKey}
                type="button"
                onClick={() => {
                  setSelectedDateKey(dateKey);
                  setView("history");
                }}
              >
                <span>{WEEKDAYS_SHORT[date.getDay()]}</span>
                <strong>{date.getDate()}</strong>
                <i style={{ transform: `scaleX(${Math.min(1, daySummary.totalSeconds / 3600)})` }} />
              </button>
            );
          })}
        </nav>

        <div className="view-tabs" role="tablist" aria-label="表示切替">
          <button
            className={view === "timer" ? "active" : ""}
            type="button"
            onClick={() => setView("timer")}
          >
            タイマー
          </button>
          <button
            className={view === "history" ? "active" : ""}
            type="button"
            onClick={() => setView("history")}
          >
            記録
          </button>
        </div>

        {view === "timer" ? (
          <section className="timer-view" aria-label="瞑想タイマー">
            <div className="time-readout" aria-live="polite">
              <span>{mode === "countdown" ? "残り時間" : "経過時間"}</span>
              <strong>{formatTime(displaySeconds)}</strong>
              <small>{phase === "running" ? "進行中" : phase === "paused" ? "一時停止中" : "待機中"}</small>
            </div>

            <CircuitProgress
              hint={phase === "running" ? "クリックで雑念を記録" : "静かに始めます"}
              onClick={recordDistraction}
              phase={phase}
              progress={progress}
              rippleKey={rippleKey}
            />

            <div className="noise-counter" aria-live="polite">
              <span>雑念</span>
              <strong>{distractions.length}</strong>
            </div>

            <div className="live-noise-log" aria-live="polite">
              {latestDistraction ? (
                <>
                  <span>直近</span>
                  <strong>{formatElapsedMarker(latestDistraction.atSecond)}</strong>
                </>
              ) : (
                <span>発生時刻はここに記録されます</span>
              )}
            </div>

            <section className="control-card" aria-label="タイマー設定">
              <div className="mode-switch">
                <button
                  className={mode === "countdown" ? "active" : ""}
                  type="button"
                  onClick={() => changeMode("countdown")}
                >
                  カウントダウン
                </button>
                <button
                  className={mode === "countup" ? "active" : ""}
                  type="button"
                  onClick={() => changeMode("countup")}
                >
                  カウントアップ
                </button>
              </div>

              <div className="duration-grid">
                <label htmlFor="duration-hours">
                  時間
                  <select
                    id="duration-hours"
                    disabled={phase !== "idle"}
                    value={hours}
                    onChange={(event) => {
                      const nextHours = Number(event.target.value);
                      setHours(nextHours);
                      if (nextHours === 24) {
                        setMinutes(0);
                      }
                    }}
                  >
                    {Array.from({ length: 25 }, (_, value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="duration-minutes">
                  分
                  <select
                    id="duration-minutes"
                    disabled={phase !== "idle"}
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))}
                  >
                    {Array.from({ length: 60 }, (_, value) => (
                      <option disabled={hours === 24 && value > 0} key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="direct-input" htmlFor="duration-direct">
                  数字で入力
                  <input
                    id="duration-direct"
                    disabled={phase !== "idle"}
                    inputMode="numeric"
                    min={1}
                    max={1440}
                    type="number"
                    value={directMinutes}
                    onChange={(event) => applyDirectMinutes(event.target.value)}
                  />
                  <span>分</span>
                </label>
              </div>

              <div className="session-meta">
                <span>設定時間</span>
                <strong>{formatDuration(durationSeconds)}</strong>
              </div>

              <div className="action-row">
                {phase === "idle" || phase === "paused" ? (
                  <button className="primary-action" type="button" onClick={startTimer}>
                    {phase === "paused" ? "再開" : "開始"}
                  </button>
                ) : (
                  <button className="secondary-action" type="button" onClick={pauseTimer}>
                    一時停止
                  </button>
                )}
                <button
                  className="secondary-action"
                  disabled={!sessionStartedAt}
                  type="button"
                  onClick={finishSession}
                >
                  保存して終了
                </button>
                <button className="ghost-action" type="button" onClick={resetTimerState}>
                  リセット
                </button>
              </div>
            </section>
          </section>
        ) : (
          <section className="history-view" aria-label="瞑想記録">
            <div className="summary-card">
              <div>
                <span>{selectedDateKey}</span>
                <h2>{WEEKDAYS_LONG[selectedDate.getDay()]}</h2>
              </div>
              <div className="summary-grid">
                <p>
                  <span>合計</span>
                  <strong>{formatDuration(selectedSummary.totalSeconds)}</strong>
                </p>
                <p>
                  <span>回数</span>
                  <strong>{selectedSummary.count}</strong>
                </p>
                <p>
                  <span>雑念</span>
                  <strong>{selectedSummary.distractions}</strong>
                </p>
              </div>
            </div>

            <div className="session-list">
              {selectedSessions.length === 0 ? (
                <div className="empty-state">
                  <h2>記録はまだありません</h2>
                  <p>瞑想を終えると、この日に静かに積み上がります。</p>
                </div>
              ) : (
                selectedSessions.map((session) => (
                  <article className="session-card" key={session.id}>
                    <div>
                      <span>{formatClock(session.startedAt)} - {formatClock(session.endedAt)}</span>
                      <h2>{formatDuration(session.actualSeconds)}</h2>
                    </div>
                    <dl>
                      <div>
                        <dt>モード</dt>
                        <dd>{session.mode === "countdown" ? "カウントダウン" : "カウントアップ"}</dd>
                      </div>
                      <div>
                        <dt>設定</dt>
                        <dd>{formatDuration(session.plannedSeconds)}</dd>
                      </div>
                      <div>
                        <dt>雑念</dt>
                        <dd>{session.distractions.length}回</dd>
                      </div>
                    </dl>
                    {session.distractions.length > 0 ? (
                      <div className="noise-log">
                        <span>雑念の発生時刻</span>
                        <ul>
                          {session.distractions.map((distraction, index) => (
                            <li key={`${session.id}-${index}-${distraction.atSecond}`}>
                              <strong>{index + 1}回目</strong>
                              <time>{formatElapsedMarker(distraction.atSecond)}</time>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
