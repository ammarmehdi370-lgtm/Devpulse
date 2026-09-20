'use client';

import React, { useState, useEffect } from 'react';
import { useApp, PageType } from '../context/AppContext';
import { 
  Search, 
  Box, 
  GitFork, 
  Rocket, 
  Palette, 
  MessageSquare, 
  Plus, 
  Terminal, 
  Zap,
  ArrowRight
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    setPage, 
    triggerNewRelease,
    spinUpDevbox,
    theme 
  } = useApp();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isCommandPaletteOpen) setQuery('');
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    { id: 'goto-editor', label: 'Open Code Editor & Workbench', category: 'Navigation', icon: Box, action: () => setPage('editor') },
    { id: 'goto-remote', label: 'Join Remote Control Pairing Session', category: 'Navigation', icon: Terminal, action: () => setPage('remote-control') },
    { id: 'goto-ai', label: 'Open Full-Screen AI Assistant Studio', category: 'Navigation', icon: Zap, action: () => setPage('ai-studio') },
    { id: 'goto-pricing', label: 'View Pricing & Plans', category: 'Navigation', icon: Palette, action: () => setPage('pricing') },
    { id: 'goto-workspaces', label: 'Go to Workspaces', category: 'Navigation', icon: Box, action: () => setPage('workspaces') },
    { id: 'goto-repositories', label: 'Go to Repositories', category: 'Navigation', icon: GitFork, action: () => setPage('repositories') },
    { id: 'goto-deployments', label: 'Go to Deployments', category: 'Navigation', icon: Rocket, action: () => setPage('deployments') },
    { id: 'goto-theme', label: 'Open Theme Palette', category: 'Navigation', icon: Palette, action: () => setPage('theme') },
    { id: 'goto-chat', label: 'Open Team Chat', category: 'Navigation', icon: MessageSquare, action: () => setPage('chat') },
    { id: 'act-release', label: 'Trigger New Production Release', category: 'Actions', icon: Zap, action: () => { triggerNewRelease(); setPage('deployments'); } },
    { id: 'act-devbox', label: 'Spin Up Next.js 15 Devbox', category: 'Actions', icon: Plus, action: () => { spinUpDevbox('nextjs-quick-box', 'Next.js 15'); setPage('workspaces'); } }
  ];

  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4"
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div 
        className="bg-[#12121c] border border-[#27273a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[#202030] gap-3">
          <Search className="w-4 h-4 text-[#777794]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-[#585872] focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#1c1c2b] text-[10px] text-[#8e8ea6] border border-[#2e2e42]">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#6e6e88]">No matching commands</div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#1c1c2c] text-xs transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#181824] border border-[#2a2a3e] flex items-center justify-center text-[#9c9cb8] group-hover:text-white">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{cmd.label}</div>
                      <div className="text-[10px] text-[#63637e] font-mono">{cmd.category}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#585872] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
