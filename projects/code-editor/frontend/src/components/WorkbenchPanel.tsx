import React, { useState, useEffect } from "react";
import {
  Cloud,
  Database,
  MoreHorizontal,
  Settings,
  MessageSquare,
  HardDrive,
  Layers,
  Monitor,
  Code2,
  Cpu,
  DollarSign,
  PanelLeftClose,
} from "lucide-react";

interface WorkbenchPanelProps {
  activeItem?: string;
  onSelectItem?: (item: string) => void;
  onToggle?: () => void;
}

export const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({
  activeItem = "Editor",
  onSelectItem,
  onToggle,
}) => {
  const handleSelect = (name: string) => {
    if (onSelectItem) onSelectItem(name);
  };

  // Live telemetry state
  const [cpuUsage, setCpuUsage] = useState(18.4);
  const [memUsed, setMemUsed] = useState(1.42);
  const [memTotal] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.5) * 5;
        return Math.max(2, Math.min(95, prev + delta));
      });
      setMemUsed((prev) => {
        const delta = (Math.random() - 0.5) * 0.15;
        return Math.max(0.4, Math.min(memTotal - 0.1, prev + delta));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [memTotal]);

  const memPercent = (memUsed / memTotal) * 100;

  return (
    <aside className="workbench-sidebar" aria-label="Workbench Navigation">
      {/* Platform Header */}
      <div className="workbench-header">
        <span className="workbench-title">PLATFORM</span>
        <button className="workbench-more-btn" aria-label="More options">
          <MoreHorizontal size={14} />
        </button>
        <button
          className="workbench-more-btn"
          aria-label="Close workbench"
          title="Close workbench"
          onClick={onToggle}
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Nav List */}
      <nav className="workbench-nav">
        {/* 1. Workspaces */}
        <button
          className={`workbench-item ${activeItem === "Workspaces" ? "active" : ""}`}
          onClick={() => handleSelect("Workspaces")}
        >
          <div className="item-left">
            <Layers size={14} className="nav-svg-icon" />
            <span className="item-label">Workspaces</span>
          </div>
        </button>

        {/* 2. Repositories */}
        <button
          className={`workbench-item ${activeItem === "Repositories" ? "active" : ""}`}
          onClick={() => handleSelect("Repositories")}
        >
          <div className="item-left">
            <HardDrive size={14} className="nav-svg-icon" />
            <span className="item-label">Repositories</span>
          </div>
          <span className="git-branch-badge">6 active</span>
        </button>

        {/* 3. Editor */}
        <button
          className={`workbench-item ${activeItem === "Editor" ? "active" : ""}`}
          onClick={() => handleSelect("Editor")}
        >
          <div className="item-left">
            <Code2 size={14} className="nav-svg-icon" />
            <span className="item-label">Editor</span>
          </div>
          <span className="item-shortcut">⌥1</span>
        </button>

        {/* 4. Deployments */}
        <button
          className={`workbench-item ${activeItem === "Deployments" ? "active" : ""}`}
          onClick={() => handleSelect("Deployments")}
        >
          <div className="item-left">
            <Cloud size={14} className="nav-svg-icon" />
            <span className="item-label">Deployments</span>
          </div>
          <span className="deploy-status-dot"></span>
        </button>

        {/* 5. Remote Sessions */}
        <button
          className={`workbench-item ${activeItem === "Remote Sessions" ? "active" : ""}`}
          onClick={() => handleSelect("Remote Sessions")}
        >
          <div className="item-left">
            <Monitor size={14} className="nav-svg-icon" />
            <span className="item-label">Remote Sessions</span>
          </div>
          <span className="remote-online-dot" title="1 connected"></span>
        </button>

        {/* 6. Messaging / Chat */}
        <button
          className={`workbench-item ${activeItem === "Messaging / Chat" ? "active" : ""}`}
          onClick={() => handleSelect("Messaging / Chat")}
        >
          <div className="item-left">
            <MessageSquare size={14} className="nav-svg-icon" />
            <span className="item-label">Messaging / Chat</span>
          </div>
          <span className="dock-badge-inline">2</span>
        </button>

        {/* 7. Databases */}
        <button
          className={`workbench-item ${activeItem === "Databases" ? "active" : ""}`}
          onClick={() => handleSelect("Databases")}
        >
          <div className="item-left">
            <Database size={14} className="nav-svg-icon" />
            <span className="item-label">Databases</span>
          </div>
        </button>

        {/* 8. Pricing */}
        <button
          className={`workbench-item ${activeItem === "Pricing" ? "active" : ""}`}
          onClick={() => handleSelect("Pricing")}
        >
          <div className="item-left">
            <DollarSign size={14} className="nav-svg-icon" />
            <span className="item-label">Pricing</span>
          </div>
        </button>
      </nav>

      <div className="workbench-spacer" />

      {/* Live Telemetry Monitor */}
      <div className="telemetry-section">
        <div className="telemetry-title">TELEMETRY</div>

        <div className="telemetry-row">
          <div className="telemetry-labels">
            <span className="metric-name">CPU (8 Cores)</span>
            <span className="metric-val">{cpuUsage.toFixed(1)}%</span>
          </div>
          <div className="metric-bar-track">
            <div
              className="metric-bar-fill"
              style={{
                width: `${cpuUsage}%`,
                background: cpuUsage > 70 ? "#fb923c" : undefined,
              }}
            />
          </div>
        </div>

        <div className="telemetry-row">
          <div className="telemetry-labels">
            <span className="metric-name">Memory</span>
            <span className="metric-val">
              {memUsed.toFixed(2)} / {memTotal} GB
            </span>
          </div>
          <div className="metric-bar-track">
            <div
              className="metric-bar-fill"
              style={{
                width: `${memPercent}%`,
                background: memPercent > 80 ? "#fb923c" : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {/* System Footer */}
      <div className="workbench-footer">
        <div className="system-label-text">SYSTEM</div>
        <button
          className="settings-row-btn"
          onClick={() => handleSelect("Settings")}
        >
          <Settings size={13} className="settings-icon" />
          <span>Settings</span>
        </button>

        <div className="memory-usage-bottom">
          <div className="mem-row">
            <span>Memory usage</span>
            <strong>{Math.round(memPercent)}%</strong>
          </div>
          <div className="mem-track">
            <div className="mem-fill" style={{ width: `${memPercent}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
};
