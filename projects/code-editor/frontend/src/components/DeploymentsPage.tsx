import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  GitCommit,
  Layers,
  Terminal,
  Server
} from 'lucide-react';

export const DeploymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deployments' | 'env' | 'pipelines'>('deployments');
  const [autoDeployPush, setAutoDeployPush] = useState(true);
  const [ephemeralPr, setEphemeralPr] = useState(true);
  const [copiedStream, setCopiedStream] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: boolean }>({});

  const [envVars, setEnvVars] = useState([
    { key: 'REDIS_CLUSTER_URL', val: 'rediss://default:x9F200@cluster.us-east.cache.aws.com:6379', scope: 'Production, Preview' },
    { key: 'OPENAI_API_KEY', val: 'sk-proj-984bf92a10e8c00481b938f2010892cfa', scope: 'Production, Preview' },
    { key: 'JWT_SECRET_KEY', val: 'cplane_sec_0918bca8192039281a8c9b8', scope: 'Shared (All Environments)' },
    { key: 'VECTOR_EMBEDDING_MODEL', val: 'text-embedding-3-small', scope: 'Feature Flags' },
  ]);

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [showAddEnv, setShowAddEnv] = useState(false);

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey.trim()) {
      setEnvVars((prev) => [
        ...prev,
        { key: newKey.trim(), val: newVal.trim() || 'default_value', scope: 'Production, Preview' },
      ]);
      setNewKey('');
      setNewVal('');
      setShowAddEnv(false);
    }
  };

  const handleDeleteEnv = (key: string) => {
    setEnvVars((prev) => prev.filter((item) => item.key !== key));
  };

  const streamLogs = `[12:14:10] [PIPELINE] Initializing automated edge manifest for repository: codeplane-core
[12:14:18] [INFO] Fetching ref 'main/cache' (c8f12b4-90) from upstream git origin...
[12:14:24] [BUILD] Restored 42/48 layers from Codeplane Turbo Layer Cache [cache-key: node-modules-v14]
[12:14:28] [STEP 1/2] pnpm run build:core --workspace packages/server
[12:14:34] [STEP 2/2] Emitting Optimized WASM artifacts for vector indexing... [done]
[12:14:36] [RUNTIME] Microkernel boots in 184ms
[12:14:38] [NETWORK] Functioning mesh proxy listener on unix:/var/run/codeplane.sock
[12:14:40] [HEALTH] Healthchecks passed on port 3000 [HTTP 200]
[12:14:42] [MESH/EDGE] Edge routing propagation complete across 32 points of presence.
✓ Deployment available at: https://codeplane-core-preview-prod.codeplane.app`;

  const handleCopyStream = () => {
    navigator.clipboard.writeText(streamLogs);
    setCopiedStream(true);
    setTimeout(() => setCopiedStream(false), 2000);
  };

  return (
    <div className="deployments-page-scroll">
      {/* Top Banner */}
      <div className="deployments-header">
        <div className="deploy-title-col">
          <div className="deploy-cluster-crumbs">
            <span>CLUSTER: us-east-nitro-4</span>
            <span className="crumb-sep">/</span>
            <span>codeplane-core</span>
          </div>
          <div className="deploy-headline-row">
            <h1 className="deploy-main-title">Deployments &amp; Project Configuration</h1>
            <span className="canary-live-pill">• Live: Inactive Canary</span>
          </div>
        </div>

        <div className="deploy-actions-right">
          <button className="rerun-pipeline-btn">
            <RotateCcw size={13} />
            <span>Rerun Pipeline</span>
          </button>
          <button className="new-release-btn">
            <Plus size={14} />
            <span>New Production Release</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="deploy-stats-grid">
        <div className="deploy-stat-card">
          <span className="stat-card-label">GLOBAL EDGE LATENCY</span>
          <strong className="stat-card-val cyan">10.4ms <span className="stat-sub">p90</span></strong>
        </div>
        <div className="deploy-stat-card">
          <span className="stat-card-label">ACTIVE CONTAINERS</span>
          <strong className="stat-card-val green">24/24 <span className="stat-sub">Healthy</span></strong>
        </div>
        <div className="deploy-stat-card">
          <span className="stat-card-label">RELEASE SUCCESS RATE</span>
          <strong className="stat-card-val purple">99.98% <span className="stat-sub">SLA</span></strong>
        </div>
        <div className="deploy-stat-card">
          <span className="stat-card-label">LAST GIT PUSH</span>
          <strong className="stat-card-val white">4m ago <span className="stat-sub">main</span></strong>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="deploy-nav-tabs">
        <button
          className={`deploy-tab ${activeTab === 'deployments' ? 'active' : ''}`}
          onClick={() => setActiveTab('deployments')}
        >
          Deployments (Active)
        </button>
        <button
          className={`deploy-tab ${activeTab === 'env' ? 'active' : ''}`}
          onClick={() => setActiveTab('env')}
        >
          Environment Variables
        </button>
        <button
          className={`deploy-tab ${activeTab === 'pipelines' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipelines')}
        >
          Build Pipelines
        </button>
      </div>

      {/* Main Grid: Active Deployments + CI/CD */}
      <div className="deploy-content-grid">
        {/* Active Deployments Card */}
        <div className="deploy-card-box">
          <div className="box-title-row">
            <div className="title-with-icon">
              <Layers size={14} className="icon-purple" />
              <strong>Active Deployments</strong>
            </div>
            <span className="sub-hint">Current production routing and staged ephemeral devboxes.</span>
          </div>

          <div className="deployments-table">
            <div className="table-row">
              <div className="col-info">
                <strong>codeplane-core-preview-prod.devbox.io</strong>
                <span>Target: us-east/edge-cluster</span>
              </div>
              <span className="status-badge-ready">✓ Ready</span>
              <div className="col-branch">
                <span>main/cache</span>
                <code>c8f12b4 (42 layers cached)</code>
              </div>
              <span className="col-time">4m ago by CI</span>
            </div>

            <div className="table-row">
              <div className="col-info">
                <strong>edge-alpha-cache-global-live.edge</strong>
                <span>Target: global-multicast</span>
              </div>
              <span className="status-badge-ready">✓ Ready</span>
              <div className="col-branch">
                <span>main</span>
                <code>a94f8e2 (deep distributed proxy)</code>
              </div>
              <span className="col-time">1h ago by alex</span>
            </div>

            <div className="table-row">
              <div className="col-info">
                <strong>canary-router-edge-pr-149.app</strong>
                <span>Target: ephemeral/pr-149</span>
              </div>
              <span className="status-badge-retrying">↻ Retrying</span>
              <div className="col-branch">
                <span>fix/cache-latency</span>
                <code>1142bf1 (failover node warm)</code>
              </div>
              <span className="col-time">2m ago</span>
            </div>
          </div>
        </div>

        {/* CI/CD Automation Card */}
        <div className="deploy-card-box ci-card">
          <div className="box-title-row">
            <div className="title-with-icon">
              <GitCommit size={14} className="icon-cyan" />
              <strong>CI/CD Automation</strong>
            </div>
            <span className="tier-tag">FAST MERGE</span>
          </div>

          <p className="ci-desc">
            Trigger build workers instantly upon remote git pushes to default branch or tagged release milestones.
          </p>

          <div className="toggle-setting-row">
            <div className="toggle-labels">
              <strong>Deploy on Git Push to main</strong>
              <span>Triggers github.com/codeplane_sh/engine/main</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={autoDeployPush}
                onChange={() => setAutoDeployPush(!autoDeployPush)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="toggle-setting-row">
            <div className="toggle-labels">
              <strong>Ephemeral Pull Request Workspaces</strong>
              <span>Instantly provison devboxes for reviews</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={ephemeralPr}
                onChange={() => setEphemeralPr(!ephemeralPr)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="turbo-layer-info">
            <span className="spark-bolt">✦</span>
            <div className="turbo-text">
              <strong>Turbo-Layer-Cache Active</strong>
              <span>Shared container image caches shaved ~88s off the latest build cycle.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Container Deployment Stream */}
      <div className="live-stream-box">
        <div className="stream-header-row">
          <div className="stream-title-col">
            <div className="stream-title-badge">
              <Terminal size={14} className="icon-cyan" />
              <strong>Live Container Deployment Stream</strong>
              <span className="target-pill">Target: us-east</span>
            </div>
            <span className="stream-subtext">Real-time edge telemetry and post-compilation lifecycle.</span>
          </div>

          <div className="stream-actions">
            <button className="stream-btn" onClick={handleCopyStream}>
              <Copy size={12} />
              <span>{copiedStream ? 'Copied' : 'Copy Stream'}</span>
            </button>
            <span className="live-stream-indicator">● 771 LIVE</span>
          </div>
        </div>

        <pre className="stream-terminal-pre">
          <code>{streamLogs}</code>
        </pre>
      </div>

      {/* Environment Variables & Topology Row */}
      <div className="deploy-bottom-grid">
        {/* Env Vars */}
        <div className="deploy-card-box env-vars-box">
          <div className="box-title-row">
            <div className="title-with-icon">
              <Server size={14} className="icon-purple" />
              <strong>Environment Variables</strong>
            </div>
            <button className="add-env-btn" onClick={() => setShowAddEnv(!showAddEnv)}>
              <Plus size={12} />
              <span>Add Variable</span>
            </button>
          </div>

          {showAddEnv && (
            <form onSubmit={handleAddEnv} className="add-env-form">
              <input
                type="text"
                placeholder="VARIABLE_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="env-input-field"
              />
              <input
                type="text"
                placeholder="Value..."
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                className="env-input-field"
              />
              <button type="submit" className="save-env-btn">Save</button>
            </form>
          )}

          <div className="env-vars-list">
            {envVars.map((item) => (
              <div key={item.key} className="env-row">
                <div className="env-key-col">
                  <strong>{item.key}</strong>
                  <span>{item.scope}</span>
                </div>
                <div className="env-val-box">
                  <code>{revealedKeys[item.key] ? item.val : '••••••••••••••••••••••••••••'}</code>
                </div>
                <div className="env-actions">
                  <button
                    className="env-icon-btn"
                    onClick={() => toggleReveal(item.key)}
                    title={revealedKeys[item.key] ? 'Hide' : 'Reveal'}
                  >
                    {revealedKeys[item.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    className="env-icon-btn delete"
                    onClick={() => handleDeleteEnv(item.key)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edge Topology Card */}
        <div className="deploy-card-box topology-box">
          <div className="box-title-row">
            <div className="title-with-icon">
              <Layers size={14} className="icon-cyan" />
              <strong>Edge Topology</strong>
            </div>
            <span className="mesh-tag">FULL-MESH</span>
          </div>

          <p className="topo-desc">
            Active-active edge gateways distributing ingress traffic across primary and preview pods.
          </p>

          <div className="topology-diagram">
            <div className="topo-node ingress">Ingress SSL</div>
            <div className="topo-branches">
              <div className="topo-branch">
                <span className="topo-line"></span>
                <span className="topo-leaf">Edge #1</span>
              </div>
              <div className="topo-branch">
                <span className="topo-line"></span>
                <span className="topo-leaf">Edge #2</span>
              </div>
              <div className="topo-branch">
                <span className="topo-line"></span>
                <span className="topo-leaf">Redis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
