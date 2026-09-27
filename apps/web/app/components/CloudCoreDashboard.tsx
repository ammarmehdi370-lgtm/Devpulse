"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Activity,
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Cpu,
  Download,
  GitBranch,
  HardDrive,
  Layers,
  MoreHorizontal,
  Network,
  Play,
  Plus,
  Server,
  ShieldCheck,
  Square,
  Users,
  X,
} from "lucide-react";

const statCards = [
  { id: "workspaces", label: "PROJECT EFFORT ALLOCATED", icon: Server, color: "#0df5c4" },
  { id: "running", label: "ACTIVE WORKSPACES", icon: Users, color: "#0df5c4" },
  { id: "health", label: "WORKSPACE HEALTH", icon: ShieldCheck, color: "#ffc269" },
  { id: "capacity", label: "DOMINANT TEMPLATE", icon: Network, color: "#8b7cff" },
] as const;

const statusColor = (status: string) =>
  status === "Running" ? "#0df5c4" : status === "Building" ? "#ffc269" : "#797582";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#232338] bg-[#141420] ${className}`}>{children}</section>;
}

export function CloudCoreDashboard() {
  const {
    workspaces,
    isDataLoading,
    spinUpDevbox,
    toggleWorkspaceStatus,
    deleteWorkspace,
    setPage,
    setLoadedProjectName,
    setIsEditorProjectOpen,
    addToast,
  } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sortBy, setSortBy] = useState<"Name" | "CPU" | "Status">("Name");
  const [timeRange, setTimeRange] = useState("Current");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("All branches");
  const [events, setEvents] = useState<{ id: string; title: string; detail: string; time: string; color: string }[]>([]);

  const recordEvent = (title: string, detail: string, color: string) => {
    setEvents((current) => [
      { id: `${Date.now()}-${Math.random()}`, title, detail, time: new Date().toLocaleTimeString(), color },
      ...current,
    ].slice(0, 3));
  };

  const runningCount = workspaces.filter((workspace) => workspace.status === "Running").length;
  const buildingCount = workspaces.filter((workspace) => workspace.status === "Building").length;
  const stoppedCount = workspaces.filter((workspace) => workspace.status === "Stopped").length;
  const totalCpu = workspaces.reduce((sum, workspace) => sum + workspace.vCpu, 0);
  const totalRam = workspaces.reduce(
    (sum, workspace) => sum + Number(workspace.ram.match(/[\d.]+/)?.[0] ?? 0),
    0,
  );
  const health = workspaces.length ? Math.round((runningCount / workspaces.length) * 100) : 0;
  const branches = [...new Set(workspaces.map((workspace) => workspace.branch).filter(Boolean))];
  const activeBranch = selectedBranch === "All branches" || branches.includes(selectedBranch)
    ? selectedBranch
    : branches[0] ?? "All branches";
  const templateGroups = useMemo(() => {
    const groups = new Map<string, { count: number; cpu: number; ram: number }>();
    workspaces.forEach((workspace) => {
      const current = groups.get(workspace.template) ?? { count: 0, cpu: 0, ram: 0 };
      current.count += 1;
      current.cpu += workspace.vCpu;
      current.ram += Number(workspace.ram.match(/[\d.]+/)?.[0] ?? 0);
      groups.set(workspace.template, current);
    });
    return [...groups.entries()].sort((a, b) => b[1].cpu - a[1].cpu);
  }, [workspaces]);

  const visibleWorkspaces = useMemo(
    () => {
      if (timeRange !== "Current") return [];
      return workspaces
        .filter((workspace) =>
          `${workspace.name} ${workspace.repo} ${workspace.branch} ${workspace.template}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .filter((workspace) => statusFilter === "All statuses" || workspace.status === statusFilter)
        .sort((a, b) =>
          sortBy === "CPU"
            ? b.vCpu - a.vCpu
            : sortBy === "Status"
              ? a.status.localeCompare(b.status)
              : a.name.localeCompare(b.name),
        );
    },
    [workspaces, query, statusFilter, sortBy, timeRange],
  );

  const createWorkspace = async () => {
    const name = window.prompt("Name your workspace");
    if (!name?.trim()) return;
    await spinUpDevbox(name.trim(), "Next.js 15");
    recordEvent(`Workspace created: ${name.trim()}`, "A new Next.js 15 workspace was added.", "#0df5c4");
    addToast({ type: "success", title: "Workspace created", description: `${name.trim()} was added.` });
  };

  const changeStatus = async (id: string) => {
    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace) return;
    setBusyId(id);
    try {
      await toggleWorkspaceStatus(id);
      const nextStatus = workspace.status === "Running" ? "Stopped" : "Running";
      recordEvent(`${workspace.name} ${nextStatus.toLowerCase()}`, `${workspace.repo} · ${workspace.vCpu} vCPU · ${workspace.ram}`, nextStatus === "Running" ? "#0df5c4" : "#ffc269");
    } finally {
      setBusyId(null);
    }
  };

  const removeWorkspace = async (id: string) => {
    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace) return;
    await deleteWorkspace(id);
    recordEvent(`${workspace.name} deleted`, `${workspace.repo} · ${workspace.vCpu} vCPU allocation released`, "#ff8991");
  };

  const exportWorkspaces = () => {
    const lines = [
      ["Workspace", "Repository", "Branch", "Template", "Status", "vCPU", "Memory"],
      ...visibleWorkspaces.map((workspace) => [
        workspace.name,
        workspace.repo,
        workspace.branch,
        workspace.template,
        workspace.status,
        String(workspace.vCpu),
        workspace.ram,
      ]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cloud-core-workspaces.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const cpuGradient = workspaces.reduce(
    (gradient, workspace, index) => {
      const start = totalCpu ? (gradient.used / totalCpu) * 100 : 0;
      const end = totalCpu ? ((gradient.used + workspace.vCpu) / totalCpu) * 100 : 0;
      const color = ["#8675ff", "#0df5c4", "#ff9d78", "#ffc269", "#52bed1", "#e77bd0"][index % 6];
      gradient.stops.push(`${color} ${start}% ${end}%`);
      gradient.used += workspace.vCpu;
      return gradient;
    },
    { used: 0, stops: [] as string[] },
  );

  const cards: Record<(typeof statCards)[number]["id"], { value: string; detail: string; fill: number }> = {
    workspaces: {
      value: `${totalCpu.toLocaleString()} vCPU`,
      detail: `${workspaces.length} workspace${workspaces.length === 1 ? "" : "s"} · ${totalRam} GB memory`,
      fill: Math.min(health, 100),
    },
    running: {
      value: runningCount.toLocaleString(),
      detail: `${buildingCount} building · ${stoppedCount} stopped`,
      fill: workspaces.length ? (runningCount / workspaces.length) * 100 : 0,
    },
    health: {
      value: `${health}%`,
      detail: isDataLoading ? "Workspace data loading" : `${runningCount} of ${workspaces.length} running`,
      fill: health,
    },
    capacity: {
      value: templateGroups[0]?.[0] ?? "No templates",
      detail: templateGroups[0] ? `${templateGroups[0][1].cpu} vCPU · ${templateGroups[0][1].count} workspace${templateGroups[0][1].count === 1 ? "" : "s"}` : "Create a workspace to see template usage",
      fill: totalCpu && templateGroups[0] ? (templateGroups[0][1].cpu / totalCpu) * 100 : 0,
    },
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#09090f] px-4 py-3 text-[#ededf5] sm:px-6 lg:px-7">
      <div className="mx-auto max-w-[1500px] space-y-3">
        <header className="space-y-2">
          <div>
            <div className="mb-1 text-[10px] font-mono text-[#aaa6b2]">{workspaces[0]?.name.toLowerCase().replaceAll(" ", "-") ?? "all-workspaces"} <span className="text-[#5b5863]">/</span> workstreams <span className="text-[#5b5863]">/</span> <b className="text-[#0df5c4]">cloud-core-engine</b> <span className="rounded bg-[#292733] px-1 text-[#aaa6b2]">{workspaces.length} workspaces</span></div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Cloud Core Engine <span className="font-normal text-[#9692a0]">// Allocation &amp; Workload</span></h1>
              <label className="flex items-center gap-1 rounded-md border border-[#302e39] bg-[#1b1a23] px-2 py-1 text-[10px] font-mono text-[#d2ceda]"><GitBranch className="h-3 w-3 text-[#a997ff]"/><span className="sr-only">Branch</span><select value={activeBranch} onChange={(event) => { setSelectedBranch(event.target.value); setQuery(event.target.value === "All branches" ? "" : event.target.value); }} className="max-w-32 bg-transparent outline-none"><option>All branches</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select><ChevronDown className="h-3 w-3 text-[#777380]"/></label>
              <span className="rounded-md border border-[#164839] bg-[#0d2821] px-2 py-1 text-[10px] font-mono text-[#0df5c4]">● {runningCount} RUNNING</span>
              <span className="rounded-md border border-[#302e39] bg-[#1b1a23] px-2 py-1 text-[10px] font-mono text-[#aaa6b2]">{totalCpu} vCPU · {totalRam} GB allocated</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
            {["All statuses", "Running", "Stopped"].map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-md px-3 py-1.5 ${statusFilter === status ? "bg-[#24222b] text-white" : "text-[#aaa6b2] hover:bg-[#1b1a23]"}`}>{status === "All statuses" ? "All Workspaces" : status}</button>)}
            <button onClick={exportWorkspaces} className="flex items-center gap-1.5 rounded-md bg-[#24222b] px-3 py-1.5 text-[#d2ceda] hover:bg-[#302d39]"><Download className="h-3.5 w-3.5"/> Export Report</button>
            <button onClick={() => void createWorkspace()} className="flex items-center gap-1.5 rounded-md bg-[#8675ff] px-3 py-1.5 font-semibold text-[#0b0a10] hover:bg-[#9789ff]"><Plus className="h-3.5 w-3.5"/> Allocate Workspace</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {statCards.map(({ id, label, color, icon: Icon }) => {
            const stat = cards[id];
            return (
              <Panel key={id} className="min-h-[174px] border-[#262638] bg-[#161622] p-4">
                <div className="flex items-center justify-between text-[9px] font-mono tracking-[.13em] text-[#a29eac]">
                  {label}<Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <strong className="max-w-full truncate text-[23px] font-semibold leading-tight">{stat.value}</strong>
                  {id === "health" && <span className="text-[10px] text-[#d2ceda]">of workspaces running</span>}
                  {id !== "health" && <span className="text-[9px] font-mono" style={{ color }}>{stat.fill.toFixed(0)}%</span>}
                </div>
                <div className="mt-2 min-h-[28px] text-[10px] text-[#b0acb9]">{stat.detail}</div>
                {id === "running" && <div className="mb-1 flex -space-x-1.5">{workspaces.filter((workspace) => workspace.status === "Running").slice(0, 6).map((workspace, index) => <span key={workspace.id} title={workspace.name} className="grid h-5 w-5 place-items-center rounded-full border border-[#1b1a23] text-[7px] font-bold text-[#14131a]" style={{ backgroundColor: ["#9d8cff", "#0df5c4", "#ff9d78", "#ffc269", "#52bed1", "#e77bd0"][index % 6] }}>{workspace.name.slice(0, 2).toUpperCase()}</span>)}</div>}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#292731]"><div className="h-full rounded-full" style={{ width: `${stat.fill}%`, backgroundColor: color }} /></div>
              </Panel>
            );
          })}
        </div>

        <div className="grid gap-2.5 md:grid-cols-[.82fr_1.18fr]">
          <Panel className="p-3">
            <div className="mb-3 flex items-start justify-between">
              <div><h2 className="text-[13px] font-semibold">Project Effort Share</h2><p className="mt-0.5 text-[9px] text-[#8b8ba8]">Current compute allocation across active workspaces</p></div>
              <MoreHorizontal className="h-3.5 w-3.5 text-[#777380]" />
            </div>
            <div className="flex flex-wrap items-center justify-around gap-3 py-1">
              <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: totalCpu ? `conic-gradient(${cpuGradient.stops.join(",")})` : "#262638" }}>
                {totalCpu > 0 && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full live-ring-sweep" viewBox="0 0 112 112"><circle cx="56" cy="56" r="51" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeDasharray="7 27" strokeLinecap="round" /></svg>}
                <div className="grid h-[112px] w-[112px] place-items-center rounded-full bg-[#141420]">
                  <div className="text-center"><div className="text-[22px] font-bold">{totalCpu ? "100%" : "0%"}</div><div className="text-[8px] font-mono text-[#8b8ba8]">CPU ALLOCATED</div><div className="mt-1 text-[7px] font-mono text-[#6c6c88]">{workspaces.length} WORKSPACES</div></div>
                </div>
              </div>
              <div className="max-h-32 min-w-[150px] flex-1 space-y-1.5 overflow-auto text-[8px]">
                {workspaces.length ? workspaces.slice(0, 6).map((workspace, index) => {
                  const color = ["#8675ff", "#0df5c4", "#ff9d78", "#ffc269", "#52bed1", "#e77bd0"][index % 6];
                  const allocation = totalCpu ? Math.round((workspace.vCpu / totalCpu) * 100) : 0;
                  return <div key={workspace.id} className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /><span className="min-w-0 flex-1 truncate text-[#b7b3bf]">{workspace.name}</span><b className="font-mono" style={{ color }}>{workspace.vCpu} vCPU · {allocation}%</b></div>;
                }) : <p className="text-[#777380]">Create a workspace to see its allocation.</p>}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#282631] pt-2 text-[8px] text-[#85818e]">
              <span><Cpu className="mr-1 inline h-3 w-3"/>{totalCpu} vCPU</span><span><Layers className="mr-1 inline h-3 w-3"/>{totalRam} GB memory</span><span><HardDrive className="mr-1 inline h-3 w-3"/>{workspaces.length} volumes</span>
            </div>
          </Panel>

          <Panel className="p-3">
            <div className="mb-3 flex items-start justify-between">
              <div><h2 className="text-[13px] font-semibold">Workstream Velocity &amp; Allocation Mix</h2><p className="mt-0.5 text-[9px] text-[#8b8ba8]">Live breakdown by workspace template and status</p></div>
              <span className="flex items-center gap-1.5 rounded border border-[#164839] px-2 py-1 text-[8px] text-[#0df5c4]"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0df5c4] opacity-70"/><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0df5c4]"/></span> LIVE</span>
            </div>
            <div className="mb-3 mt-4">
              <div className="mb-1.5 flex justify-between text-[8px]"><b>Workspace status distribution</b><span className="font-mono text-[#aaa6b2]">{workspaces.length} total</span></div>
              <div className="flex h-2 overflow-hidden rounded-full bg-[#292731]">
                {workspaces.length > 0 && <>
                  <div className="live-bar-fill relative h-full bg-[#8b7cff]" style={{ width: `${(runningCount / workspaces.length) * 100}%` }}><span aria-hidden="true" className="live-bar-sheen"/></div>
                  <div className="live-bar-fill relative h-full bg-[#0df5c4]" style={{ width: `${(buildingCount / workspaces.length) * 100}%` }}><span aria-hidden="true" className="live-bar-sheen"/></div>
                  <div className="live-bar-fill relative h-full bg-[#ff9e8a]" style={{ width: `${(stoppedCount / workspaces.length) * 100}%` }}><span aria-hidden="true" className="live-bar-sheen"/></div>
                </>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[7px] text-[#aaa6b2]"><span className="text-[#a997ff]">● Running {runningCount}</span><span className="text-[#0df5c4]">● Building {buildingCount}</span><span className="text-[#ff9e8a]">● Stopped {stoppedCount}</span></div>
            </div>
            <div className="space-y-2">
              {templateGroups.length ? templateGroups.slice(0, 3).map(([template, allocation]) => {
                const share = totalCpu ? Math.round((allocation.cpu / totalCpu) * 100) : 0;
                return <div key={template}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[8px]"><span className="min-w-0 truncate text-[#d5d1dc]">{template}<span className="ml-1 text-[#777380]">· {allocation.count} workspace{allocation.count === 1 ? "" : "s"}</span></span><span className="shrink-0 font-mono text-[#0df5c4]">{share}% CPU</span></div>
                  <div className="h-1 rounded-full bg-[#292731]"><div className="live-bar-fill relative h-full overflow-hidden rounded-full bg-[#0df5c4]" style={{ width: `${share}%` }}><span aria-hidden="true" className="live-bar-sheen"/></div></div>
                </div>;
              }) : <div className="py-4 text-center text-[9px] text-[#777380]">Add a workspace to see allocation mix.</div>}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#282631] pt-2 text-[8px] text-[#aaa6b2]">
              <span><CircleDot className="mr-1 inline h-2.5 w-2.5 text-[#0df5c4]"/>{runningCount} running</span>
              <span><CircleDot className="mr-1 inline h-2.5 w-2.5 text-[#ffc269]"/>{buildingCount} building</span>
              <span><CircleDot className="mr-1 inline h-2.5 w-2.5 text-[#797582]"/>{stoppedCount} stopped</span>
              <span className="ml-auto font-mono text-[#85818e]">{totalCpu} vCPU · {totalRam} GB</span>
            </div>
          </Panel>
        </div>

        <Panel className="overflow-hidden border-0 bg-[#141420]">
          <div className="flex flex-wrap items-end justify-between gap-2.5 px-3.5 pb-2.5 pt-3">
            <div><h2 className="text-[13px] font-semibold">Workspace Allocation &amp; Individual Working Percentage</h2><p className="mt-0.5 text-[9px] text-[#8b8ba8]">Live resource share by workspace · historical collaborator hours are not available</p></div>
            <div className="flex flex-wrap items-center gap-1 text-[8px] font-mono">
              <div className="mr-1 flex rounded-md border border-[#262638] bg-[#0e0e16] p-0.5" aria-label="Allocation history period">{["Current", "Last Week", "Last Month", "Last 3 Months"].map((period) => <button key={period} onClick={() => setTimeRange(period)} aria-pressed={timeRange === period} className={`rounded px-2 py-1 ${timeRange === period ? "bg-[#6c63ff]/25 text-[#c8c4ff]" : "text-[#82829e] hover:text-white"}`}>{period}</button>)}</div>
              <label className="relative"><span className="sr-only">Filter workspaces</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name" className="w-28 rounded border border-[#302e39] bg-[#111117] px-2 py-1.5 text-[#ddd] outline-none focus:border-[#8271ff]"/></label>
              <label className="relative"><span className="sr-only">Filter workspace status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="appearance-none rounded border border-[#302e39] bg-[#111117] py-1.5 pl-2 pr-6 text-[#aaa6b2]"><option>All statuses</option><option>Running</option><option>Building</option><option>Stopped</option></select><ChevronDown className="pointer-events-none absolute right-1.5 top-2 h-3 w-3 text-[#777380]"/></label>
              <button onClick={() => setSortBy(sortBy === "Name" ? "CPU" : sortBy === "CPU" ? "Status" : "Name")} className="flex items-center gap-1 rounded border border-[#302e39] px-2 py-1.5 text-[#aaa6b2]"><ArrowDownUp className="h-3 w-3"/> Sort: {sortBy}</button>
              <button onClick={exportWorkspaces} className="flex items-center gap-1 rounded border border-[#302e39] px-2 py-1.5 text-[#aaa6b2]"><Download className="h-3 w-3"/> Export</button>
            </div>
          </div>
          <div className="overflow-x-auto px-3 pb-1">
            <table className="w-full min-w-[790px] table-fixed text-left text-[8px]">
              <colgroup><col className="w-[20%]"/><col className="w-[17%]"/><col className="w-[13%]"/><col className="w-[14%]"/><col className="w-[13%]"/><col className="w-[13%]"/><col className="w-[10%]"/></colgroup>
              <thead className="bg-[#111117] font-mono text-[7px] tracking-[.1em] text-[#777481]"><tr>{["WORKSPACE", "REPOSITORY / BRANCH", "TEMPLATE", "RESOURCE SHARE", "COMPUTE / MEMORY", "STATUS", "ACTIONS"].map((heading) => <th key={heading} className="px-2 py-2 font-normal">{heading}</th>)}</tr></thead>
              <tbody>
                {visibleWorkspaces.map((workspace, index) => {
                  const share = totalCpu ? Math.round((workspace.vCpu / totalCpu) * 100) : 0;
                  const color = statusColor(workspace.status);
                  return <tr key={workspace.id} className="border-t border-[#24222c] hover:bg-white/[.02]">
                    <td className="px-2 py-2"><div className="flex items-center gap-1.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[#242132] text-[7px] font-bold" style={{ color: ["#a997ff", "#0df5c4", "#ff9d78", "#ffc269", "#52bed1", "#e77bd0"][index % 6] }}>{workspace.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><b className="block truncate font-medium text-[#e5e2eb]">{workspace.name}</b><small className="text-[#777380]">{workspace.uptime} · :{workspace.port}</small></span></div></td>
                    <td className="px-2 text-[#c2beca]">{workspace.repo}<small className="block truncate text-[#777380]">{workspace.branch}</small></td>
                    <td className="px-2 text-[#c2beca]">{workspace.template}</td>
                    <td className="px-2"><div className="font-mono text-[#d8d4df]">{share}% of CPU allocation</div><div className="mt-1 h-[3px] rounded bg-[#302e37]"><div className="h-full rounded" style={{ width: `${share}%`, backgroundColor: ["#a997ff", "#0df5c4", "#ff9d78", "#ffc269", "#52bed1", "#e77bd0"][index % 6] }}/></div></td>
                    <td className="px-2 font-mono text-[#c2beca]">{workspace.vCpu} vCPU<br/>{workspace.ram}</td>
                    <td className="px-2"><span className="flex items-center gap-1" style={{ color }}><CircleDot className="h-2.5 w-2.5"/>{workspace.status}</span></td>
                    <td className="px-2"><div className="flex items-center gap-1"><button disabled={busyId === workspace.id} onClick={() => void changeStatus(workspace.id)} className="rounded bg-[#25232d] p-1 text-[#aaa6b2] disabled:opacity-50" title={workspace.status === "Running" ? "Stop workspace" : "Start workspace"}>{workspace.status === "Running" ? <Square className="h-3 w-3"/> : <Play className="h-3 w-3"/>}</button><button onClick={() => { setLoadedProjectName(workspace.name); setIsEditorProjectOpen(true); setPage("editor"); }} className="rounded bg-[#25232d] p-1 text-[#a997ff]" title="Open in editor"><ArrowUpRight className="h-3 w-3"/></button><button onClick={() => void removeWorkspace(workspace.id)} className="rounded bg-[#25232d] p-1 text-[#ff8991]" title="Delete workspace"><X className="h-3 w-3"/></button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {isDataLoading ? <p className="p-3 text-center text-[9px] text-[#82829e]">Loading workspace data…</p> : visibleWorkspaces.length === 0 ? <p className="p-3 text-center text-[9px] text-[#82829e]">{timeRange !== "Current" ? `No ${timeRange.toLowerCase()} work percentage history is available from the connected workspace data.` : workspaces.length ? "No workspaces match this filter." : "No workspaces yet. Add one to see its allocation."}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#292731] px-3.5 py-2 text-[8px] font-mono text-[#85818e]"><span>Showing {visibleWorkspaces.length} of {workspaces.length} workspaces</span><span>{totalCpu} vCPU · {totalRam} GB RAM · {health}% currently running</span></div>
        </Panel>

        <Panel className="border-0 bg-[#141420] p-3">
          <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-[10px] font-semibold"><Activity className="h-3 w-3 text-[#a997ff]"/>Recent Workspace Allocation Events</h2><span className="text-[7px] font-mono text-[#8b7cff]">SESSION ACTIVITY</span></div>
          {events.length ? <div className="grid gap-2 sm:grid-cols-3">{events.map((event) => <article key={event.id} className="min-h-[58px] border-r border-[#2a2832] pr-2 last:border-0"><b className="block text-[8px] font-semibold" style={{ color: event.color }}>◈ {event.title}</b><p className="mt-1 text-[7px] leading-relaxed text-[#aaa6b2]">{event.detail}</p><small className="text-[7px] text-[#696672]">{event.time}</small></article>)}</div> : <div className="flex min-h-[48px] items-center gap-2 text-[8px] text-[#777380]"><Check className="h-3 w-3 text-[#0df5c4]"/>{isDataLoading ? "Loading workspace activity…" : "Workspace changes you make in this session will appear here."}</div>}
        </Panel>
      </div>
    </main>
  );
}
