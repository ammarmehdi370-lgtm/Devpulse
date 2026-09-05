import React, { useState, useEffect, useCallback } from 'react';
import { EditorHeader } from './components/EditorHeader';
import { FileTree } from './components/FileTree';
import { TabBar } from './components/TabBar';
import { CodeEditor } from './components/CodeEditor';
import { TerminalPanel } from './components/TerminalPanel';
import { NewItemModal } from './components/NewItemModal';
import { FileNode, EditorTab, ExecutionResponse } from '@devpulse/shared-types';

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Helper to map file extensions to Monaco language identifiers
  const getLanguage = (extension?: string): string => {
    switch (extension?.toLowerCase()) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'cpp':
      case 'c':
        return 'cpp';
      default:
        return 'plaintext';
    }
  };

  // Fetch directory tree from backend
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.tree);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Open or select a file
  const handleFileSelect = async (node: FileNode) => {
    if (node.type === 'directory') return;

    // Check if tab already exists
    const existingTab = tabs.find((t) => t.path === node.path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(node.path)}`);
      const data = await res.json();
      if (data.success) {
        const newTab: EditorTab = {
          id: node.path,
          name: node.name,
          path: node.path,
          language: getLanguage(node.extension),
          content: data.content,
          isDirty: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch (err) {
      console.error('Error reading file content:', err);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  // Handle code change in editor
  const handleEditorChange = (newContent: string) => {
    if (!activeTabId) return;

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, content: newContent, isDirty: true } : t))
    );
    setIsSaved(false);
  };

  // Save current active tab
  const handleSave = async () => {
    if (!activeTab) return;

    try {
      const res = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeTab.path, content: activeTab.content }),
      });
      const data = await res.json();
      if (data.success) {
        setTabs((prev) =>
          prev.map((t) => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
        );
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      console.error('Error saving file:', err);
    }
  };

  // Execute current code
  const handleRun = async () => {
    if (!activeTab) return;

    setIsRunning(true);
    setExecutionResult(null);

    // Save before executing
    if (activeTab.isDirty) {
      await handleSave();
    }

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: activeTab.language,
          code: activeTab.content,
          filePath: activeTab.path,
        }),
      });
      const result: ExecutionResponse = await res.json();
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        output: '',
        error: err.message || 'Execution error',
        executionTimeMs: 0,
        exitCode: 1,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Close tab
  const handleTabClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);

    if (activeTabId === id) {
      if (filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  // Create file/folder
  const handleCreateItem = async (name: string, type: 'file' | 'directory') => {
    try {
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name, type }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
        if (type === 'file') {
          handleFileSelect({
            id: name,
            name,
            path: name,
            type: 'file',
            extension: name.split('.').pop(),
          });
        }
      }
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  // Delete file/folder
  const handleDeleteItem = async (relPath: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(relPath)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Close tab if open
        const openTab = tabs.find((t) => t.path === relPath);
        if (openTab) {
          const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleTabClose(openTab.id, fakeEvent);
        }
        await fetchFiles();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="app-container">
      <EditorHeader
        activeTab={activeTab}
        onSave={handleSave}
        onRun={handleRun}
        isRunning={isRunning}
        isSaved={isSaved}
      />

      <div className="main-body">
        <FileTree
          files={files}
          activePath={activeTab?.path || null}
          onFileSelect={handleFileSelect}
          onNewFile={() => setIsModalOpen(true)}
          onRefresh={fetchFiles}
          onDelete={handleDeleteItem}
        />

        <div className="editor-workspace">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={setActiveTabId}
            onTabClose={handleTabClose}
          />

          <CodeEditor
            activeTab={activeTab}
            onChange={handleEditorChange}
            onSave={handleSave}
          />

          <TerminalPanel
            executionResult={executionResult}
            isRunning={isRunning}
            onClear={() => setExecutionResult(null)}
          />
        </div>
      </div>

      <NewItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateItem}
      />
    </div>
  );
};

export default App;
