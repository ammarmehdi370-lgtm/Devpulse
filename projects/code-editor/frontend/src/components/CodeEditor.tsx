import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { EditorTab } from '@devpulse/shared-types';

interface CodeEditorProps {
  activeTab: EditorTab | null;
  onChange: (value: string) => void;
  onSave: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  activeTab,
  onChange,
  onSave,
}) => {
  if (!activeTab) {
    return (
      <div
        className="monaco-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        <div style={{ marginBottom: '8px', opacity: 0.5 }}>⚡ DevPulse Code Studio</div>
        <div>Select a file from the explorer on the left or create a new file.</div>
      </div>
    );
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Add Ctrl+S / Cmd+S save command shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });
  };

  return (
    <div className="monaco-wrapper">
      <Editor
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        theme="vs-dark"
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12 },
          lineNumbersMinChars: 3,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'all',
          tabSize: 2,
        }}
      />
    </div>
  );
};
