import React from 'react';
import { Terminal, Trash2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ExecutionResponse } from '@devpulse/shared-types';

interface TerminalPanelProps {
  executionResult: ExecutionResponse | null;
  isRunning: boolean;
  onClear: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  executionResult,
  isRunning,
  onClear,
}) => {
  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <Terminal size={14} color="var(--accent-blue)" />
          <span>Output & Terminal Console</span>
          {isRunning && (
            <span style={{ fontSize: '11px', color: 'var(--accent-amber)', marginLeft: '8px' }}>
              ⚡ Executing script...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {executionResult && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <Clock size={12} color="var(--text-muted)" />
                <span>{executionResult.executionTimeMs} ms</span>
              </div>

              <span
                className={`status-tag ${
                  executionResult.success ? 'status-success' : 'status-error'
                }`}
              >
                {executionResult.success ? (
                  <>
                    <CheckCircle2 size={12} /> Exit 0
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Exit {executionResult.exitCode || 1}
                  </>
                )}
              </span>
            </>
          )}

          <button className="icon-btn" onClick={onClear} title="Clear Terminal Output">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="terminal-body">
        {isRunning ? (
          <div style={{ color: 'var(--accent-amber)' }}>
            [Executing code runner process...]
          </div>
        ) : executionResult ? (
          <div>
            {executionResult.output}
            {executionResult.error && (
              <div style={{ color: 'var(--accent-red)', marginTop: '8px' }}>
                {executionResult.error}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click "Run Code" in the top bar to see output log here...
          </div>
        )}
      </div>
    </div>
  );
};
