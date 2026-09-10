import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  Cloud,
  Code2,
  Command,
  FileCode2,
  GitBranch,
  History,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  TerminalSquare,
  UserRound,
} from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import { EditorHeader } from './components/EditorHeader';
import { FileTree } from './components/FileTree';
import { NewItemModal } from './components/NewItemModal';
import { TabBar } from './components/TabBar';
import { TerminalPanel } from './components/TerminalPanel';
import { EditorTab, ExecutionResponse, FileNode } from '@devpulse/shared-types';

const API = '/api';

const languageFromExtension: Record<string, string> = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
};

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [result, setResult] = useState<ExecutionResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('devpulse_theme') as 'dark' | 'light' | null) || 'dark');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('devpulse_token'));
  const [verificationMessage, setVerificationMessage] = useState('Verifying your email...');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) || null, [tabs, activeTabId]);

  const loadFiles = async () => {
    const response = await fetch(`${API}/files`);
    const data = await response.json();
    if (data.success) setFiles(data.tree);
  };

  useEffect(() => { void loadFiles(); }, []);

  useEffect(() => { localStorage.setItem('devpulse_theme', theme); }, [theme]);

  useEffect(() => {
    if (window.location.pathname !== '/verify-email') return;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setVerificationMessage('This verification link is missing its token.');
      return;
    }
    fetch(`${API}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => {
        setVerificationSuccess(ok);
        setVerificationMessage(data.message || data.error || 'Unable to verify this email.');
      })
      .catch(() => setVerificationMessage('Unable to reach the authentication server.'));
  }, []);

  const selectFile = async (file: FileNode) => {
    const existing = tabs.find((tab) => tab.path === file.path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const response = await fetch(`${API}/files/content?path=${encodeURIComponent(file.path)}`);
    const data = await response.json();
    if (!data.success) return;
    const tab: EditorTab = {
      id: file.path,
      name: file.name,
      path: file.path,
      language: languageFromExtension[file.extension || ''] || 'plaintext',
      content: data.content,
      isDirty: false,
    };
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
  };

  const updateContent = (content: string) => {
    if (!activeTabId) return;
    setTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, content, isDirty: true } : tab));
  };

  const saveFile = async () => {
    if (!activeTab) return;
    await fetch(`${API}/files/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
    });
    setTabs((current) => current.map((tab) => tab.id === activeTab.id ? { ...tab, isDirty: false } : tab));
  };

  const runCode = async () => {
    if (!activeTab) return;
    setIsRunning(true);
    setResult(null);
    try {
      const response = await fetch(`${API}/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: activeTab.language, code: activeTab.content, filePath: activeTab.path }),
      });
      setResult(await response.json());
      setIsTerminalOpen(true);
    } finally { setIsRunning(false); }
  };

  const closeTab = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining[remaining.length - 1]?.id || null);
  };

  const createItem = async (name: string, type: 'file' | 'directory') => {
    await fetch(`${API}/files/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: name, type }),
    });
    await loadFiles();
  };

  const deleteItem = async (path: string) => {
    await fetch(`${API}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    setTabs((current) => current.filter((tab) => tab.path !== path));
    if (activeTabId === path) setActiveTabId(null);
    await loadFiles();
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthMessage('');
    const response = await fetch(`${API}/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAuthMessage(data.error || 'Authentication failed.');
      return;
    }
    if (authMode === 'login' && data.token) {
      localStorage.setItem('devpulse_token', data.token);
      setAuthToken(data.token);
      setIsAuthOpen(false);
    } else {
      setAuthMessage(data.message || 'Check your email to continue.');
    }
  };

  if (window.location.pathname === '/verify-email') {
    return <VerificationPage message={verificationMessage} success={verificationSuccess} onContinue={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }} />;
  }

  return (
    <main className={`ide-shell theme-${theme}`}>
      <header className="ide-topbar">
        <div className="topbar-brand"><div className="brand-mark"><Code2 size={16} /></div><strong>Code Studio</strong></div>
        <div className="workspace-switcher"><Cloud size={14} /><span>Workspace</span><ChevronDown size={13} /></div>
        <div className="topbar-actions"><button className="topbar-icon" title="Command palette"><Command size={15} /></button><button className="topbar-icon" onClick={() => setIsThemeOpen((open) => !open)} title="Theme settings"><Settings size={15} /></button><button className={`avatar ${authToken ? 'signed-in' : ''}`} onClick={() => setIsAuthOpen((open) => !open)} title={authToken ? 'Account signed in' : 'Sign in'}><UserRound size={14} /></button></div>
      </header>

      <div className="ide-body">
        <nav className="activity-rail" aria-label="Activity bar">
          <button className="rail-button active" title="Explorer"><PanelLeft size={17} /></button>
          <button className="rail-button" title="Search"><Search size={17} /></button>
          <button className="rail-button" title="Source control"><GitBranch size={17} /></button>
          <button className="rail-button" title="Run and debug"><Play size={17} /></button>
          <button className="rail-button" title="Extensions"><Sparkles size={17} /></button>
          <div className="rail-spacer" />
          <button className="rail-button" onClick={() => setIsAuthOpen((open) => !open)} title={authToken ? 'Account signed in' : 'Sign in'}><UserRound size={17} /></button>
          <button className="rail-button" onClick={() => setIsThemeOpen((open) => !open)} title="Theme settings"><Settings size={17} /></button>
        </nav>

        <section className="explorer-pane">
          <div className="pane-heading"><span>EXPLORER</span><div><button className="pane-icon" onClick={() => setIsNewItemOpen(true)} title="New file"><Plus size={14} /></button><button className="pane-icon" onClick={() => void loadFiles()} title="Refresh"><History size={13} /></button></div></div>
          <div className="workspace-heading"><ChevronDown size={13} /><span>WORKSPACE</span></div>
          <FileTree files={files} activePath={activeTab?.path || null} onFileSelect={selectFile} onNewFile={() => setIsNewItemOpen(true)} onRefresh={() => void loadFiles()} onDelete={deleteItem} />
          <div className="explorer-footer"><div><GitBranch size={12} /> Workspace files</div><div>{files.length} {files.length === 1 ? 'item' : 'items'}</div></div>
        </section>

        <section className="editor-area">
          <EditorHeader activeTab={activeTab} onSave={() => void saveFile()} onRun={() => void runCode()} isRunning={isRunning} isSaved={Boolean(activeTab && !activeTab.isDirty)} />
          <TabBar tabs={tabs} activeTabId={activeTabId} onTabSelect={setActiveTabId} onTabClose={closeTab} />
          <div className="breadcrumb"><FileCode2 size={13} /><span>workspace</span>{activeTab && <><span>/</span><strong>{activeTab.name}</strong></>}<span className="breadcrumb-spacer" /><button className="editor-tool" onClick={() => setIsTerminalOpen((open) => !open)} title="Toggle terminal"><TerminalSquare size={14} /></button></div>
          <div className="editor-and-assistant assistant-hidden">
            <div className="editor-canvas"><CodeEditor activeTab={activeTab} onChange={updateContent} onSave={() => void saveFile()} /></div>
          </div>
          {isTerminalOpen && <TerminalPanel executionResult={result} isRunning={isRunning} onClear={() => setResult(null)} />}
        </section>
      </div>

      <footer className="ide-statusbar"><div><GitBranch size={12} /> Workspace</div><div>{tabs.filter((tab) => tab.isDirty).length} unsaved</div><div className="status-spacer" /><div>{activeTab?.language || 'Plain Text'}</div><div>UTF-8</div></footer>
      <NewItemModal isOpen={isNewItemOpen} onClose={() => setIsNewItemOpen(false)} onCreate={createItem} />
      {isThemeOpen && <div className="theme-popover"><strong>Theme</strong><button className={theme === 'dark' ? 'selected' : ''} onClick={() => { setTheme('dark'); setIsThemeOpen(false); }}>Dark</button><button className={theme === 'light' ? 'selected' : ''} onClick={() => { setTheme('light'); setIsThemeOpen(false); }}>Light</button></div>}
      {isAuthOpen && <div className="auth-popover"><div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button></div><form onSubmit={submitAuth}><input className="input-field" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Email" required /><input className="input-field" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Password" minLength={8} required /><button className="btn-primary auth-submit" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button></form>{authMessage && <p className="auth-message">{authMessage}</p>}</div>}
    </main>
  );
};

const VerificationPage: React.FC<{ message: string; success: boolean; onContinue: () => void }> = ({ message, success, onContinue }) => (
  <main className="verification-page"><div className="verification-card"><div className={`verification-mark ${success ? 'success' : ''}`}>{success ? '✓' : '...'}</div><h1>{success ? 'Email verified' : 'Verify email'}</h1><p>{message}</p>{success && <button className="btn-primary" onClick={onContinue}>Continue to editor</button>}</div></main>
);

export default App;
