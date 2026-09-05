import React from 'react';
import { Play, Save, Code, Layers, Check, Loader2 } from 'lucide-react';
import { EditorTab } from '@devpulse/shared-types';

interface EditorHeaderProps {
  activeTab: EditorTab | null;
  onSave: () => void;
  onRun: () => void;
  isRunning: boolean;
  isSaved: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  activeTab,
  onSave,
  onRun,
  isRunning,
  isSaved,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Code size={18} />
        </div>
        <span className="brand-title">DevPulse Code Studio</span>
        <span className="badge-monorepo">
          <Layers size={10} style={{ display: 'inline', marginRight: '4px' }} />
          Monorepo Workspace
        </span>
      </div>

      <div className="action-bar">
        {activeTab && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '10px' }}>
            <span style={{ color: 'var(--text-bright)', fontWeight: 500 }}>{activeTab.name}</span>
            <span style={{ marginLeft: '6px', opacity: 0.7 }}>({activeTab.language})</span>
          </div>
        )}

        <button
          className="btn-secondary"
          onClick={onSave}
          disabled={!activeTab || !activeTab.isDirty}
          title="Save file (Ctrl+S)"
        >
          {isSaved ? <Check size={14} color="#3fb950" /> : <Save size={14} />}
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          className="btn-primary"
          onClick={onRun}
          disabled={!activeTab || isRunning}
          title="Execute code in Node/Python runner"
        >
          {isRunning ? <Loader2 size={14} className="spin-icon" /> : <Play size={14} />}
          <span>{isRunning ? 'Running...' : 'Run Code'}</span>
        </button>
      </div>
    </header>
  );
};
