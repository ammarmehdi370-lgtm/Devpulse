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
  Loader2,
  AlertCircle,
} from "lucide-react";
import { FriendlyHint, HelpfulInfo, friendlyConfirm } from "./FriendlyHelpers";
import { PageHeader } from "./PageHeader";
import { RepositoryRowSkeleton } from "./SkeletonLoaders";

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
    addToast,
    isDataLoading,
  } = useApp();

  const [isNewRepoModalOpen, setIsNewRepoModalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoLang, setNewRepoLang] = useState("TypeScript");
  const [isPrivate, setIsPrivate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [nameError, setNameError] = useState("");
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredRepos = repositories.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchRepoQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchRepoQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (repoFilter === "all") return true;
    if (repoFilter === "starred") return r.isStarred;
    return r.language.toLowerCase() === repoFilter.toLowerCase();
  });

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRepoName.trim();
    if (!trimmed) {
      setNameError("Repository name is required.");
      return;
    }
    if (
      !/^[a-z0-9][a-z0-9-_]{0,49}$/.test(
        trimmed.toLowerCase().replace(/\s+/g, "-"),
      )
    ) {
      setNameError(
        "Use only lowercase letters, numbers, hyphens. Max 50 chars.",
      );
      return;
    }
    setNameError("");
    setIsCreatingRepo(true);

    const langColors: Record<string, string> = {
      TypeScript: "#3178c6",
      Python: "#3572A5",
      Rust: "#dea584",
      Go: "#00ADD8",
    };

    try {
      await addRepository({
        name: trimmed.toLowerCase().replace(/\s+/g, "-"),
        description: newRepoDesc || "High-performance cloud workspace project.",
        language: newRepoLang,
        languageColor: langColors[newRepoLang] || "#3178c6",
        branch: "main",
        lastCommit: "Initial commit: repository initialized",
        deployStatus: "none",
        devboxReady: true,
      });
      addToast({
        type: "success",
        title: "Repository created!",
        description: `${trimmed} is ready for development.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Failed to create repository",
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsCreatingRepo(false);
    }

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
    addToast({
      type: "info",
      title: "Clone URL copied!",
      description: `git clone URL for ${repoName} is on your clipboard.`,
    });
  };

  const handleLaunchDevbox = async (repo: Repository) => {
    setLaunchingId(repo.id);
    try {
      await spinUpDevbox(
        `${repo.name}-devbox`,
        `${repo.language} Cloud Container`,
      );
      addToast({
        type: "success",
        title: "Devbox launching!",
        description: `A cloud workspace for ${repo.name} is spinning up.`,
      });
      setPage("workspaces");
    } catch {
      addToast({
        type: "error",
        title: "Launch failed",
        description: "Could not start the devbox. Please try again.",
      });
    } finally {
      setLaunchingId(null);
    }
  };

  const handleDeleteRepo = async (repo: Repository) => {
    if (
      !friendlyConfirm(
        `Remove project ${repo.name}? This will delete the project from this list and cannot be undone from this screen.`,
      )
    )
      return;
    setDeletingId(repo.id);
    try {
      await deleteRepository(repo.id);
      addToast({
        type: "info",
        title: "Repository removed",
        description: `${repo.name} has been deleted.`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Delete failed",
        description: "Could not remove the repository. Try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-6">
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title="Code Projects"
        subtitle="All your Git repositories in one place — browse, search, and launch instant cloud workspaces."
        breadcrumbs={[{ label: "Repositories" }]}
        actions={
          <>
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
              <span>Workspaces</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        }
      />

      <FriendlyHint
        title="A quick explanation"
        body="Use this screen to find the project you want, review its details, and launch a ready-to-use dev workspace. 'Stars' and 'forks' are just popularity and copies of the project."
      />

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
        {isDataLoading ? (
          <RepositoryRowSkeleton count={4} />
        ) : filteredRepos.length === 0 && repositories.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center bg-[#11111a] border border-[#1f1f2e] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#1b1b2a] border border-[#2b2b3e] flex items-center justify-center">
              <GitFork className="w-7 h-7 text-[#4e4e72]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">
                No repositories yet
              </p>
              <p className="text-xs text-[#7e7e98] max-w-xs">
                Create your first repository to get started. Your projects will
                appear here for fast access.
              </p>
            </div>
            <button
              onClick={() => setIsNewRepoModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-2 shadow-md"
              style={{ backgroundColor: theme.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create your first repository</span>
            </button>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-12 text-center bg-[#11111a] border border-[#1f1f2e] rounded-2xl">
            <FolderGit2 className="w-10 h-10 text-[#555570] mx-auto mb-3" />
            <h3 className="text-white text-sm font-semibold">
              No results found
            </h3>
            <p className="text-xs text-[#7e7e98] mt-1">
              Try adjusting your search term or filter.
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
                      <HelpfulInfo
                        text="Branch is the version line for this project. Think of it like the current working copy."
                        className="ml-1"
                      />
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
                    onClick={() => void handleDeleteRepo(repo)}
                    disabled={deletingId === repo.id}
                    title="Delete Repository"
                    aria-label={`Delete ${repo.name}`}
                    className="ml-2 p-2 rounded-xl bg-[#241719] hover:bg-[#3a1e22] border border-[#6b3038]/60 hover:border-[#f87171] text-[#c08088] hover:text-[#f87171] transition-colors disabled:opacity-50"
                  >
                    {deletingId === repo.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Launch Devbox */}
                  <button
                    onClick={() => void handleLaunchDevbox(repo)}
                    disabled={launchingId === repo.id}
                    aria-label={`Launch devbox for ${repo.name}`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-60"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {launchingId === repo.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#09090e]" />
                    ) : (
                      <Box className="w-3.5 h-3.5 text-[#09090e]" />
                    )}
                    <span>
                      {launchingId === repo.id ? "Launching…" : "Launch Devbox"}
                    </span>
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
                  Repository Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. edge-microservice"
                  value={newRepoName}
                  onChange={(e) => {
                    setNewRepoName(e.target.value);
                    setNameError("");
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#171724] border text-white focus:outline-none ${
                    nameError
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#2b2b3e] focus:border-[#6C63FF]"
                  }`}
                />
                {nameError && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-400">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{nameError}</span>
                  </div>
                )}
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
                  onClick={() => {
                    setIsNewRepoModalOpen(false);
                    setNameError("");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1b1b28] text-[#8e8ea6] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRepo}
                  className="px-5 py-2 rounded-xl font-semibold text-[#09090e] flex items-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: theme.primary }}
                >
                  {isCreatingRepo && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {isCreatingRepo ? "Creating…" : "Create Repository"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
