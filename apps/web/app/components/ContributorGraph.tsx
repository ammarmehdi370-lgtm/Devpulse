"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RefreshCw, Users, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const COLORS = ["#7C3AED", "#06B6D4", "#22C55E", "#F59E0B", "#7a7a9a"];

type Period = "7d" | "30d" | "all";
export type Contributor = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  role: string;
  stats: { revisions: number; linesAdded: number; linesRemoved: number; executions: number; aiRequests: number; filesEdited: number; lastActiveAt: string; activeDays: number };
  percentages: { revisions: number; linesAdded: number; executions: number; overall: number };
  activityByDay?: Array<{ date: string; count: number }>;
  mostActiveFile?: { path: string; count: number } | null;
};
type ContributorResponse = { contributors: Contributor[]; period: Period; projectId: string; totals: { revisions: number; linesAdded: number; executions: number; aiRequests: number; contributors: number }; generatedAt: string };
type EditorFile = { id: string; apiFileId?: string; name: string; path: string };

type ContributorGraphProps = { projectId: string; files: EditorFile[]; onClose: () => void; onCountChange?: (count: number) => void };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
const colorFor = (index: number) => COLORS[index % COLORS.length];
const formatRole = (role: string) => role.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const formatLastActive = (value: string) => {
  const time = new Date(value).getTime();
  if (!time) return "No activity";
  const hours = Math.max(0, Math.floor((Date.now() - time) / 3_600_000));
  if (hours < 1) return "Now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const PeriodSelector: React.FC<{ period: Period; onChange: (period: Period) => void }> = ({ period, onChange }) => <label className="flex items-center gap-2 text-[10px] text-slate-500"><span>Period</span><select value={period} onChange={(event) => onChange(event.target.value as Period)} className="border border-[#332b50] bg-[#0d0d16] px-2 py-1 text-[10px] text-slate-200 outline-none"><option value="7d">7 days</option><option value="30d">30 days</option><option value="all">All time</option></select></label>;
const FileScopeSelector: React.FC<{ fileId: string; files: EditorFile[]; onChange: (fileId: string) => void }> = ({ fileId, files, onChange }) => <label className="flex min-w-0 items-center gap-2 text-[10px] text-slate-500"><span>File</span><select value={fileId} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 border border-[#332b50] bg-[#0d0d16] px-2 py-1 text-[10px] text-slate-200 outline-none"><option value="">Whole project</option>{files.map((file) => <option key={file.id} value={file.apiFileId || file.id}>{file.path}</option>)}</select></label>;

const ContributorDonut: React.FC<{ contributors: Contributor[] }> = ({ contributors }) => {
  const top = contributors[0];
  const data = contributors.filter((contributor) => contributor.percentages.overall > 0).map((contributor, index) => ({ name: contributor.name, value: contributor.percentages.overall, color: colorFor(index) }));
  if (!data.length) return <div className="flex h-44 items-center justify-center"><div className="h-32 w-32 rounded-full border-[22px] border-[#28243c]" /></div>;
  return <div className="relative h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2} stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ border: "1px solid #44346d", background: "#161624", color: "#e2e8f0", fontSize: 11 }} formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl text-white">{top ? `${Math.round(top.percentages.overall)}%` : "0%"}</strong><span className="max-w-[110px] truncate text-[10px] text-slate-400">{top?.name || "No activity"}</span></div></div>;
};

const MetricBreakdown: React.FC<{ contributor: Contributor }> = ({ contributor }) => <div className="mt-3 space-y-2 border-t border-[#28243c] pt-2 text-[10px] text-slate-400"><Metric label="Saves" value={contributor.percentages.revisions} weight="40%" color="#7C3AED" /><Metric label="Lines" value={contributor.percentages.linesAdded} weight="30%" color="#06B6D4" /><Metric label="Runs" value={contributor.percentages.executions} weight="20%" color="#22C55E" /><Metric label="AI" value={contributor.stats.aiRequests ? 100 : 0} weight="10%" color="#F59E0B" /></div>;
const Metric: React.FC<{ label: string; value: number; weight: string; color: string }> = ({ label, value, weight, color }) => <div className="flex items-center gap-2"><span className="w-10">{label}</span><div className="h-1.5 flex-1 bg-[#28243c]"><div className="h-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} /></div><span className="w-8 text-right">{weight}</span></div>;

const ContributorRow: React.FC<{ contributor: Contributor; index: number }> = ({ contributor, index }) => {
  const [expanded, setExpanded] = useState(false);
  const color = colorFor(index);
  return <div className="border-b border-[#28243c] py-3"><button onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="w-full text-left"><div className="flex items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{contributor.avatarUrl ? <img src={contributor.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials(contributor.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white">{contributor.name}</span><span className="text-[9px] text-slate-500">{formatRole(contributor.role)}</span></span><strong className="text-lg text-white">{Math.round(contributor.percentages.overall)}%</strong></div><div className="mt-2 h-2 bg-[#28243c]"><div className="h-full transition-[width] duration-1000 ease-out" style={{ width: `${Math.min(100, contributor.percentages.overall)}%`, backgroundColor: color }} /></div><div className="mt-1 truncate text-[10px] text-slate-500">{contributor.stats.revisions} saves • {contributor.stats.filesEdited} files • {formatLastActive(contributor.stats.lastActiveAt)}</div></button>{contributor.mostActiveFile && <div className="mt-1 truncate pl-10 text-[9px] text-slate-600">Most changed file: {contributor.mostActiveFile.path} ({contributor.mostActiveFile.count} saves)</div>}{expanded && <MetricBreakdown contributor={contributor} />}</div>;
};

const ActivityHeatmap: React.FC<{ contributors: Contributor[] }> = ({ contributors }) => {
  const days = useMemo(() => Array.from({ length: 28 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 27 + index); return date.toISOString().slice(0, 10); }), []);
  return <div className="mt-4 border-t border-[#28243c] pt-3"><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Activity · 4 weeks</h3><div className="space-y-2">{contributors.map((contributor, index) => { const counts = new Map((contributor.activityByDay || []).map((entry) => [entry.date, entry.count])); return <div key={contributor.userId} className="flex items-center gap-2"><span className="w-12 truncate text-[9px] text-slate-500">{contributor.name.split(" ")[0]}</span><div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}>{days.map((day) => { const count = counts.get(day) || 0; return <span key={day} title={`${day}: ${count} activities`} className="aspect-square" style={{ backgroundColor: count === 0 ? "#28243c" : colorFor(index), opacity: count === 0 ? 1 : count >= 10 ? 1 : count >= 4 ? 0.6 : 0.3 }} />; })}</div></div>; })}</div></div>;
};

const Skeleton: React.FC = () => <div aria-busy="true" aria-label="Loading contributor data" className="animate-pulse space-y-3"><div className="mx-auto h-36 w-36 rounded-full border-[22px] border-[#28243c]" />{[1, 2, 3].map((item) => <div key={item} className="h-16 bg-[#191923]" />)}</div>;

export const ContributorGraph: React.FC<ContributorGraphProps> = ({ projectId, files, onClose, onCountChange }) => {
  const [period, setPeriod] = useState<Period>("30d");
  const [fileId, setFileId] = useState("");
  const [data, setData] = useState<ContributorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const query = new URLSearchParams({ period, ...(fileId ? { fileId } : {}) }); const response = await fetch(`${API_BASE}/v1/projects/${projectId}/contributors?${query}`, { credentials: "include" }); if (!response.ok) throw new Error("Contributor request failed"); const next = await response.json() as ContributorResponse; setData(next); onCountChange?.(next.totals.contributors); setLastUpdated(new Date()); } catch { setError(true); } finally { setLoading(false); }
  }, [fileId, onCountChange, period, projectId]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 300000); return () => window.clearInterval(timer); }, [load]);
  return <aside className="flex w-[320px] shrink-0 flex-col border-l border-[#28243c] bg-[#11111a]" aria-label="Team Contributions"><div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#28243c] px-3"><Users className="h-4 w-4 text-cyan-300" /><h2 className="font-bold text-white">Team Contributions</h2><button onClick={onClose} aria-label="Close team contributions" className="ml-auto text-slate-500"><X className="h-4 w-4" /></button></div><div className="space-y-2 border-b border-[#28243c] p-3"><PeriodSelector period={period} onChange={setPeriod} /><FileScopeSelector fileId={fileId} files={files} onChange={setFileId} /><div className="flex items-center gap-2 text-[9px] text-slate-600"><span>{lastUpdated ? `Refreshed ${formatLastActive(lastUpdated.toISOString())}` : "Not refreshed"}</span><button onClick={() => void load()} aria-label="Refresh contributor data" className="text-cyan-300"><RefreshCw className="h-3 w-3" /></button></div></div><div className="min-h-0 flex-1 overflow-y-auto p-3">{loading ? <Skeleton /> : error ? <div className="py-10 text-center text-xs text-red-300">Could not load contributor data<button onClick={() => void load()} className="mt-3 block w-full border border-[#332b50] px-3 py-2 text-[10px] text-slate-300">Retry</button></div> : data && data.contributors.length ? <><ContributorDonut contributors={data.contributors} /><div className="mt-2">{data.contributors.map((contributor, index) => <ContributorRow key={contributor.userId} contributor={contributor} index={index} />)}</div><ActivityHeatmap contributors={data.contributors} /></> : <div className="py-10 text-center text-xs text-slate-400"><Users className="mx-auto mb-3 h-8 w-8 text-slate-600" /><p>Only you have worked on this project</p><p className="mt-2 text-[10px] text-slate-600">Invite teammates to collaborate</p><button className="mt-4 border border-cyan-400/30 px-3 py-2 text-[10px] text-cyan-300">Invite</button></div>}</div></aside>;
};

export default ContributorGraph;
