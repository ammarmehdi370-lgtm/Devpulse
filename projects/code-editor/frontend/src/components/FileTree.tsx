import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { FileNode } from '@devpulse/shared-types';

interface FileTreeProps {
  files: FileNode[];
  activePath: string | null;
  onFileSelect: (file: FileNode) => void;
  onNewFile: () => void;
  onRefresh: () => void;
  onDelete: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activePath,
  onFileSelect,
  onNewFile,
  onRefresh,
  onDelete,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Explorer</span>
        <div className="sidebar-actions">
          <button className="icon-btn" onClick={onNewFile} title="New File or Folder">
            <Plus size={15} />
          </button>
          <button className="icon-btn" onClick={onRefresh} title="Refresh Workspace">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="file-tree-container">
        {files.length === 0 ? (
          <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            No files in workspace. Click '+' to create one.
          </div>
        ) : (
          files.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              activePath={activePath}
              onFileSelect={onFileSelect}
              onDelete={onDelete}
              level={0}
            />
          ))
        )}
      </div>
    </aside>
  );
};

interface TreeItemProps {
  node: FileNode;
  activePath: string | null;
  onFileSelect: (file: FileNode) => void;
  onDelete: (path: string) => void;
  level: number;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  activePath,
  onFileSelect,
  onDelete,
  level,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const isDirectory = node.type === 'directory';
  const isActive = activePath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${node.name}?`)) {
      onDelete(node.path);
    }
  };

  const renderIcon = () => {
    if (isDirectory) {
      return isOpen ? (
        <FolderOpen size={16} color="var(--accent-blue)" />
      ) : (
        <Folder size={16} color="var(--accent-blue)" />
      );
    }

    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode size={16} color="var(--accent-amber)" />;
      case 'py':
        return <FileCode size={16} color="var(--accent-purple)" />;
      case 'html':
      case 'css':
        return <FileCode size={16} color="#e34c26" />;
      case 'json':
        return <FileJson size={16} color="#7ee787" />;
      default:
        return <FileText size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div>
      <div
        className={`tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${12 + level * 14}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span style={{ display: 'flex', alignItems: 'center', marginRight: '2px' }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {renderIcon()}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        <button
          className="icon-btn delete-btn"
          style={{ opacity: 0.6 }}
          onClick={handleDelete}
          title="Delete file"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              activePath={activePath}
              onFileSelect={onFileSelect}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
