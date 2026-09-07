import React, { useRef, useState } from 'react';
import {
  GitBranch,
  Sparkles,
  Laptop,
  FolderOpen,
  FileCode,
  Copy,
  Check,
  Download,
  BookOpen,
  Compass,
  ArrowRight,
  Terminal,
  Play,
  Cpu,
  Layers
} from 'lucide-react';

interface WelcomeWorkspacePageProps {
  onOpenLocalFolder: (files: FileList) => void;
  onOpenLocalFile: (files: FileList) => void;
  onLaunchTemplate: (templateName: string) => void;
  onCloneRepo: (repoUrl: string) => void;
  onNavigateEditor: () => void;
}

export const WelcomeWorkspacePage: React.FC<WelcomeWorkspacePageProps> = ({
  onOpenLocalFolder,
  onOpenLocalFile,
  onLaunchTemplate,
  onCloneRepo,
  onNavigateEditor,
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [repoUrl, setRepoUrl] = useState('https://github.com/codeplane-sh/engine.git');
  const [selectedTemplate, setSelectedTemplate] = useState('Next.js 15');
  const [cliCopied, setCliCopied] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleCopyCli = () => {
    navigator.clipboard.writeText('curl -fsSL https://codeplane.dev/i | sh');
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2000);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenLocalFolder(e.target.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onOpenLocalFile(e.target.files);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      onCloneRepo(repoUrl);
    }, 800);
  };

  return (
    <div className="welcome-page-scroll">
      {/* Hidden File / Folder Inputs */}
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        style={{ display: 'none' }}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
      />

      {/* Hero Welcome Header */}
      <div className="welcome-hero-banner">
        <div className="hero-top-status-row">
          <span className="engine-badge">CLOUD ENGINE V2.4</span>
          <span className="zero-lat-text">Zero-latency clusters ready</span>
        </div>

        <div className="hero-content-flex">
          <div className="hero-title-col">
            <h1 className="hero-main-title">Welcome to Codeplane, Alex.</h1>
            <h2 className="hero-sub-title">Let's create your first cloud devbox.</h2>
            <p className="hero-paragraph">
              Spin up an isolated containerized environment in under 2 seconds. Fully ephemeral,
              synchronized, and pre-configured.
            </p>
          </div>

          <div className="hero-fleet-stats">
            <div className="fleet-stat-pill">
              <span className="fleet-stat-label">ACTIVE FLEET REGION</span>
              <span className="fleet-stat-val-region">us-east-nitro-4</span>
            </div>
            <div className="fleet-stat-pill">
              <span className="fleet-stat-label">WARM WARMUP POOL</span>
              <span className="fleet-stat-val-time">1.18s avg boot</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Creation Options Row */}
      <div className="devbox-options-grid">
        {/* OPTION 01: Clone Git Repo */}
        <div className="devbox-card">
          <div className="devbox-card-header">
            <div className="card-icon-wrap purple">
              <GitBranch size={16} />
            </div>
            <span className="option-tag">OPTION 01</span>
          </div>

          <h3 className="card-title">Clone a Git Repository</h3>
          <p className="card-desc">
            Import directly from GitHub, GitLab, or any public/private Git URL with automatic
            environment detection.
          </p>

          <form onSubmit={handleImportSubmit} className="repo-input-form">
            <label className="input-label">REPOSITORY REMOTE URL</label>
            <div className="url-input-box">
              <svg className="link-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo.git"
                className="repo-text-input"
              />
            </div>

            <div className="repo-meta-subrow">
              <span className="ssh-verified">✓ SSH Key verified</span>
              <span className="branch-detect">Auto branch detect</span>
            </div>

            <button type="submit" className="action-btn-primary" disabled={importing}>
              <span>{importing ? 'Provisioning Devbox...' : 'Import Repository'}</span>
              <ArrowRight size={13} />
            </button>
          </form>
        </div>

        {/* OPTION 02: Start from Template */}
        <div className="devbox-card">
          <div className="devbox-card-header">
            <div className="card-icon-wrap mint">
              <Sparkles size={16} />
            </div>
            <span className="option-tag">OPTION 02</span>
          </div>

          <div className="template-title-row">
            <h3 className="card-title">Start from a Template</h3>
            <span className="instant-boot-badge">Instant Boot</span>
          </div>
          <p className="card-desc">
            Curated, production-ready microarchitectures configured with package caching and
            hot-reload daemon.
          </p>

          <div className="template-picker-grid">
            <button
              className={`template-tile ${selectedTemplate === 'Next.js 15' ? 'active' : ''}`}
              onClick={() => setSelectedTemplate('Next.js 15')}
            >
              <div className="template-info">
                <strong>Next.js 15</strong>
                <span>Turbopack · SSR</span>
              </div>
              <span className="lightning-indicator">⚡</span>
            </button>

            <button
              className={`template-tile ${selectedTemplate === 'FastAPI Python' ? 'active' : ''}`}
              onClick={() => setSelectedTemplate('FastAPI Python')}
            >
              <div className="template-info">
                <strong>FastAPI Python</strong>
                <span>Python 3.12 · Uvicorn</span>
              </div>
              <span className="lightning-indicator">⚡</span>
            </button>

            <button
              className={`template-tile ${selectedTemplate === 'Rust Axum' ? 'active' : ''}`}
              onClick={() => setSelectedTemplate('Rust Axum')}
            >
              <div className="template-info">
                <strong>Rust Axum</strong>
                <span>Tokio · Cargo LLVM</span>
              </div>
              <span className="lightning-indicator">⚡</span>
            </button>

            <button
              className={`template-tile ${selectedTemplate === 'Go gRPC' ? 'active' : ''}`}
              onClick={() => setSelectedTemplate('Go gRPC')}
            >
              <div className="template-info">
                <strong>Go gRPC</strong>
                <span>Go 1.23 · Protobuf</span>
              </div>
              <span className="lightning-indicator">⚡</span>
            </button>

            <button
              className={`template-tile wide-tile ${selectedTemplate === 'PyTorch AI Agent' ? 'active' : ''}`}
              onClick={() => setSelectedTemplate('PyTorch AI Agent')}
            >
              <div className="template-info">
                <strong>PyTorch AI Agent</strong>
                <span>CUDA runtime · HuggingFace accelerated</span>
              </div>
              <ArrowRight size={13} className="tile-arrow" />
            </button>
          </div>

          <button
            className="action-btn-secondary"
            onClick={() => onLaunchTemplate(selectedTemplate)}
          >
            <Play size={12} fill="currentColor" />
            <span>Spin Up {selectedTemplate}</span>
          </button>
        </div>

        {/* OPTION 03: Connect Local Machine & Open Computer Folder */}
        <div className="devbox-card">
          <div className="devbox-card-header">
            <div className="card-icon-wrap orange">
              <Laptop size={16} />
            </div>
            <span className="option-tag">OPTION 03</span>
          </div>

          <h3 className="card-title">Connect Local Machine</h3>
          <p className="card-desc">
            Bridge your native laptop environment directly to high-spec cloud devboxes or open local
            files and folders directly from your computer.
          </p>

          {/* REAL WORKING LOCAL FILE/FOLDER PICKER BUTTONS */}
          <div className="local-open-actions-row">
            <button
              type="button"
              className="open-local-folder-btn"
              onClick={() => folderInputRef.current?.click()}
            >
              <FolderOpen size={14} />
              <span>Open Folder from Computer</span>
            </button>

            <button
              type="button"
              className="open-local-file-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileCode size={14} />
              <span>Open File from Computer</span>
            </button>
          </div>

          <div className="cli-box-wrapper">
            <div className="cli-box-header">
              <span className="cli-label">SINGLE LINE CLI COMMAND</span>
              <span className="wireguard-label">WireGuard Tunnel</span>
            </div>

            <div className="cli-code-row">
              <code>curl -fsSL https://codeplane.dev/i</code>
              <button className="cli-copy-btn" onClick={handleCopyCli} title="Copy command">
                {cliCopied ? <Check size={12} color="#00e599" /> : <Copy size={12} />}
              </button>
            </div>

            <span className="cli-helper-text">
              ⓘ Installs binary &amp; prompts OAuth authorization
            </span>
          </div>

          <button
            className="action-btn-secondary"
            onClick={() => onNavigateEditor()}
          >
            <Download size={13} />
            <span>Download CLI or Open Editor</span>
          </button>
        </div>
      </div>

      {/* Recent Workspaces & Starred Repositories */}
      <div className="recent-workspaces-banner">
        <div className="recent-left">
          <div className="recent-icon-wrap">
            <Layers size={16} />
          </div>
          <div className="recent-text-col">
            <div className="recent-title-row">
              <strong className="recent-title">Recent Workspaces &amp; Starred Repositories</strong>
              <span className="total-badge">0 Total</span>
            </div>
            <p className="recent-desc">
              You don't have any running workspaces yet. Once launched, your compute instances,
              pinned ports, and environment secrets will populate here for fast resumption.
            </p>
          </div>
        </div>

        <div className="recent-actions-right">
          <button className="recent-link-btn" onClick={() => onNavigateEditor()}>
            <BookOpen size={13} />
            <span>Read Documentation</span>
          </button>
          <button className="recent-link-btn" onClick={() => onNavigateEditor()}>
            <Compass size={13} />
            <span>Explore Sample Projects</span>
          </button>
        </div>
      </div>

      {/* Hypervisor Architecture Specs & Interactive Topology */}
      <div className="hypervisor-card">
        <div className="hypervisor-info-col">
          <span className="hypervisor-subtag">HYPERVISOR ARCHITECTURE</span>
          <h4 className="hypervisor-heading">
            Every devbox includes standard dedicated microVM specs
          </h4>
          <p className="hypervisor-p">
            Shared-nothing microkernels boot with dedicated NVMe write caches, zero-trust ephemeral
            peer rings, and pre-warmed language LSP servers.
          </p>

          <div className="specs-row">
            <div className="spec-badge-item">
              <span className="spec-type">CPU</span>
              <strong className="spec-value">8 Dedicated vCPU</strong>
            </div>
            <div className="spec-badge-item">
              <span className="spec-type">MEMORY</span>
              <strong className="spec-value">32 GB ECC RAM</strong>
            </div>
            <div className="spec-badge-item">
              <span className="spec-type">STORAGE</span>
              <strong className="spec-value">100 GB NVMe</strong>
            </div>
          </div>
        </div>

        {/* Interactive Diagram Box */}
        <div className="architecture-diagram-box">
          <div className="diagram-node client-node">CLIENT</div>
          <div className="diagram-connector-line"></div>
          <div className="diagram-center-nodes">
            <div className="diagram-node firecracker-node">Firecracker</div>
            <div className="diagram-node lsp-node">LSP Sync</div>
          </div>
          <div className="diagram-connector-line"></div>
          <div className="diagram-node devbox-node">DEVBOX</div>
        </div>
      </div>

      {/* Footer Accelerators Bar */}
      <div className="productivity-accelerators-footer">
        <div className="accelerator-item">
          <span className="accel-label">PRODUCTIVITY ACCELERATORS</span>
        </div>
        <div className="accelerator-item">
          <span className="accel-key">⌘K</span>
          <span>Quick command palette</span>
        </div>
        <div className="accelerator-item">
          <span className="accel-key">⌘P</span>
          <span>Jump to file &amp; symbol</span>
        </div>
        <div className="accelerator-item">
          <span className="accel-key">Ctrl+~</span>
          <span>Open integrated terminal</span>
        </div>
        <div className="accelerator-item right-hint">
          <span>Press <strong className="accel-key">?</strong> for keyboard map</span>
        </div>
      </div>
    </div>
  );
};
