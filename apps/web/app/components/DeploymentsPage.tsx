'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Rocket, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Plus, 
  Terminal, 
  ShieldCheck, 
  GitBranch, 
  Share2, 
  Activity, 
  Cpu, 
  Zap, 
  Globe
} from 'lucide-react';

export const DeploymentsPage: React.FC = () => {
  const { 
    deployments, 
    triggerNewRelease, 
    rerunPipeline,
    envVars, 
    addEnvVar, 
    deleteEnvVar, 
    toggleRevealEnvVar, 
    revealAllEnvVars, 
    toggleRevealAllEnvVars,
    deployOnPush, 
    setDeployOnPush, 
    ephemeralPr, 
    setEphemeralPr,
    logs, 
    clearLogs,
    theme 
  } = useApp();

  const [activeTab, setActiveTab] = useState('deployments');
  const [latencyP99, setLatencyP99] = useState(18.4);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAddingEnv, setIsAddingEnv] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newScope, setNewScope] = useState('Production, Staging');
  const [envSearch, setEnvSearch] = useState('');
  const [isRerunning, setIsRerunning] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Live latency jitter
  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyP99(prev => +(prev + (Math.random() * 0.8 - 0.4)).toFixed(1));
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const handleCopyEnv = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    addEnvVar(newKey, newValue, newScope);
    setNewKey('');
    setNewValue('');
    setIsAddingEnv(false);
  };

  const handleRerun = () => {
    setIsRerunning(true);
    rerunPipeline();
    setTimeout(() => setIsRerunning(false), 2000);
  };

  const filteredEnvVars = envVars.filter(v => 
    v.key.toLowerCase().includes(envSearch.toLowerCase()) || 
    v.scope.toLowerCase().includes(envSearch.toLowerCase())
  );

  return (
    <div className="p-6 sm:p-8 max-w-[1240px] mx-auto space-y-6">
      
      {/* Top Header matching Screenshot 4 */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-[#787896]">
          CLUSTER: <strong className="text-white">us-east-nitro-01</strong> · repository: <strong className="text-[#a4a4c6]">codeplane-core</strong>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Deployments & Project Configuration
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0DF5C4]/15 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
              Live Traffic Routed
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRerun}
              disabled={isRerunning}
              className="px-3.5 py-2 rounded-xl bg-[#141420] hover:bg-[#1b1b2a] border border-[#272738] text-xs font-mono text-[#d0d0e2] flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRerunning ? 'animate-spin text-[#0DF5C4]' : ''}`} />
              <span>{isRerunning ? 'Re-running...' : 'Re-run Pipeline'}</span>
            </button>

            <button
              onClick={triggerNewRelease}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#09090e] flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-98"
              style={{ backgroundColor: theme.primary }}
            >
              <Rocket className="w-3.5 h-3.5 text-[#09090e]" />
              <span>New Production Release</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Row (Pixel-Perfect to Screenshot 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#12121b] border border-[#20202e] rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6a6a84]">GLOBAL P99 LATENCY</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{latencyP99}ms</span>
            <span className="text-[#0DF5C4] text-xs font-mono">/ p99</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#12121b] border border-[#20202e] rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6a6a84]">ACTIVE CONTAINERS</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">24 / 24</span>
            <span className="text-[#0DF5C4] text-xs font-mono">healthy</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#12121b] border border-[#20202e] rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6a6a84]">ROLLING SUCCESS RATE</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">99.98%</span>
            <span className="text-[#0DF5C4] text-xs font-mono">SLA</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#12121b] border border-[#20202e] rounded-2xl p-4 space-y-1 shadow-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#6a6a84]">LAST SYNC</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">4m ago</span>
            <span className="text-[#8c8ca5] text-xs font-mono">container</span>
          </div>
        </div>

      </div>

      {/* Tabs Navigation Bar (Pixel-Perfect to Screenshot 4) */}
      <div className="border-b border-[#1c1c2b] flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-6 text-xs font-mono">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'deployments', label: 'Deployments (Active)' },
            { id: 'env', label: 'Environment Variables' },
            { id: 'branches', label: 'Preview Branches' },
            { id: 'pipelines', label: 'Build Pipelines' },
            { id: 'audit', label: 'Access & Audit' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-white font-semibold'
                  : 'text-[#7e7e9a] hover:text-[#d0d0e2]'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                  style={{ backgroundColor: theme.primary }} 
                />
              )}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#6c6c88] pb-2">
          <span>● 98 commits</span>
          <span>● auto-sync on</span>
        </div>
      </div>

      {/* Grid Content: Active Deployments + CI/CD Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Active Deployments List (8 Cols) */}
        <div className="lg:col-span-8 bg-[#101017] border border-[#20202e] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1c2a]">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#8c8ca5]" />
              <h3 className="text-sm font-bold text-white">Active Deployments</h3>
              <span className="text-[11px] text-[#6b6b85] font-mono">Current production routing and staged ephemeral workloads</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#0DF5C4] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-pulse" />
              Routing
            </div>
          </div>

          <div className="space-y-3">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="bg-[#141420] border border-[#222232] hover:border-[#2e2e42] rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-white hover:underline cursor-pointer">
                      {dep.target}
                    </span>
                    <a href={`https://${dep.target}`} target="_blank" rel="noreferrer" className="text-[#6C63FF] hover:text-[#8880ff]">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="text-[11px] text-[#7a7a98] font-mono">
                    Target: <span className="text-[#a4a4c4]">{dep.domain}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#6c6c88] pt-1">
                    <span className="text-[#0DF5C4] flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {dep.branch}
                    </span>
                    <span>{dep.commitHash}: {dep.commitMessage}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end font-mono text-xs">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                    dep.status === 'Ready'
                      ? 'bg-[#0DF5C4]/15 text-[#0DF5C4] border border-[#0DF5C4]/30'
                      : 'bg-[#FF9E64]/15 text-[#FF9E64] border border-[#FF9E64]/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dep.status === 'Ready' ? 'bg-[#0DF5C4]' : 'bg-[#FF9E64] animate-spin'}`} />
                    {dep.status}
                  </span>

                  <div className="text-[11px] text-[#6c6c86]">
                    <span>{dep.timestamp}</span> · <span>{dep.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: CI/CD Automation Card (4 Cols) */}
        <div className="lg:col-span-4 bg-[#101017] border border-[#20202e] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1c2a]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0DF5C4]" />
              <h3 className="text-sm font-bold text-white">CI/CD Automation</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0DF5C4]/10 text-[#0DF5C4] border border-[#0DF5C4]/30">
              AUTO-ENABLED
            </span>
          </div>

          <p className="text-xs text-[#8c8ca5] leading-relaxed">
            Trigger build workers instantly upon remote ref pushes to the default branch or tagged release milestones.
          </p>

          <div className="space-y-4 pt-2">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#141420] border border-[#222232]">
              <div>
                <div className="text-xs font-semibold text-white">Deploy on Git Push to main</div>
                <div className="text-[10px] font-mono text-[#787896]">Trigger: github:refs/heads/main</div>
              </div>
              <button
                onClick={() => setDeployOnPush(prev => !prev)}
                className={`w-10 h-5 rounded-full transition-colors relative ${deployOnPush ? 'bg-[#6C63FF]' : 'bg-[#252536]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${deployOnPush ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#141420] border border-[#222232]">
              <div>
                <div className="text-xs font-semibold text-white">Ephemeral Pull Request Workspaces</div>
                <div className="text-[10px] font-mono text-[#787896]">Bootstraps staging and database clones.</div>
              </div>
              <button
                onClick={() => setEphemeralPr(prev => !prev)}
                className={`w-10 h-5 rounded-full transition-colors relative ${ephemeralPr ? 'bg-[#6C63FF]' : 'bg-[#252536]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${ephemeralPr ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Turbo Cache Card */}
            <div className="p-3.5 rounded-xl bg-[#141420] border border-[#232336] text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-white font-medium">
                <Zap className="w-3.5 h-3.5 text-[#FF9E64]" />
                <span>Turbo Layer Caches Active</span>
              </div>
              <p className="text-[11px] text-[#7e7e9a] leading-relaxed">
                Shared container image caches saved <strong>~$2,411</strong> off the latest build cycle.
              </p>
            </div>

            {/* Webhook */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#6c6c88] pt-1">
              <span>Webhook ID: wh_8c998144</span>
              <button onClick={() => alert('Webhook secret re-generated.')} className="text-[#a0a0c0] hover:underline">
                Re-generate
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Live Container Deployment Stream (Terminal Box matching Screenshot 4) */}
      <div className="bg-[#0b0b12] border border-[#222234] rounded-2xl p-5 shadow-2xl terminal-card space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#1c1c2c]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-white font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#0DF5C4]" />
              Live Container Deployment Stream
            </span>
            <span className="text-[#8c8ca5] text-[11px]">Target: c8ff3e8</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={clearLogs}
              className="text-[#7e7e9a] hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => {
                const streamText = logs.map(l => `${l.time} ${l.tag} ${l.text}`).join('\n');
                navigator.clipboard.writeText(streamText);
                alert('Terminal log stream copied to clipboard!');
              }}
              className="text-[#7e7e9a] hover:text-white transition-colors"
            >
              Copy Stream
            </button>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0DF5C4]/10 border border-[#0DF5C4]/30 text-[#0DF5C4] text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0DF5C4] animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        {/* Real-Time Terminal Output */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2 select-text">
          {logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2">
              <span className="text-[#555570] shrink-0">{log.time}</span>
              <span className={`${log.color} shrink-0 font-semibold`}>{log.tag}</span>
              <span className="text-[#cfcfdf]">{log.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Bottom Row: Environment Variables Vault + Edge Topology (Pixel-Perfect to Screenshot 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Environment Variables Manager (8 Cols) */}
        <div className="lg:col-span-8 bg-[#101017] border border-[#20202e] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c1c2a]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6C63FF]" />
                Environment Variables
              </h3>
              <p className="text-[11px] text-[#7a7a98] font-mono mt-0.5">
                Encrypted runtime secrets and build-time arguments.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                onClick={toggleRevealAllEnvVars}
                className="px-2.5 py-1.5 rounded-lg bg-[#161622] hover:bg-[#202030] border border-[#272738] text-[#a4a4c6] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                {revealAllEnvVars ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealAllEnvVars ? 'Hide All' : 'Reveal All'}</span>
              </button>

              <button
                onClick={() => alert('Synced latest secret values from HashiCorp Vault.')}
                className="px-2.5 py-1.5 rounded-lg bg-[#161622] hover:bg-[#202030] border border-[#272738] text-[#a4a4c6] hover:text-white transition-colors"
              >
                Sync from Vault
              </button>

              <button
                onClick={() => setIsAddingEnv(true)}
                className="px-3 py-1.5 rounded-lg font-semibold text-[#09090e] flex items-center gap-1.5 shadow"
                style={{ backgroundColor: theme.primary }}
              >
                <Plus className="w-3.5 h-3.5 text-[#09090e]" />
                <span>Add Variable</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter variables by name, scope, or target environment..."
              value={envSearch}
              onChange={(e) => setEnvSearch(e.target.value)}
              className="w-full px-3 py-2 bg-[#151522] border border-[#242436] rounded-xl text-xs font-mono text-white placeholder-[#54546e] focus:outline-none focus:border-[#6C63FF]"
            />
          </div>

          {/* Variables Table */}
          <div className="space-y-2">
            {filteredEnvVars.map((item) => (
              <div
                key={item.id}
                className="bg-[#141420] border border-[#222232] rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white tracking-wide">{item.key}</div>
                  <div className="text-[10px] text-[#6c6c88]">Scope: {item.scope}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-[#0e0e16] px-3 py-1.5 rounded-lg border border-[#202030] text-[#a0a0be] min-w-[200px] text-right truncate">
                    {item.isRevealed ? item.value : '••••••••••••••••••••••••'}
                  </div>

                  <button
                    onClick={() => toggleRevealEnvVar(item.id)}
                    className="text-[#7e7e9a] hover:text-white p-1"
                    title={item.isRevealed ? 'Mask value' : 'Reveal value'}
                  >
                    {item.isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleCopyEnv(item.id, item.value)}
                    className="text-[#7e7e9a] hover:text-white p-1"
                    title="Copy value"
                  >
                    {copiedKey === item.id ? <Check className="w-3.5 h-3.5 text-[#0DF5C4]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => deleteEnvVar(item.id)}
                    className="text-[#7e7e9a] hover:text-[#f87171] p-1"
                    title="Delete variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for adding new env var */}
          {isAddingEnv && (
            <div className="p-4 bg-[#181826] border border-[#2b2b40] rounded-xl space-y-3">
              <div className="text-xs font-bold text-white font-mono">Create Environment Variable</div>
              <form onSubmit={handleCreateEnv} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="KEY_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="px-3 py-2 bg-[#12121d] border border-[#2d2d42] rounded-lg text-xs font-mono text-white focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="secret-value-or-token"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="px-3 py-2 bg-[#12121d] border border-[#2d2d42] rounded-lg text-xs font-mono text-white focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scope (Production)"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="w-full px-3 py-2 bg-[#12121d] border border-[#2d2d42] rounded-lg text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg font-semibold text-xs text-[#09090e] shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingEnv(false)}
                    className="px-2 py-2 rounded-lg bg-[#222234] text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Edge Topology Visualizer (4 Cols matching Screenshot 4) */}
        <div className="lg:col-span-4 bg-[#101017] border border-[#20202e] rounded-2xl p-5 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#1c1c2a]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0DF5C4]" />
              <h3 className="text-sm font-bold text-white">Edge Topology</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#0DF5C4]/15 text-[#0DF5C4] border border-[#0DF5C4]/30">
              32/32 POPs
            </span>
          </div>

          <p className="text-[#7a7a98] text-[11px] leading-relaxed">
            Active POP edge gateways distributing ingress traffic across primary and preview pools.
          </p>

          {/* Topology Node Graph */}
          <div className="h-36 bg-[#0a0a10] border border-[#1e1e2d] rounded-xl p-3 flex flex-col items-center justify-between relative overflow-hidden">
            {/* Top Root Node */}
            <div className="px-3 py-1 rounded bg-[#1c1c2e] border border-[#2d2d44] text-[#a0a0c4] text-[10px] z-10">
              INGRESS ROOT
            </div>

            {/* Middle Edge Gateways */}
            <div className="flex justify-around w-full z-10">
              <div className="px-2 py-0.5 rounded bg-[#0DF5C4]/15 border border-[#0DF5C4]/40 text-[#0DF5C4] text-[10px]">
                POP_US
              </div>
              <div className="px-2 py-0.5 rounded bg-[#0DF5C4]/15 border border-[#0DF5C4]/40 text-[#0DF5C4] text-[10px]">
                POP_EU
              </div>
              <div className="px-2 py-0.5 rounded bg-[#0DF5C4]/15 border border-[#0DF5C4]/40 text-[#0DF5C4] text-[10px]">
                POP_AP
              </div>
            </div>

            {/* Bottom Target */}
            <div 
              className="px-4 py-1 rounded text-[#09090e] font-bold text-[10px] z-10"
              style={{ backgroundColor: theme.primary }}
            >
              WARM DEVBOX MESH
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#2a2a44]" strokeWidth="1">
              <line x1="50%" y1="20%" x2="20%" y2="50%" className="stroke-[#0DF5C4]/50" />
              <line x1="50%" y1="20%" x2="50%" y2="50%" className="stroke-[#0DF5C4]/50" />
              <line x1="50%" y1="20%" x2="80%" y2="50%" className="stroke-[#0DF5C4]/50" />
              <line x1="20%" y1="50%" x2="50%" y2="85%" className="stroke-[#6C63FF]/50" />
              <line x1="50%" y1="50%" x2="50%" y2="85%" className="stroke-[#6C63FF]/50" />
              <line x1="80%" y1="50%" x2="50%" y2="85%" className="stroke-[#6C63FF]/50" />
            </svg>
          </div>

          <div className="space-y-1.5 pt-1 text-[11px] text-[#747492]">
            <div className="flex justify-between">
              <span>BGP Routing</span>
              <strong className="text-white">Tier 1 Autonomous Sys</strong>
            </div>
            <div className="flex justify-between">
              <span>SSL/TLS Termination</span>
              <strong className="text-white">TLS 1.3 - ChaCha20</strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#1a1a28]">
              <span className="text-[#0DF5C4]">● 396k Users Active</span>
              <span>0 Shards / 20k</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
