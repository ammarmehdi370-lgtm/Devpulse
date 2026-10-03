"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApp, type ActivityEvent } from "../context/AppContext";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  GitFork,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Timer,
  X,
  Zap,
} from "lucide-react";

type ActivityRange = "today" | "7d" | "30d";
type ActivityFilter = "all" | "Focus" | "Code" | "Project" | "Workspace" | "Release" | "System";

interface ActivityRow extends ActivityEvent {
  source: "event" | "log";
}

interface TimerState {
  elapsedSeconds: number;
  startedAt: string | null;
}

const TIMER_STORAGE_KEY = "devpulse_activity_timer";
const PAGE_SIZE = 6;
const FILTERS: ActivityFilter[] = [
  "all",
  "Focus",
  "Code",
  "Project",
  "Workspace",
  "Release",
  "System",
];

function readTimerState(): TimerState {
  if (typeof window === "undefined") return { elapsedSeconds: 0, startedAt: null };
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(TIMER_STORAGE_KEY) || "null",
    ) as Partial<TimerState> | null;
    if (
      saved &&
      typeof saved.elapsedSeconds === "number" &&
      (typeof saved.startedAt === "string" || saved.startedAt === null)
    ) {
      return { elapsedSeconds: saved.elapsedSeconds, startedAt: saved.startedAt };
    }
  } catch (error) {
    console.error("Unable to read the activity timer.", error);
  }
  return { elapsedSeconds: 0, startedAt: null };
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function relativeTime(timestamp: string, now: number) {
  const elapsed = Math.max(0, now - new Date(timestamp).getTime());
  if (!Number.isFinite(elapsed)) return "Time unavailable";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function logTimestamp(time: string, now: Date) {
  const match = time.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
  const date = new Date(now);
  if (match) date.setHours(Number(match[1]), Number(match[2]), Number(match[3]), 0);
  return date.toISOString();
}

function eventIcon(category: string) {
  if (category === "Release") return Rocket;
  if (category === "Workspace") return Box;
  if (category === "Project") return GitFork;
  if (category === "Code") return Code2;
  if (category === "Focus") return Timer;
  return Activity;
}

function eventColor(category: string) {
  if (category === "Release") return "text-[#ffad5c] bg-[#ffad5c]/10 border-[#ffad5c]/20";
  if (category === "Workspace") return "text-[#41d9ee] bg-[#41d9ee]/10 border-[#41d9ee]/20";
  if (category === "Project") return "text-[#ae7cff] bg-[#ae7cff]/10 border-[#ae7cff]/20";
  if (category === "Code") return "text-[#43ddbb] bg-[#43ddbb]/10 border-[#43ddbb]/20";
  if (category === "Focus") return "text-[#d389ff] bg-[#d389ff]/10 border-[#d389ff]/20";
  return "text-[#9ba0b6] bg-white/5 border-white/10";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function ActivityPage() {
  const {
    user,
    repositories,
    workspaces,
    deployments,
    activityEvents,
    addActivityEvent,
    logs,
    isDataLoading,
    setPage,
    addToast,
  } = useApp();
  const [timerState, setTimerState] = useState<TimerState>(readTimerState);
  const [now, setNow] = useState(() => Date.now());
  const [pageOpenedAt] = useState(() => new Date());
  const [range, setRange] = useState<ActivityRange>("7d");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityRow | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    } catch (error) {
      console.error("Unable to save the activity timer.", error);
    }
  }, [timerState]);

  const rows = useMemo<ActivityRow[]>(() => {
    const activityRows: ActivityRow[] = activityEvents.map((event) => ({
      ...event,
      source: "event",
    }));
    logs.forEach((log) => {
      const category =
        log.tag.includes("PIPELINE") || log.tag.includes("SUCCESS")
          ? "Release"
          : log.tag.includes("GIT") || log.tag.includes("BUILD")
            ? "Code"
            : "System";
      activityRows.push({
        id: `log-${log.id}`,
        timestamp: log.timestamp || logTimestamp(log.time, pageOpenedAt),
        category,
        title: log.tag.replace(/[\[\]]/g, "").toLowerCase(),
        detail: log.text,
        project: repositories[0]?.name || "Devpulse",
        actor: user.handle,
        source: "log",
      });
    });
    return activityRows.sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
  }, [activityEvents, logs, pageOpenedAt, repositories, user.handle]);

  const projects = useMemo(
    () =>
      Array.from(
        new Set([
          ...repositories.map((repository) => repository.name),
          ...workspaces.map((workspace) => workspace.repo),
          ...activityEvents.map((event) => event.project).filter(Boolean),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [activityEvents, repositories, workspaces],
  );

  const rangeStart = useMemo(() => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    if (range === "7d") date.setDate(date.getDate() - 6);
    if (range === "30d") date.setDate(date.getDate() - 29);
    return date;
  }, [now, range]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const eventDate = new Date(row.timestamp);
      return (
        eventDate >= rangeStart &&
        (filter === "all" || row.category === filter) &&
        (projectFilter === "all" || row.project === projectFilter) &&
        (!search ||
          `${row.title} ${row.detail} ${row.project} ${row.actor}`
            .toLowerCase()
            .includes(search))
      );
    });
  }, [filter, projectFilter, query, rangeStart, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = showAll
    ? filteredRows
    : filteredRows.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
  const timerSeconds =
    timerState.elapsedSeconds +
    (timerState.startedAt
      ? Math.floor((now - new Date(timerState.startedAt).getTime()) / 1000)
      : 0);
  const focusSecondsToday = activityEvents.reduce((total, event) => {
    if (
      event.category === "Focus" &&
      dateKey(new Date(event.timestamp)) === dateKey(new Date(now))
    ) {
      return total + (event.durationSeconds || 0);
    }
    return total;
  }, 0);
  const focusSeconds =
    focusSecondsToday +
    (timerState.startedAt &&
    dateKey(new Date(timerState.startedAt)) === dateKey(new Date(now))
      ? timerSeconds
      : 0);
  const todayRows = rows.filter(
    (row) => dateKey(new Date(row.timestamp)) === dateKey(new Date(now)),
  );
  const releasesToday = todayRows.filter(
    (row) => row.category === "Release",
  ).length;
  const dayCount = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const chartDays = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, index) => {
        const date = new Date(rangeStart);
        date.setDate(date.getDate() + index);
        const matchingEvents = filteredRows.filter(
          (row) => dateKey(new Date(row.timestamp)) === dateKey(date),
        );
        const categories = ["Code", "Project", "Workspace", "Release", "Focus", "System"];
        return {
          date,
          label: new Intl.DateTimeFormat(undefined, {
            weekday: dayCount === 1 ? undefined : "short",
            day: dayCount > 7 ? "numeric" : undefined,
          }).format(date),
          total: matchingEvents.length,
          stacks: categories.map((category) => ({
            category,
            count: matchingEvents.filter((event) => event.category === category)
              .length,
          })),
        };
      }),
    [dayCount, filteredRows, rangeStart],
  );
  const maxActivity = Math.max(1, ...chartDays.map((day) => day.total));
  const categoryCounts = FILTERS.slice(1).map((category) => ({
    category,
    count: filteredRows.filter((row) => row.category === category).length,
  }));
  const busiestDay = chartDays.reduce(
    (busiest, day) => (day.total > busiest.total ? day : busiest),
    chartDays[0] || { total: 0, label: "No activity", date: new Date(), stacks: [] },
  );
  const averagePerDay = Math.round(filteredRows.length / Math.max(1, dayCount));
  const currentPageRows = visibleRows;

  const startTimer = () => {
    setTimerState((state) => ({ ...state, startedAt: new Date().toISOString() }));
    addActivityEvent({
      category: "Focus",
      title: "Focus session started",
      detail: "Started a new focus session.",
      project: repositories[0]?.name || "Devpulse",
    });
  };

  const pauseTimer = () => {
    const elapsed = timerState.startedAt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(timerState.startedAt).getTime()) / 1000),
        )
      : 0;
    setTimerState((state) => ({
      elapsedSeconds: state.elapsedSeconds + elapsed,
      startedAt: null,
    }));
  };

  const finishTimer = () => {
    const duration =
      timerState.elapsedSeconds +
      (timerState.startedAt
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(timerState.startedAt).getTime()) / 1000),
          )
        : 0);
    if (duration > 0) {
      addActivityEvent({
        category: "Focus",
        title: "Focus session completed",
        detail: `Tracked ${formatDuration(duration)} of focused work.`,
        project: repositories[0]?.name || "Devpulse",
        durationSeconds: duration,
      });
    }
    setTimerState({ elapsedSeconds: 0, startedAt: null });
    addToast({
      type: "success",
      title: "Focus session saved",
      description: `Tracked ${formatDuration(duration)}.`,
    });
  };

  const exportActivity = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const content = [
      ["Time", "Category", "Activity", "Details", "Project", "Actor"],
      ...filteredRows.map((row) => [
        new Date(row.timestamp).toLocaleString(),
        row.category,
        row.title,
        row.detail,
        row.project,
        row.actor,
      ]),
    ]
      .map((line) => line.map(escapeCsv).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `devpulse-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast({
      type: "success",
      title: "Activity exported",
      description: `${filteredRows.length} filtered events saved as CSV.`,
    });
  };

  const setActivityFilter = (nextFilter: ActivityFilter) => {
    setFilter(nextFilter);
    setPageNumber(1);
    setShowAll(false);
  };

  const setActivityRange = (nextRange: ActivityRange) => {
    setRange(nextRange);
    setPageNumber(1);
    setShowAll(false);
  };

  return (
    <div className="min-h-full bg-[#08080d] px-3 py-4 text-[#f4f3fa] sm:px-5 sm:py-6 xl:px-8">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[#72728b]">
          <div className="flex items-center gap-2">
            <span className="text-[#9999b1]">Devpulse Platform</span>
            <span className="text-[#3d3d52]">/</span>
            <span className="text-[#bd91ff]">Your Activity</span>
          </div>
          <div className="flex items-center gap-2 normal-case tracking-normal">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#40e6c5]" />
            <span className="text-[#8e91a6]">
              {isDataLoading ? "Syncing platform data" : "Live activity"}
            </span>
            <span className="text-[#55556c]">
              Updated {new Date(now).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-[#33264d] bg-[radial-gradient(ellipse_at_10%_0%,rgba(123,60,204,0.22),transparent_42%),linear-gradient(115deg,#171320,#11111a_64%,#111821)] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.25)] sm:p-5">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#8046d9]/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#a568ff]/40 bg-[#211633] shadow-[0_0_28px_rgba(151,87,255,0.2)]">
                <Activity className="h-6 w-6 text-[#c18aff]" />
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#171320] bg-[#43e7bf]" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#9f62eb]/30 bg-[#8c50d7]/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#c68dff]">
                    Personal dashboard
                  </span>
                  <span className="text-[10px] text-[#77748b]">
                    {formatDate(new Date(now))}
                  </span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Your Activity
                </h1>
                <p className="mt-1 text-xs text-[#a4a0b1]">
                  Your work, sessions, and platform events — all in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-[176px] flex-1 items-center gap-3 rounded-xl border border-[#302a3c] bg-[#0c0b12]/80 px-3 py-2 xl:flex-none">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#a350e6]/15 text-[#ca88ff]">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#858096]">
                    Focus timer
                  </div>
                  <div className="font-mono text-lg font-bold tabular-nums tracking-wide text-white">
                    {formatDuration(timerSeconds)}
                  </div>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${timerState.startedAt ? "animate-pulse bg-[#48e2bd]" : "bg-[#696779]"}`}
                  title={timerState.startedAt ? "Timer running" : "Timer paused"}
                />
              </div>
              <button
                type="button"
                onClick={timerState.startedAt ? pauseTimer : startTimer}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#6e46a6]/60 bg-[#241634] px-3 text-xs font-semibold text-[#d7b2ff] transition hover:border-[#b879ff] hover:bg-[#34204d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd83ff]"
              >
                {timerState.startedAt ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {timerState.startedAt ? "Pause" : timerSeconds ? "Resume" : "Start"}
              </button>
              <button
                type="button"
                onClick={finishTimer}
                disabled={!timerSeconds}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#8a4ce0] px-3 text-xs font-semibold text-white shadow-[0_5px_18px_rgba(138,76,224,0.22)] transition hover:bg-[#9d62ef] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0a6ff]"
              >
                <Check className="h-3.5 w-3.5" />
                Finish
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            icon={Clock3}
            label="Focus time today"
            value={formatDuration(focusSeconds).slice(0, 5)}
            detail={timerState.startedAt ? "Timer is running" : "Tracked sessions"}
            color="purple"
          />
          <MetricCard
            icon={Zap}
            label="Events today"
            value={String(todayRows.length)}
            detail={`${averagePerDay} per day in selected range`}
            color="cyan"
          />
          <MetricCard
            icon={Rocket}
            label="Releases today"
            value={String(releasesToday)}
            detail={`${deployments.length} total releases`}
            color="teal"
          />
          <MetricCard
            icon={GitFork}
            label="Your projects"
            value={String(repositories.length)}
            detail={`${workspaces.filter((workspace) => workspace.status === "Running").length} active workspaces`}
            color="amber"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
          <section className="rounded-2xl border border-[#252334] bg-[#11111a] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#bd83ff]" />
                  <h2 className="text-sm font-semibold text-white">
                    Activity intensity
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-[#77778e]">
                  Recorded platform actions · {filteredRows.length} events
                </p>
              </div>
              <label className="relative">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9992ae]" />
                <select
                  aria-label="Activity chart date range"
                  value={range}
                  onChange={(event) =>
                    setActivityRange(event.target.value as ActivityRange)
                  }
                  className="h-8 appearance-none rounded-lg border border-[#302a3c] bg-[#191722] pl-8 pr-8 text-[10px] text-[#c8c3d4] outline-none focus:border-[#a66af0]"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#888398]" />
              </label>
            </div>
            <div className="flex h-44 items-end gap-1.5 border-b border-[#242331] px-1 pb-2 sm:gap-3">
              {chartDays.map((day) => (
                <div
                  key={dateKey(day.date)}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  title={`${day.label}: ${day.total} events`}
                >
                  <div className="flex h-[calc(100%-20px)] w-full max-w-9 items-end overflow-hidden rounded-t-[4px] bg-[#191823]">
                    <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-[4px]">
                      {day.stacks.map(({ category, count }) => (
                        <div
                          key={category}
                          className={`w-full transition-[height] duration-500 ${chartColor(category)}`}
                          style={{
                            height: `${count ? Math.max(4, (count / maxActivity) * 100) : 0}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="truncate text-[9px] text-[#7b798d]">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {categoryCounts.map(({ category }) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1.5 text-[9px] text-[#9290a2]"
                >
                  <span className={`h-1.5 w-1.5 rounded-sm ${chartColor(category)}`} />
                  {category}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#252334] bg-[#11111a] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#46ddc2]" />
                  <h2 className="text-sm font-semibold text-white">
                    Activity breakdown
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-[#77778e]">
                  By category · selected date range
                </p>
              </div>
              <span className="rounded-lg border border-[#293837] bg-[#12201f] px-2 py-1 font-mono text-[10px] text-[#62dfc7]">
                {filteredRows.length}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {categoryCounts.map(({ category, count }) => {
                const Icon = eventIcon(category);
                const percentage = filteredRows.length
                  ? Math.round((count / filteredRows.length) * 100)
                  : 0;
                return (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
                      <span className="flex min-w-0 items-center gap-2 text-[#c6c3d0]">
                        <Icon className="h-3 w-3 shrink-0 text-[#9387ad]" />
                        <span className="truncate">{category}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[#9793a4]">
                        {count} <span className="text-[#5e5c6c]">·</span> {percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#22212c]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${chartColor(category)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#242331] pt-4">
              <div className="rounded-xl bg-[#171620] p-3">
                <div className="text-[9px] uppercase tracking-wider text-[#77758a]">
                  Busiest day
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-white">
                  {busiestDay.total ? busiestDay.label : "No activity yet"}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8a879a]">
                  {busiestDay.total} recorded events
                </div>
              </div>
              <div className="rounded-xl bg-[#171620] p-3">
                <div className="text-[9px] uppercase tracking-wider text-[#77758a]">
                  Active projects
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-white">
                  {projects.length}
                </div>
                <div className="mt-0.5 text-[10px] text-[#8a879a]">
                  In your workspace
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#252334] bg-[#11111a]">
          <div className="flex flex-col gap-3 border-b border-[#242331] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#c087ff]" />
                <h2 className="text-sm font-semibold text-white">
                  Activity stream
                </h2>
                <span className="rounded-md border border-[#382d4b] bg-[#221a2e] px-1.5 py-0.5 font-mono text-[9px] text-[#c698ff]">
                  {filteredRows.length}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#77778e]">
                A live timeline of your work across Devpulse.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[145px] flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#79768a]" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPageNumber(1);
                  }}
                  placeholder="Search activity"
                  aria-label="Search activity"
                  className="h-8 w-full rounded-lg border border-[#302a3c] bg-[#171620] pl-8 pr-2 text-[10px] text-white outline-none placeholder:text-[#646274] focus:border-[#a66af0] sm:w-40"
                />
              </label>
              <label className="relative">
                <select
                  aria-label="Filter activity by category"
                  value={filter}
                  onChange={(event) =>
                    setActivityFilter(event.target.value as ActivityFilter)
                  }
                  className="h-8 appearance-none rounded-lg border border-[#302a3c] bg-[#171620] pl-2.5 pr-7 text-[10px] text-[#c8c3d4] outline-none focus:border-[#a66af0]"
                >
                  {FILTERS.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All activity" : option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#888398]" />
              </label>
              <label className="relative max-w-[145px]">
                <select
                  aria-label="Filter activity by project"
                  value={projectFilter}
                  onChange={(event) => {
                    setProjectFilter(event.target.value);
                    setPageNumber(1);
                  }}
                  className="h-8 max-w-full appearance-none rounded-lg border border-[#302a3c] bg-[#171620] pl-2.5 pr-7 text-[10px] text-[#c8c3d4] outline-none focus:border-[#a66af0]"
                >
                  <option value="all">All projects</option>
                  {projects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#888398]" />
              </label>
              <button
                type="button"
                onClick={exportActivity}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#302a3c] bg-[#171620] px-2.5 text-[10px] text-[#c7c2d3] transition hover:border-[#604581] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bd83ff]"
              >
                <ArrowDownToLine className="h-3 w-3" />
                Export
              </button>
            </div>
          </div>

          {currentPageRows.length ? (
            <div className="divide-y divide-[#242331]">
              {currentPageRows.map((row) => {
                const Icon = eventIcon(row.category);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedEvent(row)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#171620] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#b879ff] sm:px-5"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${eventColor(row.category)}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[11px] font-semibold capitalize text-[#eceaf2]">
                          {row.title}
                        </span>
                        <span className="rounded border border-[#332b40] bg-[#201a29] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[#ba8be9]">
                          {row.category}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-[#9692a4]">
                        {row.detail}
                      </span>
                    </span>
                    <span className="hidden max-w-[150px] shrink-0 truncate rounded-md border border-[#302c3a] bg-[#191821] px-2 py-1 text-[9px] text-[#aaa5b7] sm:block">
                      {row.project}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[9px] text-[#8b879a]">
                        {relativeTime(row.timestamp, now)}
                      </span>
                      <span className="mt-1 block text-[9px] text-[#625f70]">
                        {row.actor}
                      </span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#555166] transition group-hover:translate-x-0.5 group-hover:text-[#ba8be9]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#382d4b] bg-[#201a29] text-[#bb87f2]">
                <Activity className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-xs font-semibold text-white">
                No matching activity
              </h3>
              <p className="mt-1 max-w-sm text-[10px] leading-5 text-[#858194]">
                Try another date range or filter. Platform actions and focus sessions will appear here as they happen.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActivityFilter("all");
                  setProjectFilter("all");
                  setQuery("");
                  setActivityRange("30d");
                }}
                className="mt-3 rounded-lg border border-[#443458] px-3 py-1.5 text-[10px] font-medium text-[#d2b5f3] hover:bg-[#261c33]"
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[#242331] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="text-[9px] text-[#777487]">
              Showing{" "}
              <span className="font-mono text-[#c3bdcf]">
                {filteredRows.length
                  ? showAll
                    ? filteredRows.length
                    : Math.min((pageNumber - 1) * PAGE_SIZE + 1, filteredRows.length)
                  : 0}
                {filteredRows.length && !showAll
                  ? `–${Math.min(pageNumber * PAGE_SIZE, filteredRows.length)}`
                  : ""}
              </span>{" "}
              of <span className="font-mono text-[#c3bdcf]">{filteredRows.length}</span>{" "}
              events
            </span>
            <div className="flex items-center gap-2">
              {filteredRows.length > PAGE_SIZE && (
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  className="mr-1 text-[9px] text-[#b88ce9] hover:text-white"
                >
                  {showAll ? "Show pages" : "View all"}
                </button>
              )}
              <button
                type="button"
                aria-label="Previous activity page"
                disabled={showAll || pageNumber === 1}
                onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
                className="rounded-md border border-[#302c3a] px-2 py-1 text-[9px] text-[#a7a2b5] hover:bg-[#211d29] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-[9px] text-[#8e899d]">
                {showAll ? "All" : `${pageNumber} / ${pageCount}`}
              </span>
              <button
                type="button"
                aria-label="Next activity page"
                disabled={showAll || pageNumber >= pageCount}
                onClick={() =>
                  setPageNumber((value) => Math.min(pageCount, value + 1))
                }
                className="rounded-md border border-[#302c3a] px-2 py-1 text-[9px] text-[#a7a2b5] hover:bg-[#211d29] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[9px] text-[#626073]">
          <span>
            Activity data is stored in this browser and updates as you use Devpulse.
          </span>
          <button
            type="button"
            onClick={() => {
              setNow(Date.now());
              addToast({
                type: "info",
                title: "Activity refreshed",
                description: "Showing the latest platform activity.",
              });
            }}
            className="inline-flex items-center gap-1.5 transition hover:text-[#c2a0ea]"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEvent(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-detail-title"
            className="w-full max-w-md rounded-2xl border border-[#3b3150] bg-[#12111a] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${eventColor(selectedEvent.category)}`}
                >
                  {React.createElement(eventIcon(selectedEvent.category), {
                    className: "h-4 w-4",
                  })}
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-[#b78ae8]">
                    {selectedEvent.category}
                  </span>
                  <h2
                    id="activity-detail-title"
                    className="mt-1 text-sm font-semibold capitalize text-white"
                  >
                    {selectedEvent.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close activity details"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-[#898599] hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 break-words text-xs leading-6 text-[#b0acbb]">
              {selectedEvent.detail}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#292633] pt-4 text-[10px]">
              <div>
                <dt className="text-[#777487]">Project / target</dt>
                <dd className="mt-1 break-all text-[#e0dce8]">
                  {selectedEvent.project}
                </dd>
              </div>
              <div>
                <dt className="text-[#777487]">Actor</dt>
                <dd className="mt-1 text-[#e0dce8]">{selectedEvent.actor}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#777487]">Recorded</dt>
                <dd className="mt-1 text-[#e0dce8]">
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const destination =
                    selectedEvent.category === "Release"
                      ? "deployments"
                      : selectedEvent.category === "Workspace"
                        ? "workspaces"
                        : "repositories";
                  setSelectedEvent(null);
                  setPage(destination);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8a4ce0] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#9d62ef]"
              >
                Open {selectedEvent.category === "Release" ? "releases" : selectedEvent.category === "Workspace" ? "workspaces" : "projects"}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function chartColor(category: string) {
  if (category === "Code") return "bg-[#ae59ea]";
  if (category === "Project") return "bg-[#7637d4]";
  if (category === "Workspace") return "bg-[#20c9d9]";
  if (category === "Release") return "bg-[#ff9f43]";
  if (category === "Focus") return "bg-[#dc70df]";
  return "bg-[#4b78e7]";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  color: "purple" | "cyan" | "teal" | "amber";
}) {
  const styles = {
    purple: "border-[#553474] bg-[#1b1424] text-[#c184ff]",
    cyan: "border-[#245065] bg-[#111d27] text-[#5bd3ef]",
    teal: "border-[#245349] bg-[#10211f] text-[#55dfbd]",
    amber: "border-[#624a30] bg-[#211a14] text-[#ffb86e]",
  }[color];
  return (
    <section className="rounded-xl border border-[#252334] bg-[#11111a] p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#838095]">
            {label}
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums tracking-tight text-white sm:text-2xl">
            {value}
          </div>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${styles}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 truncate text-[9px] text-[#777487]">{detail}</div>
    </section>
  );
}
