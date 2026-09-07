import React from 'react';
import {
  GitBranch,
  CheckCircle2,
  Radio,
  Folder,
  Search,
  MessageSquare,
  Inbox,
  Filter,
  Code2
} from 'lucide-react';

interface StatusBarProps {
  cursorPos?: { line: number; col: number };
  activeFileName?: string;
  activeLanguage?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorPos = { line: 12, col: 24 },
  activeFileName = 'route.ts',
  activeLanguage = 'TypeScript / React',
}) => {
  return (
    <footer className="ide-status-bar" aria-label="Status Bar">
      {/* Left items */}
      <div className="status-bar-left">
        {/* Git branch */}
        <div className="status-item git-status-item">
          <GitBranch size={12} className="status-svg" />
          <span className="status-branch-name">main*</span>
        </div>

        {/* Errors & warnings */}
        <div className="status-item diagnostics-item">
          <CheckCircle2 size={12} className="status-check-green" />
          <span>0 errors, 0 warnings</span>
        </div>

        {/* Sync ping */}
        <div className="status-item sync-item">
          <Radio size={12} className="status-sync-icon" />
          <span>Synced 12ms</span>
        </div>

        {/* Footer Icon Quick Bar */}
        <div className="status-dock-subbar">
          <button className="status-icon-btn" title="Open Files">
            <Folder size={11} />
          </button>
          <button className="status-icon-btn" title="Search Workspace">
            <Search size={11} />
          </button>
          <button className="status-icon-btn status-badge-btn" title="Messages">
            <MessageSquare size={11} />
            <span className="mini-badge">2</span>
          </button>
          <button className="status-icon-btn" title="Inbox">
            <Inbox size={11} />
          </button>
          <button className="status-icon-btn" title="Filter / Config">
            <Filter size={11} />
          </button>
        </div>

        {/* Diagnostics Counts */}
        <div className="status-item text-dim-item">
          <span className="stat-count">0</span>
          <span>Errors</span>
        </div>

        <div className="status-item text-dim-item">
          <span className="stat-count">0</span>
          <span>Warnings</span>
        </div>

        <div className="status-divider">|</div>

        {/* Language & Encoding */}
        <div className="status-item text-dim-item">
          <span>TypeScript 5.4.2</span>
        </div>

        <div className="status-item text-dim-item">
          <span>UTF-8</span>
        </div>

        <div className="status-item text-dim-item">
          <span>LF</span>
        </div>

        <div className="status-item text-dim-item active-pos">
          <span>{`Ln ${cursorPos.line}, Col ${cursorPos.col}`}</span>
        </div>
      </div>

      {/* Right items */}
      <div className="status-bar-right">
        {/* Port 3000 Green Pill */}
        <div className="port-pill-badge" title="Local dev server running on port 3000">
          <span className="port-green-dot"></span>
          <span className="port-text">Port: 3000</span>
        </div>

        <div className="status-item text-dim-item">
          <span>LF</span>
        </div>

        <div className="status-item text-dim-item">
          <span>UTF-8</span>
        </div>

        <div className="status-item lang-mode-item">
          <Code2 size={12} className="status-lang-icon" />
          <span>{activeLanguage}</span>
        </div>
      </div>
    </footer>
  );
};
