"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type EditorContext = {
  fileName: string;
  language: string;
  selectedText: string;
  surroundingCode: string;
  fullFile: string;
  cursorLine?: number;
};

type AiAssistantPanelProps = {
  fileName?: string;
  language?: string;
  apiUrl?: string;
  editor?: Monaco.editor.IStandaloneCodeEditor | null;
  onApplyCode?: (code: string) => void;
};

const commandHelp: Record<string, string> = {
  "/fix": "Fix the selected code and explain the changes.",
  "/explain": "Explain the selected code with a short example.",
  "/test": "Write focused unit tests for the selected code.",
  "/comment": "Add useful comments to the selected code.",
  "/refactor": "Refactor the selected code for clarity and maintainability.",
  "/docs": "Generate documentation for the selected code.",
};

function getContext(editor: Monaco.editor.IStandaloneCodeEditor | null, fileName: string, language: string): EditorContext {
  const model = editor?.getModel();
  const position = editor?.getPosition();
  if (!model || !position) {
    return { fileName, language, selectedText: "", surroundingCode: "", fullFile: "" };
  }

  const selection = editor?.getSelection();
  const selectedText = selection && !selection.isEmpty() ? model.getValueInRange(selection) : "";
  const startLine = Math.max(1, position.lineNumber - 20);
  const endLine = Math.min(model.getLineCount(), position.lineNumber + 20);

  return {
    fileName,
    language,
    selectedText,
    surroundingCode: model.getValueInRange({
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine),
    }),
    fullFile: model.getValue(),
    cursorLine: position.lineNumber,
  };
}

function parseResponse(content: string) {
  return content.split(/(```[\w-]*\n[\s\S]*?```)/g).map((part, index) => {
    const match = part.match(/^```([\w-]*)\n([\s\S]*?)```$/);
    return match
      ? { type: "code" as const, language: match[1] || "text", code: match[2], key: `${index}-code` }
      : { type: "text" as const, text: part, key: `${index}-text` };
  });
}

export function AiAssistantPanel({
  fileName = "src/index.ts",
  language = "typescript",
  apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  editor = null,
  onApplyCode,
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(rawMessage = input) {
    const message = rawMessage.trim();
    if (!message || isStreaming) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message };
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setError("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          context: getContext(editor, fileName, language),
        }),
      });
      if (!response.ok || !response.body) throw new Error("The AI service is unavailable.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
          if (!data) continue;
          const payload = JSON.parse(data) as { text?: string; error?: string };
          if (payload.error) throw new Error(payload.error);
          if (payload.text) {
            setMessages((current) => current.map((item) =>
              item.id === assistantMessage.id ? { ...item, content: item.content + payload.text } : item,
            ));
          }
        }
        if (done) {
          if (buffer.trim()) {
            const data = buffer.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
            if (data) {
              const payload = JSON.parse(data) as { text?: string; error?: string };
              if (payload.error) throw new Error(payload.error);
              if (payload.text) {
                setMessages((current) => current.map((item) =>
                  item.id === assistantMessage.id ? { ...item, content: item.content + payload.text } : item,
                ));
              }
            }
          }
          break;
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI request failed.");
      setMessages((current) => current.filter((item) => item.id !== assistantMessage.id));
    } finally {
      setIsStreaming(false);
    }
  }

  function applyCode(code: string) {
    if (onApplyCode) {
      onApplyCode(code);
      return;
    }
    const selection = editor?.getSelection();
    if (editor && selection) {
      editor.executeEdits("codeplane-ai", [{ range: selection, text: code, forceMoveMarkers: true }]);
      editor.focus();
    }
  }

  return (
    <aside className="ai-panel" aria-label="Codeplane AI assistant">
      <header className="ai-panel__header">
        <div>
          <p className="eyebrow">Context-aware assistant</p>
          <h2>Claude <span>4.6</span></h2>
        </div>
        <div className={`ai-status ${isStreaming ? "is-active" : ""}`}><i /> {isStreaming ? "Thinking" : "Ready"}</div>
      </header>
      <div className="ai-panel__messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="ai-empty">
            <strong>Ask about {fileName}</strong>
            <p>Use a slash command or describe the change you want. Your selection and nearby code travel with the request.</p>
            <div className="command-grid">
              {Object.entries(commandHelp).map(([command, description]) => (
                <button key={command} type="button" onClick={() => setInput(`${command} `)}>
                  <b>{command}</b><span>{description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <article className={`ai-message ai-message--${message.role}`} key={message.id}>
            <div className="ai-message__label">{message.role === "user" ? "You" : "Claude"}</div>
            {message.role === "assistant" ? (
              <div className="ai-message__body">
                {parseResponse(message.content).map((part) => part.type === "code" ? (
                  <div className="ai-code" key={part.key}>
                    <div className="ai-code__toolbar"><span>{part.language}</span><button type="button" onClick={() => navigator.clipboard.writeText(part.code)}>Copy</button><button type="button" onClick={() => applyCode(part.code)}>Apply to editor</button></div>
                    <SyntaxHighlighter language={part.language} style={vscDarkPlus} customStyle={{ margin: 0, padding: "12px", background: "#0a0a0f", fontSize: "11px", lineHeight: 1.65 }}>
                      {part.code}
                    </SyntaxHighlighter>
                  </div>
                ) : <p key={part.key}>{part.text}</p>)}
                {isStreaming && message === messages[messages.length - 1] && <span className="stream-cursor" />}
              </div>
            ) : <p>{message.content}</p>}
          </article>
        ))}
      </div>
      {error && <p className="ai-error" role="alert">{error}</p>}
      <div className="ai-composer">
        <div className="composer-context"><span>{fileName}</span><span>Selected + nearby code</span></div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
          placeholder="Ask Claude or type / for a command..."
          rows={3}
          disabled={isStreaming}
        />
        <button className="send-button" type="button" onClick={() => void sendMessage()} disabled={!input.trim() || isStreaming}>Send <kbd>Enter</kbd></button>
      </div>
    </aside>
  );
}

export function registerAiAutocomplete(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: typeof Monaco,
  options: { apiUrl?: string; fileName?: string; language?: string } = {},
) {
  const provider = monaco.languages.registerInlineCompletionsProvider({ pattern: "**" }, {
    provideInlineCompletions: async (model, position, _context, token) => {
      const prefix = model.getValueInRange({ startLineNumber: Math.max(1, position.lineNumber - 40), startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
      const suffix = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 10), endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), position.lineNumber + 10)) });
      if (!prefix.trim() || token.isCancellationRequested) return { items: [] };
      const context = getContext(editor, options.fileName ?? model.uri.path, options.language ?? model.getLanguageId());
      const response = await fetch(`${options.apiUrl ?? "http://localhost:5000/api"}/ai/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix, suffix, context }) });
      if (!response.ok || token.isCancellationRequested) return { items: [] };
      const completion = (await response.json() as { completion?: string }).completion?.trim();
      return completion ? { items: [{ insertText: completion, range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column) }] } : { items: [] };
    },
    disposeInlineCompletions: () => undefined,
  });
  return provider;
}

export const onEditorMount: OnMount = (editor) => editor.focus();