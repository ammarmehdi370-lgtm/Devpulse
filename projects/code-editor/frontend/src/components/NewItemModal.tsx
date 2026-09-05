import React, { useState } from 'react';
import { X, FilePlus, FolderPlus } from 'lucide-react';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: 'file' | 'directory') => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'file' | 'directory'>('file');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), type);
    setName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Create New Item</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className={`btn-secondary ${type === 'file' ? 'active' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                borderColor: type === 'file' ? 'var(--accent-blue)' : undefined,
                background: type === 'file' ? 'rgba(88, 166, 255, 0.15)' : undefined,
              }}
              onClick={() => setType('file')}
            >
              <FilePlus size={14} /> File
            </button>
            <button
              type="button"
              className={`btn-secondary ${type === 'directory' ? 'active' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                borderColor: type === 'directory' ? 'var(--accent-blue)' : undefined,
                background: type === 'directory' ? 'rgba(88, 166, 255, 0.15)' : undefined,
              }}
              onClick={() => setType('directory')}
            >
              <FolderPlus size={14} /> Folder
            </button>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              {type === 'file' ? 'File Name (e.g. script.js, index.html)' : 'Folder Name'}
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'file' ? 'script.js' : 'components'}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Create {type === 'file' ? 'File' : 'Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
