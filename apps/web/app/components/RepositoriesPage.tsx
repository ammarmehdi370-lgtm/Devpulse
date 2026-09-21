"use client";

import React, { useState } from "react";
import { useApp, Repository } from "../context/AppContext";
import {
  Search,
  Plus,
  GitFork,
  Star,
  ExternalLink,
  Box,
  Rocket,
  Copy,
  Check,
  GitBranch,
  Clock,
  ArrowRight,
  FolderGit2,
  Lock,
  Globe,
  Trash2,
} from "lucide-react";

export const RepositoriesPage: React.FC = () => {
  const {
    repositories,
    searchRepoQuery,
    setSearchRepoQuery,
    repoFilter,
    setRepoFilter,
    addRepository,
    deleteRepository,
    toggleStarRepo,
    spinUpDevbox,
    setPage,
    theme,
  } = useApp();

  const [isNewRepoModalOpen, setIsNewRepoModalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoLang, setNewRepoLang] = useState("TypeScript");
  const [isPrivate, setIsPrivate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRepos = repositories.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchRepoQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchRepoQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (repoFilter === "all") return true;
    if (repoFilter === "starred") return r.isStarred;
    return r.language.toLowerCase() === repoFilter.toLowerCase();
  });

  const handleCreateRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    const langColors: Record<string, string> = {
      TypeScript: "#3178c6",
      Python: "#3572A5",
      Rust: "#dea584",
      Go: "#00ADD8",
    };

    addRepository({
      name: newRepoName.toLowerCase().replace(/\s+/g, "-"),
      description: newRepoDesc || "High-performance cloud workspace project.",
      language: newRepoLang,
      languageColor: langColors[newRepoLang] || "#3178c6",
      branch: "main",
      lastCommit: "Initial commit: repository initialized",
      deployStatus: "none",
      devboxReady: true,
    });

    setNewRepoName("");
    setNewRepoDesc("");
    setIsNewRepoModalOpen(false);
  };

  const handleCopyCloneUrl = (id: string, repoName: string) => {
    navigator.clipboard.writeText(
      `https://github.com/devpulse-org/${repoName}.git`,
    );
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLaunchDevbox = (repo: Repository) => {
    spinUpDevbox(`${repo.name}-devbox`, `${repo.language} Cloud Container`);
    setPage("workspaces");
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-6">
      {/* Top Banner with Quick Step Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1c1c2b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0DF5C4]/10 text-[#0DF5C4] border border-[#0DF5C4]/30">
              STEP 3 OF 5
            </span>
            <span className="text-xs text-[#7e7e9a] font-mono">
              GIT REPOSITORIES & SYNC
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Repositories & Linked Sources
          </h1>
          <p className="text-xs text-[#8c8ca5] mt-1">
            Manage your Git projects, sync remote repositories, and launch
            isolated devboxes with a single click.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewRepoModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-transform hover:scale-[1.02] shadow-lg"
            style={{ backgroundColor: theme.primary, color: "#09090e" }}
          >
            <Plus className="w-4 h-4" />
            <span>New Repository</span>
          </button>

          <button
            onClick={() => setPage("workspaces")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#171724] hover:bg-[#202030] border border-[#2b2b40] text-white flex items-center gap-2 transition-colors"
          >
            <span>Proceed to Workspaces</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#11111a] border border-[#1f1f2e] p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#686884] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search repositories by name or description..."
            value={searchRepoQuery}
            onChange={(e) => setSearchRepoQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#161622] border border-[#252536] rounded-xl text-xs text-white placeholder-[#585870] focus:outline-none focus:border-[#6C63FF]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["all", "TypeScript", "Python", "Go", "Rust", "starred"].map((f) => (
            <button
              key={f}
              onClick={() => setRepoFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                repoFilter === f
                  ? "bg-white/10 text-white border border-white/30"
                  : "bg-[#151520] text-[#7a7a98] border border-transparent hover:text-white"
              }`}
            >
              {f === "starred" ? "★ Starred" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Repositories List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRepos.length === 0 ? (
          <div className="p-12 text-center bg-[#11111a] border border-[#1f1f2e] rounded-2xl">
            <FolderGit2 className="w-10 h-10 text-[#555570] mx-auto mb-3" />
            <h3 className="text-white text-sm font-semibold">
              No repositories found
            </h3>
            <p className="text-xs text-[#7e7e98] mt-1">
              Try adjusting your search or create a new repository.
            </p>
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <div
              key={repo.id}
              className="bg-[#111119] border border-[#1f1f2d] hover:border-[#2e2e42] rounded-2xl p-5 transition-all shadow-md group"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Repo Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white hover:underline cursor-pointer flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-[#8b8ba8]" />
                      <span>{repo.name}</span>
                    </h3>

                    {/* Visibility badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1a26] text-[#8e8ea6] border border-[#272738] flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      Public
                    </span>

                    {/* Deploy status */}
                    {repo.deployStatus === "live" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0DF5C4]/10 text-[#0DF5C4] border border-[#0DF5C4]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
                        Live Traffic
                      </span>
                    )}
                    {repo.deployStatus === "building" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FF9E64]/10 text-[#FF9E64] border border-[#FF9E64]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9E64] animate-spin" />
                        Building
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8c8ca5] max-w-2xl leading-relaxed">
                    {repo.description}
                  </p>

                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6e6e88] pt-1 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: repo.languageColor }}
                      />
                      <span className="text-[#a4a4be]">{repo.language}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[#8b8ba8]">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{repo.branch}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{repo.lastCommit}</span>
                    </div>

                    <span>Updated {repo.updatedAt}</span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Star button */}
                  <button
                    onClick={() => toggleStarRepo(repo.id)}
                    className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                      repo.isStarred
                        ? "bg-[#FF9E64]/15 border-[#FF9E64]/40 text-[#FF9E64]"
                        : "bg-[#161622] border-[#252536] text-[#7a7a98] hover:text-white"
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${repo.isStarred ? "fill-current" : ""}`}
                    />
                    <span>{repo.stars}</span>
                  </button>

                  {/* Copy Clone URL */}
                  <button
                    onClick={() => handleCopyCloneUrl(repo.id, repo.name)}
                    title="Copy Git Clone URL"
                    className="p-2 rounded-xl bg-[#161622] hover:bg-[#1f1f2e] border border-[#252536] text-[#8c8ca5] hover:text-white transition-colors"
                  >
                    {copiedId === repo.id ? (
                      <Check className="w-3.5 h-3.5 text-[#0DF5C4]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* View Deployments */}
                  <button
                    onClick={() => setPage("deployments")}
                    title="View Deployments"
                    className="px-3 py-2 rounded-xl bg-[#161622] hover:bg-[#1f1f2e] border border-[#252536] text-xs font-mono text-[#a0a0ba] hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Rocket className="w-3.5 h-3.5 text-[#6C63FF]" />
                    <span className="hidden sm:inline">Deployments</span>
                  </button>

                  {/* Delete Repo */}
                  <button
                    onClick={() => deleteRepository(repo.id)}
                    title="Delete Repository"
                    className="p-2 rounded-xl bg-[#161622] hover:bg-[#251818] border border-[#252536] hover:border-[#f87171]/40 text-[#7a7a98] hover:text-[#f87171] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Launch Devbox */}
                  <button
                    onClick={() => handleLaunchDevbox(repo)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Box className="w-3.5 h-3.5 text-[#09090e]" />
                    <span>Launch Devbox</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Repository Modal */}
      {isNewRepoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-[#262638] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#202030]">
              <h3 className="text-white font-bold text-base">
                Create a New Repository
              </h3>
              <button
                onClick={() => setIsNewRepoModalOpen(false)}
                className="text-[#686884] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRepo} className="space-y-4 text-xs">
              <div>
                <label className="text-[#8c8ca5] font-mono block mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. edge-microservice"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171724] border border-[#2b2b3e] text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>

              <div>
                <label className="text-[#8c8ca5] font-mono block mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-throughput event pipeline"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171724] border border-[#2b2b3e] text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>

              <div>
                <label className="text-[#8c8ca5] font-mono block mb-1">
                  Primary Language
                </label>
                <select
                  value={newRepoLang}
                  onChange={(e) => setNewRepoLang(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171724] border border-[#2b2b3e] text-white focus:outline-none focus:border-[#6C63FF]"
                >
                  <option value="TypeScript">TypeScript</option>
                  <option value="Python">Python</option>
                  <option value="Rust">Rust</option>
                  <option value="Go">Go</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRepoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1b1b28] text-[#8e8ea6] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold text-[#09090e]"
                  style={{ backgroundColor: theme.primary }}
                >
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
