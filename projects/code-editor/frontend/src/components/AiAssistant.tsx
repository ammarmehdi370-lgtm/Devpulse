import React, { useState } from 'react';
import {
  Bot,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  Paperclip,
  Globe,
  Send,
  Zap,
  PenTool,
  Clock,
  X,
  FileCode,
  Maximize2,
} from 'lucide-react';

interface AiAssistantProps {
  onApplyDiff: () => void;
  diffApplied: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  onOpenFullScreen?: () => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  onApplyDiff,
  diffApplied,
  isOpen = true,
  onToggle,
  onOpenFullScreen,
}) => {
  const [copied, setCopied] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time?: string }>>([]);
  const [contextChips, setContextChips] = useState<string[]>(['@route.ts']);

  const codeSnippet = `// Cache result with 1 hour expiration
await redis.set(
  cacheKey,
  JSON.stringify(vectorResult),
  { ex: 3600 }
);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!promptText.trim()) return;
    const userMsg = promptText;
    setPromptText('');
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    setMessages(prev => [
      ...prev,
      { role: 'user', text: userMsg, time: ts },
      {
        role: 'assistant',
        text: `Analyzing "${userMsg}" with Codeplane-4o edge neural indexer... Vector route is optimized for 0-cold-start edge execution. I identified the issue and have a fix ready — click "Apply diff" to insert it into your editor.`,
      },
    ]);
  };

  const handleRemoveChip = (chip: string) => {
    setContextChips(prev => prev.filter(c => c !== chip));
  };

  const handleClearConversation = () => {
    setMessages([]);
  };

  /* ── Collapsed strip ──────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <div className="ai-drawer-collapsed" aria-label="AI Assistant collapsed">
        <button
          className="ai-collapse-toggle-btn"
          onClick={onToggle}
          title="Open AI Assistant"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="ai-collapsed-label">
          <Bot size={13} />
          <span>AI</span>
        </div>
      </div>
    );
  }

  /* ── Full panel ───────────────────────────────────────────────── */
  return (
    <aside className="ai-assistant-panel" aria-label="Codeplane AI Assistant">
      {/* AI Header */}
      <div className="ai-header">
        <div className="ai-title-row">
          <div className="ai-bot-avatar">
            <Bot size={15} className="bot-icon" />
          </div>
          <div className="ai-name-col">
            <span className="ai-name">AI Assistant</span>
            <div className="ai-model-status">
              <span className="ai-status-dot" />
              <span className="ai-model-name">Codeplane-4o</span>
              <span className="ai-dot-sep">·</span>
              <span className="ai-speed">Fast</span>
            </div>
          </div>
        </div>

        <div className="ai-header-actions">
          <button
            className="ai-tool-btn"
            title="Clear Conversation"
            onClick={handleClearConversation}
          >
            <RotateCcw size={13} />
          </button>
          {onOpenFullScreen && (
            <button
              className="ai-tool-btn"
              title="Open Full Screen AI"
              onClick={onOpenFullScreen}
            >
              <Maximize2 size={13} />
            </button>
          )}
          <button
            className="ai-tool-btn"
            title="Collapse Panel"
            onClick={onToggle}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Conversation Scroll Area */}
      <div className="ai-conversation-scroll">
        {/* Context reference pill */}
        {messages.length === 0 && (
          <>
            <div className="context-reference-pill">
              <svg className="reference-pin-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="reference-text">
                Referenced: <span className="ref-bold">route.ts (L8-L21)</span>
              </span>
            </div>

            {/* Default user question card */}
            <div className="user-message-card">
              <p className="user-query-text">
                How can I optimize this API route to cache vector embeddings in Redis with a 1hr TTL?
              </p>
              <div className="user-message-meta">
                <span>11:42 AM</span>
                <span className="meta-sep">·</span>
                <span>Context attached</span>
              </div>
            </div>

            {/* Default AI response */}
            <div className="ai-response-container">
              <div className="ai-author-row">
                <Sparkles size={13} className="sparkle-icon" />
                <span className="ai-author-tag">Codeplane-4o</span>
              </div>
              <p className="ai-paragraph">
                To achieve sub-millisecond edge latency, store the computed embeddings directly after generation using an explicit <code className="inline-code">ex: 3600</code> directive:
              </p>
              <ul className="ai-check-bullets">
                <li className="bullet-item">
                  <span className="check-icon-wrap"><Check size={11} strokeWidth={2.5} /></span>
                  <span>Serialize the vector results into JSON before set.</span>
                </li>
                <li className="bullet-item">
                  <span className="check-icon-wrap"><Check size={11} strokeWidth={2.5} /></span>
                  <span>Set TTL directly to avoid stale memory leaks.</span>
                </li>
              </ul>

              <div className="ai-code-block-card">
                <div className="code-block-header">
                  <span className="code-block-lang">TypeScript</span>
                  <button className="copy-code-btn" onClick={handleCopy}>
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="code-block-pre"><code>{codeSnippet}</code></pre>
              </div>

              <button
                className={`apply-diff-button ${diffApplied ? 'applied' : ''}`}
                onClick={onApplyDiff}
              >
                <Sparkles size={13} />
                <span>{diffApplied ? '✓ Diff applied to editor' : 'Apply diff to editor'}</span>
              </button>

              <div className="suggestion-pills-list">
                <button className="suggestion-pill" onClick={() => setPromptText('Add error boundary to POST route')}>
                  <Zap size={12} className="pill-icon zap-icon" />
                  <span>Add error boundary</span>
                </button>
                <button className="suggestion-pill" onClick={() => setPromptText('Write Jest tests for handleVectorQuery')}>
                  <PenTool size={12} className="pill-icon pen-icon" />
                  <span>Write Jest tests</span>
                </button>
                <button className="suggestion-pill" onClick={() => setPromptText('Benchmark latency for vector search')}>
                  <Clock size={12} className="pill-icon clock-icon" />
                  <span>Benchmark latency</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Dynamic messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'user' ? 'user-message-card' : 'ai-response-container'}
            style={{ marginTop: '12px' }}
          >
            {msg.role === 'user' ? (
              <>
                <p className="user-query-text">{msg.text}</p>
                <div className="user-message-meta">
                  <span>{msg.time || 'Just now'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="ai-author-row">
                  <Sparkles size={13} className="sparkle-icon" />
                  <span className="ai-author-tag">Codeplane-4o</span>
                </div>
                <p className="ai-paragraph">{msg.text}</p>
                <button
                  className={`apply-diff-button ${diffApplied ? 'applied' : ''}`}
                  onClick={onApplyDiff}
                  style={{ marginTop: 8 }}
                >
                  <Sparkles size={13} />
                  <span>{diffApplied ? '✓ Applied' : 'Apply diff to editor'}</span>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom AI Input Section */}
      <div className="ai-input-wrapper">
        {/* Context chips row */}
        <div className="input-chips-row">
          {contextChips.map((chip) => (
            <div key={chip} className="input-chip-tag">
              <FileCode size={11} className="chip-file-icon" />
              <span className="chip-name">{chip}</span>
              <button className="chip-remove" onClick={() => handleRemoveChip(chip)}>
                <X size={10} />
              </button>
            </div>
          ))}
          <button className="add-symbol-btn">+ add symbol</button>
        </div>

        <div className="ai-input-card">
          <textarea
            className="ai-textarea"
            rows={2}
            placeholder="Ask AI anything about this file (⌘L)..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="input-actions-bar">
            <div className="input-media-buttons">
              <button className="input-icon-btn" title="Attach file">
                <Paperclip size={13} />
              </button>
              <button className="input-icon-btn" title="Search web">
                <Globe size={13} />
              </button>
            </div>
            <button
              className="send-prompt-btn"
              onClick={handleSend}
              disabled={!promptText.trim()}
            >
              <span>Send</span>
              <Send size={11} className="send-arrow-icon" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
