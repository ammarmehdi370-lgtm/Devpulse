import React, { useState } from 'react';
import {
  Hash,
  Send,
  Paperclip,
  Smile,
  Code2,
  Bold,
  Italic,
  Link,
  Plus,
  Users,
  Pin,
  FileText,
  ChevronDown
} from 'lucide-react';

interface ChatMessage {
  id: number;
  author: string;
  role: string;
  time: string;
  avatar: string;
  text: string;
  code?: string;
  attachment?: {
    name: string;
    size: string;
    stat: string;
  };
}

export const MessagingPage: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState('frontend');
  const [inputText, setInputText] = useState('');
  const [reactions, setReactions] = useState<{ [key: string]: number }>({
    thumbs: 6,
    heart: 2,
    rocket: 5,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      author: 'Sarah Lin',
      role: 'Staff UI Engineer',
      time: '10:32 AM',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&auto=format&fit=crop&q=80',
      text: "Hey team, pushed the new optimistic updates hook for the cloud terminal. Can someone review before we merge into staging? Here's the core diff:",
      code: `export function useOptimisticMutation<TData, TVariables>(
  mutation: (variables: TVariables) => Promise<TData>,
  options?: OptimisticOptions<TData>
) {
  const [state, setState] = useState<OptimisticState<TData>>({ status: 'idle' });
  // Instant client-side reconciliation before edge snapshot
  return { trigger, state };
}`,
    },
    {
      id: 2,
      author: 'Marcus Vance',
      role: 'DevOps',
      time: '10:35 AM',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&auto=format&fit=crop&q=80',
      text: "Looks super clean @Sarah! I verified the edge cache invalidation latency. Also attaching the benchmark profile from the us-east cluster run:",
      attachment: {
        name: 'edge-benchmark-v2.4.json',
        size: '124 KB',
        stat: 'p99 latency: 10.4ms',
      },
    },
  ]);

  const handleToggleReaction = (type: string) => {
    setReactions((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: 'Alex Parker',
        role: 'Senior Engineer (You)',
        time: 'Just now',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&auto=format&fit=crop&q=80',
        text: inputText.trim(),
      },
    ]);
    setInputText('');
  };

  return (
    <div className="messaging-page-layout">
      {/* Channels Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-team-header">
          <div className="team-avatar-box">M</div>
          <div className="team-info-col">
            <strong>Mysterious</strong>
            <span className="pro-tier-pill">Pro Tier · 14 devs</span>
          </div>
        </div>

        <div className="chat-nav-section">
          <div className="section-label-row">
            <span>CHANNELS (4)</span>
            <ChevronDown size={12} />
          </div>

          <div className="channels-list">
            <button
              className={`channel-nav-item ${activeChannel === 'general' ? 'active' : ''}`}
              onClick={() => setActiveChannel('general')}
            >
              <Hash size={13} />
              <span>general</span>
            </button>
            <button
              className={`channel-nav-item ${activeChannel === 'frontend' ? 'active' : ''}`}
              onClick={() => setActiveChannel('frontend')}
            >
              <Hash size={13} />
              <span>frontend</span>
              <span className="unread-dot"></span>
            </button>
            <button
              className={`channel-nav-item ${activeChannel === 'team' ? 'active' : ''}`}
              onClick={() => setActiveChannel('team')}
            >
              <Hash size={13} />
              <span>team</span>
            </button>
            <button
              className={`channel-nav-item ${activeChannel === 'random' ? 'active' : ''}`}
              onClick={() => setActiveChannel('random')}
            >
              <Hash size={13} />
              <span>random</span>
            </button>
          </div>
        </div>

        <div className="chat-nav-section">
          <div className="section-label-row">
            <span>DIRECT MESSAGES</span>
            <ChevronDown size={12} />
          </div>

          <div className="channels-list">
            <div className="dm-user-item">
              <span className="user-status-dot online"></span>
              <span>Sarah Lin</span>
            </div>
            <div className="dm-user-item">
              <span className="user-status-dot online"></span>
              <span>Marcus Vance</span>
            </div>
            <div className="dm-user-item">
              <span className="user-status-dot idle"></span>
              <span>Elena Rostova</span>
            </div>
            <div className="dm-user-item">
              <span className="user-status-dot bot"></span>
              <span>Codeplane Bot</span>
            </div>
          </div>
        </div>

        <div className="chat-sidebar-bottom">
          <button className="new-channel-btn">
            <Plus size={13} />
            <span>New Channel</span>
          </button>
        </div>
      </aside>

      {/* Main Conversation Stream */}
      <main className="chat-stream-main">
        {/* Chat Header */}
        <header className="chat-header-bar">
          <div className="chat-header-left">
            <Hash size={15} className="hash-icon" />
            <strong className="channel-title">{activeChannel}</strong>
            <span className="channel-topic">Client-side architecture &amp; edge routing</span>
          </div>

          <div className="chat-header-right">
            <span className="member-count-pill">
              <Users size={12} />
              <span>14</span>
            </span>
          </div>
        </header>

        {/* Message Feed */}
        <div className="messages-feed-scroll">
          <div className="date-separator">
            <span>TODAY</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className="chat-message-row">
              <img src={msg.avatar} alt={msg.author} className="message-avatar" />
              <div className="message-body">
                <div className="author-meta-row">
                  <strong className="message-author">{msg.author}</strong>
                  <span className="author-role-badge">{msg.role}</span>
                  <span className="message-time">{msg.time}</span>
                </div>

                <p className="message-text">{msg.text}</p>

                {msg.code && (
                  <div className="chat-code-block">
                    <pre><code>{msg.code}</code></pre>
                  </div>
                )}

                {msg.attachment && (
                  <div className="chat-attachment-card">
                    <div className="attachment-icon-box">
                      <FileText size={16} />
                    </div>
                    <div className="attachment-info">
                      <strong>{msg.attachment.name}</strong>
                      <span>{msg.attachment.size} · {msg.attachment.stat}</span>
                    </div>
                  </div>
                )}

                {/* Reaction Pills */}
                {msg.id === 1 && (
                  <div className="reactions-row">
                    <button className="reaction-pill" onClick={() => handleToggleReaction('thumbs')}>
                      <span>👍</span>
                      <strong>{reactions.thumbs}</strong>
                    </button>
                    <button className="reaction-pill" onClick={() => handleToggleReaction('heart')}>
                      <span>❤️</span>
                      <strong>{reactions.heart}</strong>
                    </button>
                    <button className="reaction-pill" onClick={() => handleToggleReaction('rocket')}>
                      <span>🚀</span>
                      <strong>{reactions.rocket}</strong>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message Composer Footer */}
        <form onSubmit={handleSendMessage} className="chat-composer-box">
          <input
            type="text"
            placeholder={`Message #${activeChannel} (Type @ to mention, / for commands, ⌘K for actions)...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="chat-text-input"
          />

          <div className="composer-actions-bar">
            <div className="composer-rich-tools">
              <button type="button" className="tool-btn" title="Bold"><Bold size={13} /></button>
              <button type="button" className="tool-btn" title="Italic"><Italic size={13} /></button>
              <button type="button" className="tool-btn" title="Code"><Code2 size={13} /></button>
              <button type="button" className="tool-btn" title="Link"><Link size={13} /></button>
              <button type="button" className="tool-btn" title="Emoji"><Smile size={13} /></button>
              <button type="button" className="tool-btn" title="Attach"><Paperclip size={13} /></button>
            </div>

            <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
              <span>Send</span>
              <Send size={12} />
            </button>
          </div>
        </form>
      </main>

      {/* Right Details Panel */}
      <aside className="chat-details-panel">
        <div className="details-header">
          <strong>Channel Details</strong>
        </div>

        <div className="details-section">
          <span className="details-sec-title">TEAM MEMBERS (14)</span>
          <div className="details-members-list">
            <div className="member-row">
              <span className="dot online"></span>
              <strong>Sarah Lin</strong>
              <span className="sub-role">Lead Frontend</span>
            </div>
            <div className="member-row">
              <span className="dot online"></span>
              <strong>Marcus Vance</strong>
              <span className="sub-role">DevOps/Infra</span>
            </div>
            <div className="member-row">
              <span className="dot idle"></span>
              <strong>Elena Rostova</strong>
              <span className="sub-role">Systems &amp; Security</span>
            </div>
            <div className="member-row">
              <span className="dot offline"></span>
              <strong>David K.</strong>
              <span className="sub-role">Product Engineer</span>
            </div>
          </div>
        </div>

        <div className="details-section">
          <span className="details-sec-title">PINNED MESSAGES (2)</span>
          <div className="pinned-item">
            <Pin size={11} className="pin-icon" />
            <span>Frontend deployment guidelines &amp; P90 monitor</span>
          </div>
          <div className="pinned-item">
            <Pin size={11} className="pin-icon" />
            <span>Figma design system tokens reference</span>
          </div>
        </div>

        <div className="details-section">
          <span className="details-sec-title">FILES SHARED (12)</span>
          <div className="pinned-item">
            <FileText size={11} className="pin-icon" />
            <span>edge-benchmarks-v2.4.json</span>
          </div>
          <div className="pinned-item">
            <FileText size={11} className="pin-icon" />
            <span>telemetry-daemon.json</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
