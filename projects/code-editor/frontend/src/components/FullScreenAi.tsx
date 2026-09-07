import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Sparkles, Send, Paperclip, Globe, Copy, Check,
  RotateCcw, X, FileCode, Zap, PenTool, Clock, ChevronDown,
  Settings, Plus, MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  code?: string;
  time: string;
}

const MODELS = [
  { id: 'claude-sonnet-4-8', label: 'Claude Sonnet 4.8', color: '#a78bfa' },
  { id: 'codeplane-4o', label: 'Codeplane-4o', color: '#00e599' },
  { id: 'gpt-4o', label: 'GPT-4o', color: '#38bdf8' },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'ai-1',
    role: 'assistant',
    text: "I've identified the issue in `login.js`. The token verification promise was not properly awaited before setting the session cookie, resulting in an unhandled race condition where requests were rejected with `401 Unauthorized`.",
    code: `export async function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);
  if (!user) throw new AuthError("Invalid credentials");

  // Await signed JWT token generation before session dispatch
  sessionToken = await createSessionToken(user.id, { expiresIn: '7d' });
  res.setHeader('Set-Cookie', serializeCookie('cp_session', sessionToken, {
    httpOnly: true,
    secure: true
  }));
  return res.status(200).json({ success: true, user: sanitizeUser(user) });
}`,
    time: '11:34 AM'
  }
];

const ACTIVE_CONTEXT_FILES = ['src/auth/login.js', 'auth-service', 'fix/jwt-expiry'];

interface FullScreenAiProps {
  onClose?: () => void;
}

export const FullScreenAi: React.FC<FullScreenAiProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [promptText, setPromptText] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [contextChips, setContextChips] = useState(ACTIVE_CONTEXT_FILES);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats] = useState({ tokensUsed: 1488, tokensLimit: 4096, activeContexts: 5, newChat: true });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!promptText.trim()) return;
    const userMsg = promptText.trim();
    setPromptText('');
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} ${now.getHours()>=12?'PM':'AM'}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMsg,
      time: ts,
    };
    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: `Analyzing "${userMsg}" with ${selectedModel.label}... I've reviewed your codebase context and found the optimal solution. The fix involves properly awaiting all async operations and ensuring session state is consistent across distributed edge nodes.`,
        time: `${now.getHours().toString().padStart(2,'0')}:${(now.getMinutes()+1).toString().padStart(2,'0')} ${now.getHours()>=12?'PM':'AM'}`,
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 800);
  };

  const handleCopyCode = (code: string, msgId: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fullscreen-ai">
      {/* Top bar */}
      <div className="fsai-topbar">
        <div className="fsai-topbar-left">
          <div className="fsai-logo-badge">
            <Bot size={14} />
          </div>
          <span className="fsai-title">Codeplane Engine</span>
          <span className="fsai-model-dash">—</span>

          {/* Model selector */}
          <div className="fsai-model-selector" style={{ position: 'relative' }}>
            <button
              className="fsai-model-btn"
              onClick={() => setShowModelPicker(p => !p)}
            >
              <span style={{ color: selectedModel.color }}>{selectedModel.label}</span>
              <ChevronDown size={11} />
            </button>
            {showModelPicker && (
              <div className="fsai-model-dropdown">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    className={`fsai-model-option ${m.id === selectedModel.id ? 'active' : ''}`}
                    onClick={() => { setSelectedModel(m); setShowModelPicker(false); }}
                  >
                    <span style={{ color: m.color, fontSize: 9, fontWeight: 700 }}>●</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fsai-topbar-center">
          {/* Token meters */}
          <div className="fsai-stat-pill">
            <span className="fsai-stat-label">204k</span>
            <span className="fsai-stat-sub">Context</span>
          </div>
          <div className="fsai-stat-pill">
            <span className="fsai-stat-label green">Fast</span>
            <span className="fsai-stat-sub">Inference</span>
          </div>
          <div className="fsai-stat-pill">
            <span className="fsai-stat-label">Temp:</span>
            <span className="fsai-stat-label accent">0.2</span>
          </div>
          <div className="fsai-stat-pill">
            <span className="fsai-stat-label">Top-P:</span>
            <span className="fsai-stat-label accent">0.85</span>
          </div>
        </div>

        <div className="fsai-topbar-right">
          <button className="fsai-topbar-btn active-ctx">
            <span className="active-ctx-dot" />
            <span>{stats.activeContexts} active</span>
          </button>
          <button className="fsai-topbar-btn new-chat-btn">
            <MessageSquare size={12} />
            <span>New Chat</span>
          </button>
          {onClose && (
            <button className="fsai-topbar-btn close-btn" onClick={onClose}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Active context bar */}
      <div className="fsai-context-bar">
        <span className="fsai-ctx-label">ACTIVE CONTEXT</span>
        {contextChips.map(chip => (
          <div key={chip} className="fsai-ctx-chip">
            <FileCode size={10} />
            <span>{chip}</span>
            <button onClick={() => setContextChips(prev => prev.filter(c => c !== chip))}>
              <X size={9} />
            </button>
          </div>
        ))}
        <button className="fsai-ctx-add" onClick={() => setContextChips(prev => [...prev, 'new-file.ts'])}>
          + Context sync valid ({stats.tokensUsed.toLocaleString()} tokens)
        </button>
      </div>

      {/* Main conversation */}
      <div className="fsai-conversation" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`fsai-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="fsai-ai-header-row">
                <div className="fsai-ai-avatar">
                  <Bot size={13} />
                </div>
                <span className="fsai-ai-name">{selectedModel.label}</span>
                <span className="fsai-msg-time">{msg.time}</span>
              </div>
            )}

            {msg.role === 'user' && (
              <div className="fsai-user-bubble">
                <p>{msg.text}</p>
                <span className="fsai-msg-time-right">{msg.time} · Alex B.</span>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="fsai-ai-body">
                <p className="fsai-ai-text">{msg.text}</p>

                {msg.code && (
                  <div className="fsai-code-block">
                    <div className="fsai-code-header">
                      <div className="fsai-code-lang-badge">
                        <span className="lang-dot" />
                        JavaScript · login.js
                      </div>
                      <div className="fsai-code-actions">
                        <button className="fsai-code-btn" onClick={() => handleCopyCode(msg.code!, msg.id)}>
                          {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button className="fsai-code-btn accent">
                          <Sparkles size={11} />
                          <span>Insert at Cursor</span>
                        </button>
                      </div>
                    </div>
                    <pre className="fsai-code-pre">
                      <code>{msg.code}</code>
                    </pre>
                  </div>
                )}

                {msg.code && (
                  <div className="fsai-applied-badge">
                    <Check size={11} />
                    <span>Applied to login.js</span>
                    <span className="fsai-generated-meta">Generated in 1.4s · 335 tokens</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom input area */}
      <div className="fsai-input-area">
        <div className="fsai-input-chips">
          {contextChips.slice(0, 2).map(chip => (
            <div key={chip} className="fsai-input-chip">
              <FileCode size={10} />
              <span>{chip}</span>
              <button onClick={() => setContextChips(prev => prev.filter(c => c !== chip))}>
                <X size={9} />
              </button>
            </div>
          ))}
          <button className="fsai-add-chip">+ add symbol</button>
        </div>

        <div className="fsai-textarea-box">
          <textarea
            className="fsai-textarea"
            placeholder="Ask AI to write, fix, or explain code... (Use @ to tag files, / for commands)"
            value={promptText}
            rows={2}
            onChange={e => setPromptText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="fsai-input-footer">
            <div className="fsai-input-meta">
              <button className="fsai-meta-btn">
                <span>@ Mention</span>
              </button>
              <button className="fsai-meta-btn">
                <span>/ Commands</span>
              </button>
              <button className="fsai-meta-btn green">
                <span>◎ Run</span>
              </button>
            </div>

            <div className="fsai-input-right-meta">
              <span className="fsai-tokens-used">{stats.tokensUsed} / {stats.tokensLimit.toLocaleString()} tokens</span>
              <button
                className="fsai-send-btn"
                onClick={handleSend}
                disabled={!promptText.trim()}
              >
                <span>Send</span>
                <Send size={11} />
              </button>
            </div>
          </div>
        </div>

        <div className="fsai-input-hints">
          <span>Press <kbd>Return</kbd> to send, <kbd>Shift+Return</kbd> for newline</span>
          <span className="fsai-enterprise-badge">⚡ Enterprise Code Isolation Active</span>
        </div>
      </div>

      {/* Status bar at bottom */}
      <div className="fsai-statusbar">
        <div className="fsai-status-left">
          <span className="fsai-status-branch">⎇ main</span>
          <span>⊘ 0 errors, 0 warnings</span>
          <span>✓ Synced 12ms</span>
        </div>
        <div className="fsai-status-right">
          <span>Port: 3000</span>
          <span>LF UTF-8</span>
          <span>TypeScript / React</span>
        </div>
      </div>
    </div>
  );
};
