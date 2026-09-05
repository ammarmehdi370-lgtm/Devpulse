import React from 'react';
import { X, FileCode } from 'lucide-react';
import { EditorTab } from '@devpulse/shared-types';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string, e: React.MouseEvent) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}) => {
  if (tabs.length === 0) return null;

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabSelect(tab.id)}
          >
            <FileCode size={14} color={isActive ? 'var(--accent-blue)' : 'var(--text-muted)'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.name}
            </span>
            {tab.isDirty && <span className="dirty-dot" title="Unsaved changes" />}
            <button
              className="icon-btn"
              style={{ marginLeft: 'auto', padding: '2px' }}
              onClick={(e) => onTabClose(tab.id, e)}
              title="Close tab"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
