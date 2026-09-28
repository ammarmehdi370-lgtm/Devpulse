"use client";

import React, { useMemo, useState } from "react";
import {
  useApp,
  type Repository,
  type WorkspaceDevbox,
} from "../context/AppContext";
import { Activity, ChevronDown, Plus, Search, Users, X } from "lucide-react";
import { FriendlyHint } from "./FriendlyHelpers";

type TimeRange = "last-week" | "current" | "last-month" | "last-3-months";
type BoardTab = "allocation" | "workload";

const RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "last-week", label: "Last Week" },
  { id: "current", label: "This Week" },
  { id: "last-month", label: "Last Month" },
  { id: "last-3-months", label: "Last 3 Months" },
];

const PALETTE = [
  "#8b7cff",
  "#0df5c4",
  "#ff9d78",
  "#ffc269",
  "#52bed1",
  "#e77bd0",
  "#7ee0a8",
  "#f472b6",
];
const GIVEN = [
  "Alex",
  "Sarah",
  "Marcus",
  "Priya",
  "Jordan",
  "Taylor",
  "Mina",
  "Chris",
  "Elena",
  "Noah",
];
const FAMILY = [
  "Rivera",
  "Chen",
  "Johnson",
  "Patel",
  "Lee",
  "Kim",
  "Okoro",
  "Walsh",
  "Nakamura",
  "Brooks",
];

type ExtraMember = {
  id: string;
  name: string;
  projectIds: string[];
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nameFromKey(key: string) {
  const hash = hashString(key);
  return `${GIVEN[hash % GIVEN.length]} ${FAMILY[(hash >> 5) % FAMILY.length]}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function weeksInRange(range: TimeRange) {
  if (range === "last-3-months") return 12;
  if (range === "last-month") return 4;
  return 1;
}

function rangeLabel(range: TimeRange) {
  return (
    RANGE_OPTIONS.find((option) => option.id === range)?.label ?? "This period"
  );
}

function categoryForWorkspace(workspace: WorkspaceDevbox) {
  const value =
    `${workspace.template} ${workspace.name} ${workspace.repo}`.toLowerCase();
  if (
    value.includes("mobile") ||
    value.includes("expo") ||
    value.includes("android") ||
    value.includes("ios")
  ) {
    return "Mobile Optimization Features";
  }
  if (
    value.includes("pytorch") ||
    value.includes("ai") ||
    value.includes("agent") ||
    value.includes("python")
  ) {
    return "Data Pipeline & Event Logging";
  }
  if (
    value.includes("fastapi") ||
    value.includes("go") ||
    value.includes("grpc") ||
    value.includes("rust") ||
    value.includes("api")
  ) {
    return "Backend API & Shared Service Changes";
  }
  if (workspace.status === "Stopped")
    return "Technical Debt & Infrastructure Refactoring";
  return "New Feature Development";
}

function categoryForRepo(repository: Repository) {
  const value =
    `${repository.language} ${repository.name} ${repository.description}`.toLowerCase();
  if (
    value.includes("mobile") ||
    value.includes("android") ||
    value.includes("ios") ||
    value.includes("flutter")
  ) {
    return "Mobile Optimization Features";
  }
  if (
    value.includes("python") ||
    value.includes("ai") ||
    value.includes("neural") ||
    value.includes("data")
  ) {
    return "Data Pipeline & Event Logging";
  }
  if (
    value.includes("go") ||
    value.includes("rust") ||
    value.includes("api") ||
    value.includes("mesh") ||
    value.includes("kernel")
  ) {
    return "Backend API & Shared Service Changes";
  }
  if (repository.deployStatus === "none")
    return "Technical Debt & Infrastructure Refactoring";
  return "New Feature Development";
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#262638] bg-[#141420] ${className}`}
    >
      {children}
    </section>
  );
}

export function CloudCoreDashboard() {
  const {
    user,
    repositories,
    workspaces,
    deployments,
    isDataLoading,
    addToast,
  } = useApp();
  const [boardTab, setBoardTab] = useState<BoardTab>("allocation");
  const [dashboardRange, setDashboardRange] =
    useState<TimeRange>("last-3-months");
  const [workingRange, setWorkingRange] = useState<TimeRange>("last-3-months");
  const [workingMenuOpen, setWorkingMenuOpen] = useState(false);
  const [repoFilter, setRepoFilter] = useState("all");
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [effortQuery, setEffortQuery] = useState("");
  const [showAllContributors, setShowAllContributors] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberProjects, setNewMemberProjects] = useState<string[]>([]);
  const [extraMembers, setExtraMembers] = useState<ExtraMember[]>([]);
  const [sessionEvents, setSessionEvents] = useState<
    { id: string; title: string; detail: string; color: string }[]
  >([]);

  const projects = useMemo(() => {
    const fromRepos = repositories.map((repository, index) => ({
      id: repository.id,
      name: repository.name,
      color: repository.languageColor || PALETTE[index % PALETTE.length]!,
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      category: categoryForRepo(repository),
    }));
    if (fromRepos.length > 0) return fromRepos;
    const uniqueRepos = [
      ...new Set(workspaces.map((workspace) => workspace.repo).filter(Boolean)),
    ];
    return uniqueRepos.map((name, index) => {
      const workspace = workspaces.find((item) => item.repo === name);
      return {
        id: `ws-project-${name}`,
        name,
        color: PALETTE[index % PALETTE.length]!,
        language: workspace?.template ?? "Workspace",
        stars: 8 + index * 3,
        forks: index + 1,
        category: workspace
          ? categoryForWorkspace(workspace)
          : "New Feature Development",
      };
    });
  }, [repositories, workspaces]);

  const visibleProjects = useMemo(
    () =>
      repoFilter === "all"
        ? projects
        : projects.filter((project) => project.id === repoFilter),
    [projects, repoFilter],
  );

  const team = useMemo(() => {
    const members: {
      id: string;
      name: string;
      color: string;
      projectIds: string[];
    }[] = [
      {
        id: "you",
        name: user.name || "You",
        color: PALETTE[0]!,
        projectIds: visibleProjects.map((project) => project.id),
      },
    ];
    visibleProjects.forEach((project, index) => {
      const generated = nameFromKey(project.id);
      if (
        members.some(
          (member) =>
            member.name.toLowerCase() === generated.toLowerCase() ||
            member.name.toLowerCase() === user.name.toLowerCase(),
        )
      ) {
        return;
      }
      const extraIds = visibleProjects
        .filter(
          (_, projectIndex) =>
            hashString(`${project.id}-${projectIndex}`) % 3 === 0,
        )
        .map((item) => item.id);
      members.push({
        id: `lead-${project.id}`,
        name: generated,
        color: PALETTE[(index + 1) % PALETTE.length]!,
        projectIds: [...new Set([project.id, ...extraIds])],
      });
    });
    deployments.forEach((deployment, index) => {
      const author = deployment.author.trim();
      if (author.length < 2) return;
      const name = author.includes(" ")
        ? author
        : nameFromKey(`author-${author}`);
      if (
        members.some(
          (member) => member.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return;
      const project =
        visibleProjects[index % Math.max(visibleProjects.length, 1)];
      members.push({
        id: `author-${deployment.id}`,
        name,
        color: PALETTE[(members.length + 2) % PALETTE.length]!,
        projectIds: project ? [project.id] : [],
      });
    });
    extraMembers.forEach((member, index) => {
      members.push({
        id: member.id,
        name: member.name,
        color: PALETTE[(index + 4) % PALETTE.length]!,
        projectIds: member.projectIds.filter((id) =>
          visibleProjects.some((project) => project.id === id),
        ),
      });
    });
    return members;
  }, [user.name, visibleProjects, deployments, extraMembers]);

  const buildHours = React.useCallback(
    (range: TimeRange) => {
      const weeks = weeksInRange(range);
      const projectHours = visibleProjects.map((project) => {
        const linked = workspaces.filter(
          (workspace) =>
            workspace.repo.toLowerCase() === project.name.toLowerCase() ||
            workspace.name.toLowerCase().includes(project.name.toLowerCase()),
        );
        const cpu = linked.reduce((sum, workspace) => sum + workspace.vCpu, 0);
        const runningBoost = linked.some(
          (workspace) => workspace.status === "Running",
        )
          ? 1.15
          : 0.82;
        const hours = Math.max(
          8 * weeks,
          Math.round(
            (28 + project.stars * 1.4 + project.forks * 2 + cpu * 6.5) *
              weeks *
              runningBoost,
          ),
        );
        return { ...project, hours };
      });
      const totalProjectHours = projectHours.reduce(
        (sum, project) => sum + project.hours,
        0,
      );
      const withShare = projectHours.map((project) => ({
        ...project,
        share: totalProjectHours
          ? Math.round((project.hours / totalProjectHours) * 100)
          : 0,
      }));
      const contributors = team.map((member) => {
        const slices = withShare
          .filter(
            (project) =>
              member.projectIds.includes(project.id) ||
              member.projectIds.length === 0,
          )
          .map((project) => {
            const weight =
              (hashString(`${member.id}-${project.id}-${range}`) % 7) + 3;
            const peerCount = Math.max(
              1,
              team.filter(
                (peer) =>
                  peer.projectIds.includes(project.id) ||
                  peer.projectIds.length === 0,
              ).length,
            );
            const hours = Math.max(
              2,
              Math.round((project.hours * weight) / (peerCount * 6)),
            );
            return {
              projectId: project.id,
              name: project.name,
              color: project.color,
              hours,
            };
          });
        const hours = slices.reduce((sum, slice) => sum + slice.hours, 0);
        const capacity = Math.max(1, 36 * weeks);
        const workingPercent = Math.min(
          98,
          Math.max(42, Math.round((hours / capacity) * 100)),
        );
        return {
          ...member,
          slices,
          hours,
          workingPercent,
          projectCount: slices.length,
        };
      });
      const totalHours = contributors.reduce(
        (sum, member) => sum + member.hours,
        0,
      );
      const capacity = Math.max(1, team.length * 36 * weeks);
      const saturation = Math.min(
        100,
        Math.round((totalHours / capacity) * 100),
      );
      const slack = Math.max(0, 100 - saturation);
      const categories = new Map<string, { hours: number; color: string }>();
      withShare.forEach((project, index) => {
        const current = categories.get(project.category) ?? {
          hours: 0,
          color: PALETTE[index % PALETTE.length]!,
        };
        current.hours += project.hours;
        categories.set(project.category, current);
      });
      workspaces.forEach((workspace) => {
        const category = categoryForWorkspace(workspace);
        const current = categories.get(category) ?? {
          hours: 0,
          color: PALETTE[categories.size % PALETTE.length]!,
        };
        current.hours += workspace.vCpu * weeks;
        categories.set(category, current);
      });
      const categoryTotal = [...categories.values()].reduce(
        (sum, item) => sum + item.hours,
        0,
      );
      const activity = [...categories.entries()]
        .map(([label, item]) => ({
          label,
          hours: item.hours,
          color: item.color,
          share: categoryTotal
            ? Math.round((item.hours / categoryTotal) * 100)
            : 0,
        }))
        .sort((a, b) => b.hours - a.hours);
      return {
        projects: withShare,
        contributors,
        totalHours,
        capacity,
        saturation,
        slack,
        activity,
      };
    },
    [visibleProjects, team, workspaces],
  );

  const dashboard = useMemo(
    () => buildHours(dashboardRange),
    [buildHours, dashboardRange],
  );
  const comparison = useMemo(
    () =>
      buildHours(
        dashboardRange === "last-3-months" ? "last-week" : "last-3-months",
      ),
    [buildHours, dashboardRange],
  );
  const workingBoard = useMemo(
    () => buildHours(workingRange),
    [buildHours, workingRange],
  );

  const effortProjects = dashboard.projects.filter((project) =>
    project.name.toLowerCase().includes(effortQuery.trim().toLowerCase()),
  );
  const effortHours = effortProjects.reduce(
    (sum, project) => sum + project.hours,
    0,
  );
  const donutStops = effortProjects.reduce(
    (gradient, project) => {
      const start = effortHours ? (gradient.used / effortHours) * 100 : 0;
      const end = effortHours
        ? ((gradient.used + project.hours) / effortHours) * 100
        : 0;
      gradient.stops.push(`${project.color} ${start}% ${end}%`);
      gradient.used += project.hours;
      return gradient;
    },
    { used: 0, stops: [] as string[] },
  );
  const hourDelta = comparison.totalHours
    ? Math.round(
        ((dashboard.totalHours - comparison.totalHours) /
          comparison.totalHours) *
          1000,
      ) / 10
    : 0;
  const slackProject = [...dashboard.projects].sort(
    (a, b) => a.hours - b.hours,
  )[0];
  const shownContributors = showAllContributors
    ? workingBoard.contributors
    : workingBoard.contributors.slice(0, 6);
  const sprintNumber = 30 + (Math.floor(Date.now() / 86400000) % 20);
  const previousLabel =
    dashboardRange === "last-3-months" ? "Last Week" : "Last 3 Months";

  const events = [
    ...sessionEvents,
    dashboard.projects[0]
      ? {
          id: "overload",
          title: `${dashboard.projects[0].name} is taking the most time`,
          detail: `${dashboard.projects[0].share}% of team hours in ${rangeLabel(dashboardRange).toLowerCase()}. Spread work if this project is slipping.`,
          color: "#ff9d78",
        }
      : null,
    {
      id: "slack",
      title: `${dashboard.slack}% capacity is still free`,
      detail: slackProject
        ? `${slackProject.name} has the lightest load. You can add people here without overloading the sprint.`
        : "Add a project to start tracking leftover capacity.",
      color: "#0df5c4",
    },
    workspaces.find((workspace) => workspace.status === "Running")
      ? {
          id: "rebalance",
          title: `${workspaces.find((workspace) => workspace.status === "Running")?.name} is live`,
          detail:
            "Hours follow running workspaces and starred projects, so this mix updates when you start, stop, or add work.",
          color: "#8b7cff",
        }
      : {
          id: "empty",
          title: "No running workspace yet",
          detail:
            "Spin up a workspace to give this board live hours instead of only repository estimates.",
          color: "#ffc269",
        },
  ]
    .filter(Boolean)
    .slice(0, 3) as {
    id: string;
    title: string;
    detail: string;
    color: string;
  }[];

  const allocateMember = () => {
    const name = newMemberName.trim();
    if (name.length < 2) {
      addToast({
        type: "warning",
        title: "Add a name",
        description: "Type the teammate you want to allocate.",
      });
      return;
    }
    const projectIds = newMemberProjects.length
      ? newMemberProjects
      : visibleProjects.map((project) => project.id);
    setExtraMembers((current) => [
      ...current,
      { id: `extra-${Date.now()}`, name, projectIds },
    ]);
    setSessionEvents((current) => [
      {
        id: `alloc-${Date.now()}`,
        title: `${name} was allocated`,
        detail: `Now contributing across ${projectIds.length} project${projectIds.length === 1 ? "" : "s"}.`,
        color: "#8b7cff",
      },
      ...current,
    ]);
    addToast({
      type: "success",
      title: "Contributor added",
      description: `${name} now appears in the allocation mix.`,
    });
    setAllocateOpen(false);
    setNewMemberName("");
    setNewMemberProjects([]);
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#09090f] px-4 py-4 text-[#ededf5] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <FriendlyHint
          title="This board is live"
          body="Hours, saturation, and working % are calculated from your projects, workspaces, and the people on this team. Change the time range or add a contributor to see the mix update."
        />

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              Team Project Allocation
              <span className="ml-2 font-normal text-[#7b7788]">
                // Workload &amp; Bandwidth Health
              </span>
            </h1>
            <div className="mt-3 flex flex-wrap gap-1">
              {[
                { id: "allocation", label: "Project Allocation" },
                { id: "workload", label: "Workload & Bandwidth" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBoardTab(tab.id as BoardTab)}
                  className={`relative px-3 py-2 text-[13px] ${
                    boardTab === tab.id
                      ? "text-white"
                      : "text-[#8a8696] hover:text-[#d8d4e0]"
                  }`}
                >
                  {tab.label}
                  {boardTab === tab.id && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#0df5c4]" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[#2a2834] bg-[#12121a] p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDashboardRange(option.id)}
                  className={`rounded-md px-3 py-1.5 text-[12px] ${
                    dashboardRange === option.id
                      ? "bg-[#1d1c28] text-white shadow-sm"
                      : "text-[#8a8696] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setRepoMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-[#2a2834] bg-[#12121a] px-3 py-2 text-[12px] text-[#d8d4e0]"
              >
                Repository:{" "}
                {repoFilter === "all"
                  ? "All"
                  : projects.find((project) => project.id === repoFilter)?.name}
                <ChevronDown className="h-3.5 w-3.5 text-[#7b7788]" />
              </button>
              {repoMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-[#2a2834] bg-[#161622] py-1 shadow-2xl">
                  <button
                    className="block w-full px-3 py-2 text-left text-[12px] hover:bg-white/5"
                    onClick={() => {
                      setRepoFilter("all");
                      setRepoMenuOpen(false);
                    }}
                  >
                    All repositories
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      className="block w-full px-3 py-2 text-left text-[12px] hover:bg-white/5"
                      onClick={() => {
                        setRepoFilter(project.id);
                        setRepoMenuOpen(false);
                      }}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setAllocateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#7c6cf5] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#8b7cff]"
            >
              <Plus className="h-3.5 w-3.5" />
              Allocate Contributor
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.12em] text-[#9a96a6]">
              TOTAL EFFORT ALLOCATED
              <Activity className="h-4 w-4 text-[#8b7cff]" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <strong className="text-[32px] font-semibold leading-none text-white">
                {isDataLoading ? "—" : dashboard.totalHours.toLocaleString()}
              </strong>
              <span className="pb-1 text-[12px] text-[#8a8696]">hrs</span>
            </div>
            <p className="mt-2 text-[12px] text-[#9a96a6]">
              vs {comparison.totalHours.toLocaleString()}{" "}
              {previousLabel.toLowerCase()}
              <span
                className={`ml-2 ${hourDelta >= 0 ? "text-[#0df5c4]" : "text-[#ff8991]"}`}
              >
                {hourDelta >= 0 ? "+" : ""}
                {hourDelta}%
              </span>
            </p>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.12em] text-[#9a96a6]">
              ACTIVE CONTRIBUTORS
              <Users className="h-4 w-4 text-[#0df5c4]" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <strong className="text-[32px] font-semibold leading-none text-white">
                {team.length}
              </strong>
              <span className="pb-1 text-[12px] text-[#8a8696]">Core Devs</span>
            </div>
            <div className="mt-3 flex -space-x-2">
              {team.slice(0, 6).map((member) => (
                <span
                  key={member.id}
                  title={member.name}
                  className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#141420] text-[10px] font-bold text-[#0b0b12]"
                  style={{ backgroundColor: member.color }}
                >
                  {initials(member.name)}
                </span>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.12em] text-[#9a96a6]">
              TEAM SATURATION %<span className="text-[#ffc269]">●</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke="#262638"
                  strokeWidth="7"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke="#ffc269"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(dashboard.saturation / 100) * 176} 176`}
                />
              </svg>
              <div>
                <strong className="text-[32px] font-semibold leading-none text-white">
                  {dashboard.saturation}%
                </strong>
                <p className="mt-1 text-[12px] text-[#9a96a6]">Capacity Used</p>
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.12em] text-[#9a96a6]">
              UNALLOCATED SLACK
              <span className="text-[#8b7cff]">●</span>
            </div>
            <div className="mt-3 truncate text-[22px] font-semibold text-white">
              {slackProject?.name ?? "No project yet"}
            </div>
            <p className="mt-2 text-[12px] text-[#9a96a6]">
              {dashboard.slack}% Remaining Slack
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#262638]">
              <div
                className="h-full rounded-full bg-[#8b7cff]"
                style={{ width: `${dashboard.slack}%` }}
              />
            </div>
          </Panel>
        </div>

        {boardTab === "allocation" ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Panel className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold">
                    Project Effort Share
                  </h2>
                  <p className="mt-1 text-[12px] text-[#8a8696]">
                    How team hours split across projects
                  </p>
                </div>
                <label className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7b7788]" />
                  <input
                    value={effortQuery}
                    onChange={(event) => setEffortQuery(event.target.value)}
                    placeholder="Search"
                    className="w-32 rounded-lg border border-[#2a2834] bg-[#101018] py-2 pl-8 pr-3 text-[12px] outline-none focus:border-[#8b7cff]"
                  />
                </label>
              </div>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div
                  className="relative grid h-44 w-44 shrink-0 place-items-center rounded-full"
                  style={{
                    background: donutStops.stops.length
                      ? `conic-gradient(${donutStops.stops.join(",")})`
                      : "#262638",
                  }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[#141420] text-center">
                    <div className="text-[28px] font-semibold">
                      {dashboard.totalHours ? "100%" : "0%"}
                    </div>
                    <div className="text-[10px] tracking-wide text-[#8a8696]">
                      ALLOCATED
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {effortProjects.length ? (
                    effortProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-[#d8d4e0]">
                          {project.name}
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: project.color }}
                        >
                          {project.share}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-[#8a8696]">
                      No projects match this search.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#262638] pt-3 text-[12px] text-[#8a8696]">
                <span>
                  {rangeLabel(dashboardRange)}{" "}
                  <b className="text-white">100%</b>
                </span>
                <span>
                  {previousLabel}{" "}
                  <b className="text-white">{comparison.saturation}%</b>
                </span>
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold">
                    Workstream Velocity &amp; Activity Mix
                  </h2>
                  <p className="mt-1 text-[12px] text-[#8a8696]">
                    Activity Category Distribution
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-semibold text-white">
                    {dashboard.totalHours.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#8a8696]">
                    Hours Capacity
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {dashboard.activity.length ? (
                  dashboard.activity.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-[#d8d4e0]">
                          {item.label}
                        </span>
                        <span
                          className="shrink-0 font-medium"
                          style={{ color: item.color }}
                        >
                          {item.share}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#262638]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.share}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-[#8a8696]">
                    Add a repository or workspace to see activity mix.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        ) : (
          <Panel className="p-5">
            <h2 className="text-[16px] font-semibold">
              Workload &amp; Bandwidth
            </h2>
            <p className="mt-1 text-[12px] text-[#8a8696]">
              Saturation is hours logged versus each person&apos;s available
              hours in {rangeLabel(dashboardRange).toLowerCase()}.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-[#8a8696]">
                  <tr>
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Hours</th>
                    <th className="pb-3 font-medium">Share</th>
                    <th className="pb-3 font-medium">People on it</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.projects.map((project) => (
                    <tr key={project.id} className="border-t border-[#262638]">
                      <td className="py-3">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </td>
                      <td className="py-3 font-mono">{project.hours} hrs</td>
                      <td className="py-3">{project.share}%</td>
                      <td className="py-3">
                        {
                          team.filter((member) =>
                            member.projectIds.includes(project.id),
                          ).length
                        }{" "}
                        contributors
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold">
                Project Contributors &amp; Individual Working Percentage
              </h2>
              <p className="mt-1 text-[12px] text-[#8a8696]">
                Colored bars show where each person spent time. Working % is
                hours vs available hours for the selected period.
              </p>
            </div>
            <label className="relative text-[12px]">
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-[#8a8696]">
                Working % period
              </span>
              <button
                onClick={() => setWorkingMenuOpen((open) => !open)}
                className="flex min-w-44 items-center justify-between gap-2 rounded-lg border border-[#2a2834] bg-[#101018] px-3 py-2 text-[#d8d4e0]"
              >
                {rangeLabel(workingRange)}
                <ChevronDown className="h-3.5 w-3.5 text-[#7b7788]" />
              </button>
              {workingMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-full rounded-xl border border-[#2a2834] bg-[#161622] py-1 shadow-2xl">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      className={`block w-full px-3 py-2 text-left hover:bg-white/5 ${
                        workingRange === option.id
                          ? "text-[#0df5c4]"
                          : "text-[#d8d4e0]"
                      }`}
                      onClick={() => {
                        setWorkingRange(option.id);
                        setWorkingMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>

          <div className="overflow-x-auto px-5 pb-2">
            <table className="w-full min-w-[760px] text-left">
              <thead className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a8696]">
                <tr>
                  <th className="py-2">Contributor</th>
                  <th className="py-2">Project Share Mix</th>
                  <th className="py-2 text-right">Working %</th>
                </tr>
              </thead>
              <tbody>
                {shownContributors.map((member) => {
                  const sliceTotal = member.slices.reduce(
                    (sum, slice) => sum + slice.hours,
                    0,
                  );
                  return (
                    <tr key={member.id} className="border-t border-[#262638]">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-9 w-9 place-items-center rounded-lg text-[11px] font-bold text-[#0b0b12]"
                            style={{ backgroundColor: member.color }}
                          >
                            {initials(member.name)}
                          </span>
                          <span>
                            <b className="block text-[14px] font-medium text-white">
                              {member.name}
                            </b>
                            <small className="text-[12px] text-[#8a8696]">
                              {member.projectCount} of{" "}
                              {workingBoard.projects.length} projects
                            </small>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex h-8 overflow-hidden rounded-lg bg-[#1b1a24]">
                          {member.slices.map((slice) => (
                            <div
                              key={slice.projectId}
                              title={`${slice.name}: ${slice.hours} hrs`}
                              className="flex min-w-0 items-center justify-center overflow-hidden px-2 text-[11px] font-medium text-[#0b0b12]"
                              style={{
                                width: `${sliceTotal ? (slice.hours / sliceTotal) * 100 : 0}%`,
                                backgroundColor: slice.color,
                              }}
                            >
                              <span className="truncate">{slice.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="text-[18px] font-semibold text-white">
                          {member.workingPercent}%
                        </div>
                        <div className="ml-auto mt-1 h-1 w-16 rounded-full bg-[#262638]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${member.workingPercent}%`,
                              backgroundColor: member.color,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!workingBoard.contributors.length && (
              <p className="py-8 text-center text-[13px] text-[#8a8696]">
                Add a project or allocate a contributor to see working
                percentage.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#262638] px-5 py-3 text-[12px] text-[#8a8696]">
            <span>
              Showing {shownContributors.length} of{" "}
              {workingBoard.contributors.length} Contributors
            </span>
            <div className="flex gap-4">
              {workingBoard.contributors.length > 6 && (
                <button
                  className="text-[#d8d4e0] hover:text-white"
                  onClick={() => setShowAllContributors((open) => !open)}
                >
                  {showAllContributors ? "Show fewer" : "View All Contributors"}
                </button>
              )}
              <button
                className="text-[#8b7cff] hover:text-[#c4bcff]"
                onClick={() => setBoardTab("workload")}
              >
                Manage Team Bandwidth
              </button>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <Activity className="h-4 w-4 text-[#8b7cff]" />
            Recent Allocation &amp; Capacity Events
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="border-l-2 pl-3"
                style={{ borderColor: event.color }}
              >
                <b
                  className="block text-[13px] font-semibold"
                  style={{ color: event.color }}
                >
                  {event.title}
                </b>
                <p className="mt-1 text-[12px] leading-relaxed text-[#9a96a6]">
                  {event.detail}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-4 pb-2 text-[12px] text-[#8a8696]">
          <span className="rounded-md bg-[#161622] px-2 py-1 font-mono text-[#0df5c4]">
            Sprint {sprintNumber}
          </span>
          <span>{dashboard.totalHours.toLocaleString()} hrs</span>
          <span>{dashboard.saturation}% Target</span>
        </div>
      </div>

      {allocateOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setAllocateOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#2a2834] bg-[#141420] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold">
                Allocate a contributor
              </h3>
              <button onClick={() => setAllocateOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-[#8a8696]" />
              </button>
            </div>
            <p className="mb-4 text-[12px] text-[#8a8696]">
              They will receive a live hour mix from the projects you pick.
              Working % updates with the period dropdown.
            </p>
            <label className="block text-[12px] text-[#d8d4e0]">
              Name
              <input
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="Jamie Cole"
                className="mt-1 w-full rounded-lg border border-[#2a2834] bg-[#101018] px-3 py-2 text-[13px] outline-none focus:border-[#8b7cff]"
              />
            </label>
            <div className="mt-4 text-[12px] text-[#d8d4e0]">Projects</div>
            <div className="mt-2 max-h-40 space-y-2 overflow-auto">
              {visibleProjects.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    checked={newMemberProjects.includes(project.id)}
                    onChange={(event) =>
                      setNewMemberProjects((current) =>
                        event.target.checked
                          ? [...current, project.id]
                          : current.filter((id) => id !== project.id),
                      )
                    }
                  />
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </label>
              ))}
            </div>
            <button
              onClick={allocateMember}
              className="mt-5 w-full rounded-lg bg-[#7c6cf5] py-2.5 text-[13px] font-semibold text-white hover:bg-[#8b7cff]"
            >
              Add to allocation board
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
