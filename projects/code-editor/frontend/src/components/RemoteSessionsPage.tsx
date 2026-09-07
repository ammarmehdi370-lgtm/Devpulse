import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Plus,
  Wifi,
  WifiOff,
  Terminal,
  Globe,
  Lock,
  Unlock,
  Copy,
  Check,
  RefreshCcw,
  Trash2,
  Play,
  Square,
  ChevronRight,
  Cpu,
  HardDrive,
  Clock,
  Shield,
  Zap,
  Server,
  Share2,
  MoreHorizontal
} from 'lucide-react';

interface RemoteSession {
  id: string;
  name: string;
  type: 'ssh' | 'vnc' | 'rdp' | 'tunnel';
  host: string;
  port: number;
  user: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  latency?: number;
  region: string;
  uptime?: string;
  cpu?: number;
  mem?: number;
  encrypted: boolean;
  lastConnected?: string;
}

interface PortForward {
  id: string;
  localPort: number;
  remotePort: number;
  host: string;
  status: 'active' | 'stopped';
  label: string;
}

const INITIAL_SESSIONS: RemoteSession[] = [
  {
    id: 'sess-001',
    name: 'prod-us-east-4 · devbox',
    type: 'ssh',
    host: 'devbox-42a3f.us-east.codeplane.dev',
    port: 22,
    user: 'codeplane',
    status: 'connected',
    latency: 12,
    region: 'us-east-1',
    uptime: '3h 22m',
    cpu: 18,
    mem: 42,
    encrypted: true,
    lastConnected: '2m ago',
  },
  {
    id: 'sess-002',
    name: 'staging-eu-west · inference',
    type: 'ssh',
    host: 'inf-88bc.eu-west.codeplane.dev',
    port: 22,
    user: 'root',
    status: 'disconnected',
    latency: undefined,
    region: 'eu-west-2',
    uptime: undefined,
    cpu: 0,
    mem: 0,
    encrypted: true,
    lastConnected: '1d ago',
  },
  {
    id: 'sess-003',
    name: 'local · WireGuard tunnel',
    type: 'tunnel',
    host: '10.42.0.1',
    port: 51820,
    user: 'wg-peer',
    status: 'connected',
    latency: 3,
    region: 'local',
    uptime: '11h 08m',
    cpu: 2,
    mem: 6,
    encrypted: true,
    lastConnected: 'active',
  },
  {
    id: 'sess-004',
    name: 'remote-desktop · VNC',
    type: 'vnc',
    host: 'vnc-7f12.us-west.codeplane.dev',
    port: 5900,
    user: 'admin',
    status: 'error',
    latency: undefined,
    region: 'us-west-2',
    uptime: undefined,
    cpu: 0,
    mem: 0,
    encrypted: false,
    lastConnected: '5h ago',
  },
];

const INITIAL_PORT_FORWARDS: PortForward[] = [
  { id: 'pf-1', localPort: 3000, remotePort: 3000, host: 'devbox-42a3f', status: 'active', label: 'Next.js Dev Server' },
  { id: 'pf-2', localPort: 6379, remotePort: 6379, host: 'devbox-42a3f', status: 'active', label: 'Redis' },
  { id: 'pf-3', localPort: 8080, remotePort: 8080, host: 'devbox-42a3f', status: 'stopped', label: 'API Gateway' },
];

const TYPE_COLORS: Record<string, string> = {
  ssh: '#5856d6',
  vnc: '#fb923c',
  rdp: '#38bdf8',
  tunnel: '#00e599',
};

const TYPE_LABELS: Record<string, string> = {
  ssh: 'SSH',
  vnc: 'VNC',
  rdp: 'RDP',
  tunnel: 'TUNNEL',
};

export const RemoteSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<RemoteSession[]>(INITIAL_SESSIONS);
  const [portForwards, setPortForwards] = useState<PortForward[]>(INITIAL_PORT_FORWARDS);
  const [activeTab, setActiveTab] = useState<'sessions' | 'ports' | 'logs'>('sessions');
  const [selectedSession, setSelectedSession] = useState<string | null>('sess-001');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newHost, setNewHost] = useState('');
  const [newUser, setNewUser] = useState('codeplane');
  const [newPort, setNewPort] = useState('22');
  const [newType, setNewType] = useState<'ssh' | 'vnc' | 'rdp' | 'tunnel'>('ssh');
  const [newName, setNewName] = useState('');
  const [liveLogs, setLiveLogs] = useState<string[]>([
    '[12:01:14] [AUTH] mTLS handshake complete — peer: devbox-42a3f.us-east.codeplane.dev',
    '[12:01:15] [SSH] Session established on ed25519 key — latency: 12ms',
    '[12:04:30] [TUNNEL] WireGuard peer handshake OK (wg0, local: 10.42.0.2)',
    '[12:04:31] [PORT-FWD] 3000 → devbox-42a3f:3000 bound (Next.js Dev Server)',
    '[12:04:31] [PORT-FWD] 6379 → devbox-42a3f:6379 bound (Redis)',
    '[12:07:12] [SSH] Keep-alive ping → pong (11ms)',
  ]);

  // Simulate live telemetry updates for connected sessions
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev =>
        prev.map(sess => {
          if (sess.status === 'connected') {
            const cpuDelta = (Math.random() - 0.5) * 4;
            const memDelta = (Math.random() - 0.5) * 2;
            const latDelta = Math.round((Math.random() - 0.5) * 3);
            return {
              ...sess,
              cpu: Math.max(1, Math.min(99, (sess.cpu ?? 10) + cpuDelta)),
              mem: Math.max(1, Math.min(99, (sess.mem ?? 30) + memDelta)),
              latency: Math.max(1, Math.min(300, (sess.latency ?? 20) + latDelta)),
            };
          }
          return sess;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulate live log stream
  useEffect(() => {
    const LOG_EVENTS = [
      '[PORT-FWD] Heartbeat OK → 3000 active',
      '[SSH] Keep-alive ping → pong',
      '[TUNNEL] Rekeying WireGuard handshake',
      '[AUTH] Session refresh — JWT valid (exp: 55m)',
      '[INFO] CPU spike detected → 34% on devbox-42a3f',
      '[SSH] SFTP subsystem ready',
    ];
    const interval = setInterval(() => {
      const now = new Date();
      const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const event = LOG_EVENTS[Math.floor(Math.random() * LOG_EVENTS.length)];
      setLiveLogs(prev => [...prev.slice(-100), `[${ts}] ${event}`]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = (id: string) => {
    setConnectingId(id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'connecting' } : s));
    setTimeout(() => {
      setSessions(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, status: 'connected', latency: 14 + Math.floor(Math.random() * 20), uptime: '0m', cpu: 5, mem: 12, lastConnected: 'just now' }
            : s
        )
      );
      setConnectingId(null);
    }, 1800);
  };

  const handleDisconnect = (id: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, status: 'disconnected', latency: undefined, uptime: undefined, cpu: 0, mem: 0 }
          : s
      )
    );
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (selectedSession === id) setSelectedSession(null);
  };

  const handleCopyHost = (host: string, id: string) => {
    navigator.clipboard.writeText(host).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePortForward = (pfId: string) => {
    setPortForwards(prev =>
      prev.map(pf =>
        pf.id === pfId
          ? { ...pf, status: pf.status === 'active' ? 'stopped' : 'active' }
          : pf
      )
    );
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHost.trim()) return;
    const id = `sess-${Date.now()}`;
    const newSession: RemoteSession = {
      id,
      name: newName || `${newHost}:${newPort}`,
      type: newType,
      host: newHost.trim(),
      port: parseInt(newPort) || 22,
      user: newUser.trim() || 'root',
      status: 'disconnected',
      region: 'custom',
      encrypted: true,
      lastConnected: 'never',
      cpu: 0,
      mem: 0,
    };
    setSessions(prev => [...prev, newSession]);
    setShowNewSessionModal(false);
    setNewHost('');
    setNewUser('codeplane');
    setNewPort('22');
    setNewType('ssh');
    setNewName('');
  };

  const selected = sessions.find(s => s.id === selectedSession);

  return (
    <div className="remote-page">
      {/* Header */}
      <div className="remote-header">
        <div className="remote-header-left">
          <div className="remote-icon-badge">
            <Monitor size={14} />
          </div>
          <div>
            <h2 className="remote-title">Remote Control Sessions</h2>
            <p className="remote-subtitle">
              Manage SSH, VNC, RDP sessions and WireGuard tunnels across all your devboxes
            </p>
          </div>
        </div>
        <div className="remote-header-actions">
          <span className="sessions-count-badge">
            {sessions.filter(s => s.status === 'connected').length} connected
          </span>
          <button
            className="remote-new-btn"
            onClick={() => setShowNewSessionModal(true)}
          >
            <Plus size={13} />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="remote-tab-bar">
        {(['sessions', 'ports', 'logs'] as const).map(tab => (
          <button
            key={tab}
            className={`remote-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'sessions' && <Monitor size={12} />}
            {tab === 'ports' && <Share2 size={12} />}
            {tab === 'logs' && <Terminal size={12} />}
            <span>{tab === 'sessions' ? 'Sessions' : tab === 'ports' ? 'Port Forwards' : 'Live Logs'}</span>
          </button>
        ))}
      </div>

      {/* SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="remote-sessions-layout">
          {/* Left: Session List */}
          <div className="session-list-panel">
            {sessions.map(sess => (
              <div
                key={sess.id}
                className={`session-list-item ${selectedSession === sess.id ? 'selected' : ''} ${sess.status}`}
                onClick={() => setSelectedSession(sess.id)}
              >
                <div className="session-item-top">
                  <div className="session-type-dot" style={{ background: TYPE_COLORS[sess.type] }}>
                    {TYPE_LABELS[sess.type]}
                  </div>
                  <div
                    className={`session-status-indicator ${sess.status}`}
                    title={sess.status}
                  />
                </div>
                <div className="session-item-name">{sess.name}</div>
                <div className="session-item-host">{sess.host}:{sess.port}</div>
                <div className="session-item-meta">
                  <span className="region-tag">{sess.region}</span>
                  {sess.latency !== undefined && (
                    <span className="latency-tag">{Math.round(sess.latency)}ms</span>
                  )}
                </div>
              </div>
            ))}

            <button
              className="session-add-btn"
              onClick={() => setShowNewSessionModal(true)}
            >
              <Plus size={13} />
              <span>Add Session</span>
            </button>
          </div>

          {/* Right: Session Detail */}
          {selected ? (
            <div className="session-detail-panel">
              <div className="detail-header">
                <div className="detail-title-row">
                  <h3 className="detail-session-name">{selected.name}</h3>
                  <div className={`detail-status-badge ${selected.status}`}>
                    {selected.status === 'connected' && <Wifi size={11} />}
                    {selected.status === 'disconnected' && <WifiOff size={11} />}
                    {selected.status === 'connecting' && <RefreshCcw size={11} className="spin-anim" />}
                    {selected.status === 'error' && <WifiOff size={11} />}
                    <span>{selected.status}</span>
                  </div>
                </div>
                <div className="detail-actions-row">
                  {selected.status !== 'connected' ? (
                    <button
                      className="detail-connect-btn"
                      onClick={() => handleConnect(selected.id)}
                      disabled={selected.status === 'connecting'}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{selected.status === 'connecting' ? 'Connecting...' : 'Connect'}</span>
                    </button>
                  ) : (
                    <button
                      className="detail-disconnect-btn"
                      onClick={() => handleDisconnect(selected.id)}
                    >
                      <Square size={12} fill="currentColor" />
                      <span>Disconnect</span>
                    </button>
                  )}
                  <button
                    className="detail-icon-btn"
                    onClick={() => handleDeleteSession(selected.id)}
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Connection Info */}
              <div className="detail-section-label">CONNECTION INFO</div>
              <div className="detail-info-grid">
                <div className="detail-info-row">
                  <span className="info-key">Host</span>
                  <div className="info-val-row">
                    <code className="info-val-code">{selected.host}</code>
                    <button
                      className="copy-inline-btn"
                      onClick={() => handleCopyHost(selected.host, selected.id + '-host')}
                    >
                      {copiedId === selected.id + '-host' ? <Check size={11} color="#00e599" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
                <div className="detail-info-row">
                  <span className="info-key">Port</span>
                  <code className="info-val-code">{selected.port}</code>
                </div>
                <div className="detail-info-row">
                  <span className="info-key">User</span>
                  <code className="info-val-code">{selected.user}</code>
                </div>
                <div className="detail-info-row">
                  <span className="info-key">Protocol</span>
                  <span className="info-val-proto" style={{ color: TYPE_COLORS[selected.type] }}>
                    {TYPE_LABELS[selected.type]}
                  </span>
                </div>
                <div className="detail-info-row">
                  <span className="info-key">Region</span>
                  <span className="info-val-text">{selected.region}</span>
                </div>
                <div className="detail-info-row">
                  <span className="info-key">Encryption</span>
                  <div className="info-enc-row">
                    {selected.encrypted ? <Lock size={11} color="#00e599" /> : <Unlock size={11} color="#fb923c" />}
                    <span style={{ color: selected.encrypted ? '#00e599' : '#fb923c' }}>
                      {selected.encrypted ? 'mTLS / ed25519' : 'None'}
                    </span>
                  </div>
                </div>
                {selected.uptime && (
                  <div className="detail-info-row">
                    <span className="info-key">Uptime</span>
                    <span className="info-val-text">{selected.uptime}</span>
                  </div>
                )}
                {selected.lastConnected && (
                  <div className="detail-info-row">
                    <span className="info-key">Last Active</span>
                    <span className="info-val-text">{selected.lastConnected}</span>
                  </div>
                )}
              </div>

              {/* Live Telemetry (only for connected) */}
              {selected.status === 'connected' && selected.cpu !== undefined && (
                <>
                  <div className="detail-section-label">LIVE TELEMETRY</div>
                  <div className="detail-telemetry">
                    <div className="tele-item">
                      <div className="tele-icon-wrap">
                        <Cpu size={12} />
                      </div>
                      <div className="tele-content">
                        <div className="tele-row">
                          <span className="tele-label">CPU</span>
                          <span className="tele-value">{Math.round(selected.cpu ?? 0)}%</span>
                        </div>
                        <div className="tele-bar">
                          <div
                            className="tele-bar-fill cpu"
                            style={{ width: `${Math.round(selected.cpu ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="tele-item">
                      <div className="tele-icon-wrap">
                        <HardDrive size={12} />
                      </div>
                      <div className="tele-content">
                        <div className="tele-row">
                          <span className="tele-label">Memory</span>
                          <span className="tele-value">{Math.round(selected.mem ?? 0)}%</span>
                        </div>
                        <div className="tele-bar">
                          <div
                            className="tele-bar-fill mem"
                            style={{ width: `${Math.round(selected.mem ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="tele-item">
                      <div className="tele-icon-wrap">
                        <Zap size={12} />
                      </div>
                      <div className="tele-content">
                        <div className="tele-row">
                          <span className="tele-label">Latency</span>
                          <span className="tele-value" style={{ color: (selected.latency ?? 0) < 30 ? '#00e599' : '#fb923c' }}>
                            {Math.round(selected.latency ?? 0)}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SSH Command */}
              <div className="detail-section-label">QUICK CONNECT</div>
              <div className="ssh-command-box">
                <code className="ssh-cmd-text">
                  ssh {selected.user}@{selected.host} -p {selected.port}
                </code>
                <button
                  className="copy-inline-btn"
                  onClick={() => handleCopyHost(`ssh ${selected.user}@${selected.host} -p ${selected.port}`, selected.id + '-cmd')}
                >
                  {copiedId === selected.id + '-cmd' ? <Check size={11} color="#00e599" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="session-empty-detail">
              <Monitor size={32} style={{ opacity: 0.2 }} />
              <p>Select a session to view details</p>
            </div>
          )}
        </div>
      )}

      {/* PORT FORWARDS TAB */}
      {activeTab === 'ports' && (
        <div className="ports-panel">
          <div className="ports-header-row">
            <span className="ports-label">FORWARDED PORTS</span>
            <button
              className="ports-add-btn"
              onClick={() => {
                const local = prompt('Local port:');
                const remote = prompt('Remote port:');
                if (local && remote) {
                  setPortForwards(prev => [
                    ...prev,
                    {
                      id: `pf-${Date.now()}`,
                      localPort: parseInt(local),
                      remotePort: parseInt(remote),
                      host: sessions.find(s => s.status === 'connected')?.host || 'devbox',
                      status: 'stopped',
                      label: `Port ${local}`,
                    },
                  ]);
                }
              }}
            >
              <Plus size={12} />
              <span>Add Forward</span>
            </button>
          </div>

          <div className="ports-table">
            <div className="ports-table-head">
              <span>Local Port</span>
              <span>Remote Port</span>
              <span>Host</span>
              <span>Label</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {portForwards.map(pf => (
              <div key={pf.id} className="ports-table-row">
                <span className="port-num">:{pf.localPort}</span>
                <span className="port-num">:{pf.remotePort}</span>
                <span className="port-host">{pf.host}</span>
                <span className="port-label">{pf.label}</span>
                <span>
                  <span className={`port-status-badge ${pf.status}`}>
                    {pf.status}
                  </span>
                </span>
                <div className="port-actions">
                  <button
                    className="port-toggle-btn"
                    onClick={() => handleTogglePortForward(pf.id)}
                    title={pf.status === 'active' ? 'Stop' : 'Start'}
                  >
                    {pf.status === 'active' ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                  </button>
                  <button
                    className="port-toggle-btn danger"
                    onClick={() => setPortForwards(prev => prev.filter(p => p.id !== pf.id))}
                    title="Remove"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ports-info-note">
            <Globe size={12} />
            <span>
              Port forwards create encrypted tunnels from your local machine to the remote devbox.
              Active forwards are accessible at <code>localhost:PORT</code>.
            </span>
          </div>
        </div>
      )}

      {/* LIVE LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="logs-panel">
          <div className="logs-header-row">
            <div className="logs-header-left">
              <div className="live-indicator">
                <span className="live-dot" />
                <span>LIVE</span>
              </div>
              <span className="logs-label">Session Event Stream</span>
            </div>
            <button
              className="logs-clear-btn"
              onClick={() => setLiveLogs([])}
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>
          <div className="logs-output">
            {liveLogs.map((line, i) => {
              const isError = line.includes('[ERROR]');
              const isWarn = line.includes('[WARN]');
              const isOk = line.includes('OK') || line.includes('complete') || line.includes('bound') || line.includes('valid');
              const color = isError ? '#f87171' : isWarn ? '#fb923c' : isOk ? '#00e599' : '#9ea3b7';
              return (
                <div key={i} className="log-line" style={{ color }}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW SESSION MODAL */}
      {showNewSessionModal && (
        <div className="modal-overlay" onClick={() => setShowNewSessionModal(false)}>
          <div className="remote-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Remote Session</h3>
              <button className="modal-close-btn" onClick={() => setShowNewSessionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSession} className="remote-form">
              <div className="form-row">
                <label className="form-label">SESSION NAME</label>
                <input
                  className="form-input"
                  placeholder="e.g. prod-devbox-01"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label className="form-label">PROTOCOL</label>
                <div className="type-selector">
                  {(['ssh', 'vnc', 'rdp', 'tunnel'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`type-btn ${newType === t ? 'active' : ''}`}
                      style={newType === t ? { borderColor: TYPE_COLORS[t], color: TYPE_COLORS[t] } : {}}
                      onClick={() => setNewType(t)}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">HOST / IP</label>
                <input
                  className="form-input"
                  placeholder="devbox.us-east.codeplane.dev"
                  value={newHost}
                  onChange={e => setNewHost(e.target.value)}
                  required
                />
              </div>
              <div className="form-row-split">
                <div className="form-row">
                  <label className="form-label">USER</label>
                  <input
                    className="form-input"
                    placeholder="codeplane"
                    value={newUser}
                    onChange={e => setNewUser(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">PORT</label>
                  <input
                    className="form-input"
                    placeholder="22"
                    type="number"
                    value={newPort}
                    onChange={e => setNewPort(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="form-cancel-btn"
                  onClick={() => setShowNewSessionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="form-submit-btn">
                  <Plus size={12} />
                  <span>Create Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
