import React, { useState } from 'react';
import {
  Plus,
  Search,
  Lock,
  ArrowRight,
  Zap,
  Play,
  Settings2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  GitBranch,
  Globe,
  HardDrive
} from 'lucide-react';

interface RepositoriesPageProps {
  onOpenInEditor: (repoId: string) => void;
  onNewWorkspace: () => void;
}

interface DevboxItem {
  id: string;
  name: string;
  isPrivate?: boolean;
  tag?: string;
  repo: string;
  branch: string;
  commit: string;
  zone: string;
  specs: string;
  lastActive: string;
  status: 'Running' | 'Idle' | 'Stopped';
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({
  onOpenInEditor,
  onNewWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Personal' | 'Backend' | 'Staging'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [devboxes, setDevboxes] = useState<DevboxItem[]>([
    {
      id: 'codeplane-core',
      name: 'codeplane-core',
      isPrivate: true,
      repo: 'github.com/codeplane-sh/engine',
      branch: 'main',
      commit: 'a94f8e2',
      zone: 'us-east (N. Virginia)',
      specs: '8 vCPU · 16 GB RAM · 50 GB NVMe',
      lastActive: '3 mins ago by alex',
      status: 'Running',
    },
    {
      id: 'inference-api',
      name: 'inference-api',
      tag: 'GPU Cluster',
      repo: 'github.com/codeplane-sh/llm-gateway',
      branch: 'feature/v-cache',
      commit: '48c901e',
      zone: 'eu-west (Frankfurt)',
      specs: '16 vCPU · 32 GB RAM · 1x NVIDIA A10G',
      lastActive: '14 mins ago',
      status: 'Running',
    },
    {
      id: 'auth-service',
      name: 'auth-service',
      repo: 'github.com/codeplane-sh/security-mesh',
      branch: 'fix/jwt-expiry',
      commit: 'b12e84d',
      zone: 'us-east',
      specs: '4 vCPU · 8 GB RAM',
      lastActive: '2 hours ago',
      status: 'Idle',
    },
    {
      id: 'docs-next',
      name: 'docs-next',
      repo: 'github.com/codeplane-sh/docs',
      branch: 'main',
      commit: '77fa091',
      zone: 'us-west',
      specs: '2 vCPU · 4 GB RAM',
      lastActive: 'Yesterday',
      status: 'Stopped',
    },
  ]);

  const handleToggleStatus = (id: string) => {
    setDevboxes((prev) =>
      prev.map((box) => {
        if (box.id === id) {
          const nextStatus = box.status === 'Running' ? 'Idle' : 'Running';
          return { ...box, status: nextStatus };
        }
        return box;
      })
    );
  };

  const filteredDevboxes = devboxes.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="repositories-page-scroll">
      {/* Header Bar */}
      <div className="repos-header-row">
        <div className="repos-header-left">
          <div className="repos-infra-breadcrumbs">
            <span>INFRASTRUCTURE</span>
            <span className="sep">/</span>
            <span>Fleet Management</span>
          </div>
          <div className="repos-main-title-wrap">
            <h1 className="repos-title">Workspaces &amp; Repositories</h1>
            <span className="active-devboxes-pill">• 6 Active Devboxes</span>
          </div>
        </div>

        <div className="repos-header-right">
          <div className="filter-input-box">
            <Search size={13} className="search-filter-icon" />
            <input
              type="text"
              placeholder="Filter workspaces (name, branch)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="repos-filter-input"
            />
            <span className="slash-key">/</span>
          </div>

          <button className="new-workspace-btn" onClick={onNewWorkspace}>
            <Plus size={14} />
            <span>New Workspace</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Sub-bar */}
      <div className="repos-subbar">
        <div className="repos-tabs">
          <button
            className={`repo-tab-btn ${activeTab === 'All' ? 'active' : ''}`}
            onClick={() => setActiveTab('All')}
          >
            All Repositories
          </button>
          <button
            className={`repo-tab-btn ${activeTab === 'Personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('Personal')}
          >
            Personal
          </button>
          <button
            className={`repo-tab-btn ${activeTab === 'Backend' ? 'active' : ''}`}
            onClick={() => setActiveTab('Backend')}
          >
            Team: Backend <span className="tab-count-badge">4</span>
          </button>
          <button
            className={`repo-tab-btn ${activeTab === 'Staging' ? 'active' : ''}`}
            onClick={() => setActiveTab('Staging')}
          >
            Production Staging
          </button>
        </div>

        <div className="repos-view-controls">
          <span className="sort-label">Sort: <strong>Last Accessed</strong></span>
          <div className="view-toggle-btns">
            <button className="view-icon-btn active" title="Grid View">
              <LayoutGrid size={13} />
            </button>
            <button className="view-icon-btn" title="List View">
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Devbox Cards Grid */}
      <div className="devboxes-grid">
        {filteredDevboxes.map((box) => (
          <div key={box.id} className="devbox-fleet-card">
            {/* Card Header */}
            <div className="fleet-card-header">
              <div className="fleet-title-row">
                <div className="fleet-icon-square">
                  <HardDrive size={14} />
                </div>
                <div className="fleet-name-col">
                  <div className="name-lock-row">
                    <strong className="devbox-name">{box.name}</strong>
                    {box.isPrivate && <Lock size={12} className="lock-icon" />}
                    {box.tag && <span className="gpu-tag">{box.tag}</span>}
                  </div>
                  <span className="devbox-repo-link">{box.repo}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`status-pill-badge ${box.status.toLowerCase()}`}>
                <span className="status-dot"></span>
                <span>{box.status}</span>
              </div>
            </div>

            {/* Branch & Deployment Zone Row */}
            <div className="fleet-branch-zone-row">
              <div className="fleet-col">
                <span className="fleet-meta-label">BRANCH &amp; COMMIT</span>
                <div className="fleet-branch-val">
                  <GitBranch size={12} className="meta-icon" />
                  <span>{box.branch} <code className="commit-hash">({box.commit})</code></span>
                </div>
              </div>

              <div className="fleet-col">
                <span className="fleet-meta-label">DEPLOYMENT ZONE</span>
                <div className="fleet-zone-val">
                  <Globe size={12} className="meta-icon" />
                  <span>{box.zone}</span>
                </div>
              </div>
            </div>

            {/* Hardware Specs & Time */}
            <div className="fleet-hardware-row">
              <span className="hardware-specs-text">{box.specs}</span>
              <span className="last-active-text">{box.lastActive}</span>
            </div>

            {/* Bottom Actions Row */}
            <div className="fleet-actions-row">
              <div className="fleet-mini-icons">
                <button className="mini-tool-btn" title="Logs">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </button>
                <button className="mini-tool-btn" title="Topology">
                  <SlidersHorizontal size={13} />
                </button>
                <button className="mini-tool-btn" title="Settings">
                  <Settings2 size={13} />
                </button>
              </div>

              <div className="fleet-main-btn-wrap">
                {box.status === 'Running' ? (
                  <button
                    className="open-in-editor-btn"
                    onClick={() => onOpenInEditor(box.id)}
                  >
                    <span>Open in Editor</span>
                    <ArrowRight size={13} />
                  </button>
                ) : box.status === 'Idle' ? (
                  <button
                    className="wake-launch-btn"
                    onClick={() => handleToggleStatus(box.id)}
                  >
                    <Zap size={13} />
                    <span>Wake &amp; Launch</span>
                  </button>
                ) : (
                  <button
                    className="start-devbox-btn"
                    onClick={() => handleToggleStatus(box.id)}
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cluster Capacity Allocation Card */}
      <div className="cluster-allocation-card">
        <div className="cluster-info-col">
          <div className="cluster-title-row">
            <span className="cluster-symbol">✱</span>
            <strong className="cluster-title">Cluster Capacity Allocation</strong>
            <span className="tier-badge">Tier-1 Dedicated</span>
          </div>
          <p className="cluster-desc">
            Auto-sleep is enforced after 30 minutes of developer inactivity to conserve organization
            compute units. Devboxes spin back up in &lt;1.8 seconds.
          </p>
        </div>

        <div className="cluster-metrics-col">
          <div className="cluster-metric-item">
            <div className="metric-header">
              <span>Compute (vCPU)</span>
              <strong>38 / 64 (46%)</strong>
            </div>
            <div className="meter-track">
              <div className="meter-fill compute-fill" style={{ width: '46%' }}></div>
            </div>
          </div>

          <div className="cluster-metric-item">
            <div className="metric-header">
              <span>Memory (RAM)</span>
              <strong>62 / 128 GB</strong>
            </div>
            <div className="meter-track">
              <div className="meter-fill memory-fill" style={{ width: '48.4%' }}></div>
            </div>
          </div>

          <button className="adjust-limits-btn">
            <SlidersHorizontal size={13} />
            <span>Adjust Limits</span>
          </button>
        </div>
      </div>
    </div>
  );
};
