"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useRef, useState } from "react";
import { AiAssistantPanel, registerAiAutocomplete } from "@/components/ai/AiAssistantPanel";

type Tab = { name: string; language: string; value: string };

const initialTabs: Tab[] = [
  { name: "index.ts", language: "typescript", value: "export function greet(name: string) {\n  return `Hello, ${name}`;\n}\n\nconsole.log(greet(\"DevPulse\"));\n" },
  { name: "README.md", language: "markdown", value: "# DevPulse\n\nA calm place to build software with context-aware AI.\n" },
  { name: "styles.css", language: "css", value: ".workspace {\n  color: #e7e5ff;\n}\n" },
];

export function CodeWorkspace() {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTab, setActiveTab] = useState(0);
  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const current = tabs[activeTab];

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditor(editor);
    editor.addAction({ id: "devpulse.save", label: "Save file", keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS], run: () => { setTabs((items) => items.map((tab, index) => index === activeTab ? { ...tab, value: editor.getValue() } : tab)); } });
    registerAiAutocomplete(editor, monaco);
    editor.focus();
  };

  function updateValue(value: string | undefined) {
    setTabs((items) => items.map((tab, index) => index === activeTab ? { ...tab, value: value ?? "" } : tab));
  }

  return (
    <main className="codeplane-shell">
      <header className="topbar"><div className="brand-mark"><span>DP</span><strong>DevPulse</strong></div><div className="topbar__workspace">WORKSPACE <b>Acme Engineering</b></div><div className="topbar__actions"><span className="branch">⌘ main</span><button type="button">Share</button><div className="avatar">AK</div></div></header>
      <section className="workspace-grid">
        <aside className="file-sidebar"><div className="panel-title"><span>EXPLORER</span><button type="button" aria-label="More explorer actions">•••</button></div><div className="project-name"><span>⌄</span> DEVPULSE</div><div className="file-list"><button className="folder" type="button"><span>⌄</span> src</button>{tabs.map((tab, index) => <button className={`file ${index === activeTab ? "is-active" : ""}`} key={tab.name} type="button" onClick={() => setActiveTab(index)}><span className={`file-icon file-icon--${tab.language}`}>{tab.language === "typescript" ? "TS" : tab.language === "css" ? "#" : "M"}</span>{tab.name}</button>)}</div><div className="sidebar-footer"><span>⌁</span> OUTLINE</div></aside>
        <section className="editor-area"><div className="tabs">{tabs.map((tab, index) => <button className={`editor-tab ${index === activeTab ? "is-active" : ""}`} key={tab.name} type="button" onClick={() => setActiveTab(index)}><span className="file-icon file-icon--small">{tab.language === "typescript" ? "TS" : tab.language === "css" ? "#" : "M"}</span>{tab.name}{index === activeTab && <i />}</button>)}<button className="new-tab" type="button" aria-label="New tab">+</button></div><div className="breadcrumb">src <span>/</span> {current.name}</div><div className="monaco-wrap"><Editor theme="vs-dark" language={current.language} value={current.value} onChange={updateValue} onMount={handleMount} options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 14, lineHeight: 22, padding: { top: 16 }, renderLineHighlight: "all", smoothScrolling: true, cursorBlinking: "smooth", inlineSuggest: { enabled: true }, suggest: { showMethods: true, showFunctions: true }, folding: true, wordWrap: "on" }} /></div><footer className="statusbar"><span>Ln {editorRef.current?.getPosition()?.lineNumber ?? 1}, Col {editorRef.current?.getPosition()?.column ?? 1}</span><span>{current.language}</span><span>UTF-8</span><span>⌘ main</span><span className="status-online"><i /> Connected</span></footer></section>
        <AiAssistantPanel editor={editor} fileName={current.name} language={current.language} onApplyCode={(code) => { const editor = editorRef.current; const selection = editor?.getSelection(); if (editor && selection) editor.executeEdits("devpulse-ai", [{ range: selection, text: code, forceMoveMarkers: true }]); }} />
      </section>
    </main>
  );
}