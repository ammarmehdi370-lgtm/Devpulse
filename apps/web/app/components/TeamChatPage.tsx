"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Hash,
  Send,
  Paperclip,
  Smile,
  Users,
  Pin,
  FileText,
  Download,
  Code2,
  Heart,
  ThumbsUp,
  Plus,
  Search,
  Bot,
} from "lucide-react";

interface ChatMessage {
  id: number;
  sender: string;
  role: string;
  roleColor: string;
  avatar: string;
  time: string;
  text: string;
  hasCode?: boolean;
  codeFilename?: string;
  codeSnippet?: string;
  attachment?: {
    name: string;
    size: string;
    sub: string;
  };
  reactions?: { emoji: string; count: number }[];
}

export const TeamChatPage: React.FC = () => {
  const { theme, user } = useApp();
  const [activeChannel, setActiveChannel] = useState("frontend");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "Sarah Lin",
      role: "Staff UI Engineer",
      roleColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
      time: "10:24 AM",
      text: "Hey team, pushed the new optimistic updates look for the cloud terminal. Can someone review before we merge into staging? Here's the core diff:",
      hasCode: true,
      codeFilename: "packages/hooks/useOptimisticMutation.ts",
      codeSnippet: `export function useOptimisticMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: OptimisticOptions<TData>
) {
  const [state, setState] = useState<OptimisticState<TData>>({ state: 'idle' });
  
  // Instant client-side reconciliation before edge dispatch
  const trigger = useCallback(async (vars: TVariables) => {
    dispatchOptimisticPayload(vars);
    return await mutationFn(vars);
  }, [mutationFn]);

  return { trigger, state };
}`,
      reactions: [
        { emoji: "🔥", count: 3 },
        { emoji: "❤️", count: 2 },
      ],
    },
    {
      id: 2,
      sender: "Marcus Vance",
      role: "DevOps",
      roleColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      time: "10:31 AM",
      text: "Looks super clean @Sarah! Verified the edge cache invalidation latency. Also attaching the benchmark profile from the us-east cluster run:",
      attachment: {
        name: "edge-benchmarks-v2.4.json",
        size: "142 KB",
        sub: "p99 latency: 14.2ms",
      },
      reactions: [{ emoji: "🙌", count: 1 }],
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: user.name,
      role: user.role,
      roleColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      avatar: user.avatar,
      time: "Just now",
      text: messageInput.trim(),
      reactions: [],
    };

    setMessages([...messages, newMsg]);
    setMessageInput("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Column 1: Channels & DMs (Matching Screenshot 5 Left Pane) */}
      <div className="w-64 bg-[#0d0d16] border-r border-[#1e1e2d] flex flex-col justify-between shrink-0 p-3">
        <div className="space-y-6">
          {/* Workspace Title */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-[#141422] rounded-xl border border-[#242436]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#6C63FF] flex items-center justify-center font-bold text-xs text-white">
                M
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">
                  MyStartup
                </div>
                <div className="text-[10px] text-[#0DF5C4] font-mono">
                  ● PRO Tier · 14 Devs
                </div>
              </div>
            </div>
            <span className="text-[#6d6d88] text-xs">▼</span>
          </div>

          {/* Channels */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#63637e] px-2 mb-1.5">
              <span>CHANNELS (4)</span>
              <Plus className="w-3 h-3 text-[#7a7a98] cursor-pointer hover:text-white" />
            </div>
            <div className="space-y-0.5">
              {["general", "frontend", "bugs", "random"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    activeChannel === ch
                      ? "bg-[#1a1a2a] text-white font-medium"
                      : "text-[#85859e] hover:bg-[#141420] hover:text-[#c4c4dc]"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 text-[#6c6c88]" />
                  <span>{ch}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#63637e] px-2 mb-1.5">
              <span>DIRECT MESSAGES</span>
              <Plus className="w-3 h-3 text-[#7a7a98] cursor-pointer hover:text-white" />
            </div>
            <div className="space-y-0.5 text-xs">
              {[
                { name: "Sarah Lin", status: "online" },
                { name: "Marcus Vance", status: "online" },
                { name: "Elena Rostova", status: "online" },
                { name: "Devpulse Bot", isBot: true },
              ].map((dm) => (
                <div
                  key={dm.name}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#85859e] hover:bg-[#141420] hover:text-[#c4c4dc] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {dm.isBot ? (
                      <Bot className="w-3.5 h-3.5 text-[#6C63FF]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#0DF5C4]" />
                    )}
                    <span>{dm.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Active Chat Feed (Matching Screenshot 5 Center Pane) */}
      <div className="flex-1 flex flex-col bg-[#09090e] overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 border-b border-[#1c1c2b] px-5 flex items-center justify-between shrink-0 bg-[#0c0c13]">
          <div className="flex items-center gap-2 font-mono text-xs">
            <Hash className="w-4 h-4 text-[#8c8ca5]" />
            <strong className="text-white font-bold">{activeChannel}</strong>
            <span className="text-[#62627e] hidden sm:inline">
              | Client-side architecture & review
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#7e7e9a]">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>14</span>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 select-text">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-[#141420] border border-[#222234] text-[10px] font-mono text-[#6c6c88]">
              TODAY
            </span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 group">
              <img
                src={msg.avatar}
                alt={msg.sender}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-[#28283a] shrink-0 mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-white">{msg.sender}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] border ${msg.roleColor}`}
                  >
                    {msg.role}
                  </span>
                  <span className="text-[#656580] text-[11px]">{msg.time}</span>
                </div>

                <p className="text-xs text-[#d0d0e2] leading-relaxed max-w-3xl">
                  {msg.text}
                </p>

                {/* Embedded Syntax Code Block */}
                {msg.hasCode && (
                  <div className="mt-3 max-w-2xl bg-[#0e0e16] border border-[#222234] rounded-xl overflow-hidden font-mono text-xs">
                    <div className="bg-[#141420] px-4 py-2 border-b border-[#222234] flex items-center justify-between text-[#8c8ca5] text-[11px]">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-[#0DF5C4]" />
                        <span>{msg.codeFilename}</span>
                      </div>
                      <span className="text-[10px] text-[#6b6b85]">
                        TypeScript
                      </span>
                    </div>
                    <pre className="p-4 text-[#c4c4dc] overflow-x-auto text-[11px] leading-relaxed">
                      <code>{msg.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Attachment */}
                {msg.attachment && (
                  <div className="mt-2 max-w-sm bg-[#12121c] border border-[#222234] hover:border-[#2f2f45] rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF9E64]/15 border border-[#FF9E64]/30 flex items-center justify-center text-[#FF9E64]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="font-mono text-xs">
                        <div className="text-white font-medium">
                          {msg.attachment.name}
                        </div>
                        <div className="text-[10px] text-[#71718c]">
                          {msg.attachment.size} · {msg.attachment.sub}
                        </div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-[#7e7e9a] hover:text-white" />
                  </div>
                )}

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {msg.reactions.map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-[#151522] border border-[#242436] text-xs flex items-center gap-1 text-[#a0a0ba]"
                      >
                        <span>{r.emoji}</span>
                        <span className="text-[11px] font-mono">{r.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-[#1c1c2b] bg-[#0c0c13]">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Message #${activeChannel} (Type @ to mention, / for commands, ESC for actions...)`}
              className="w-full pl-4 pr-24 py-3 bg-[#13131e] border border-[#242436] rounded-xl text-xs text-white placeholder-[#585874] focus:outline-none focus:border-[#6C63FF]"
            />
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#09090e] flex items-center gap-1 transition-transform active:scale-95"
                style={{ backgroundColor: theme.primary }}
              >
                <span>Send</span>
                <Send className="w-3 h-3 text-[#09090e]" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Column 3: Channel Details & Pinned (Matching Screenshot 5 Right Pane) */}
      <div className="w-72 bg-[#0c0c14] border-l border-[#1e1e2d] hidden xl:flex flex-col justify-between p-4 font-mono text-xs overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#1c1c2a]">
            <span className="text-white font-bold">Channel Details</span>
            <span className="text-[#656580] cursor-pointer">✕</span>
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#63637e] uppercase tracking-wider mb-2">
              <span>TEAM MEMBERS (14)</span>
              <span className="text-[#0DF5C4]">4 active</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { name: "Sarah Lin", role: "Staff Frontend", status: "online" },
                {
                  name: "Marcus Vance",
                  role: "Infrastructure",
                  status: "online",
                },
                {
                  name: "Elena Rostova",
                  role: "Systems & Kernels",
                  status: "idle",
                },
                { name: "DevAIX", role: "Platform Copilot", status: "bot" },
                { name: "Devpulse Bot", role: "Automation CI", status: "bot" },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${m.status === "online" ? "bg-[#0DF5C4]" : m.status === "bot" ? "bg-[#6C63FF]" : "bg-[#FF9E64]"}`}
                    />
                    <span className="text-white font-medium">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-[#6c6c88]">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pinned Messages */}
          <div>
            <div className="text-[10px] text-[#63637e] uppercase tracking-wider mb-2">
              PINNED MESSAGES (2)
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#141420] border border-[#222232] space-y-1">
                <div className="text-[#757592] text-[10px]">
                  Sarah Lin · 1d ago
                </div>
                <div className="text-[#cfcfdf] font-medium">
                  Frontend deployment guidelines & PR checklist
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#141420] border border-[#222232] space-y-1">
                <div className="text-[#757592] text-[10px]">
                  Marcus Vance · 3d ago
                </div>
                <div className="text-[#cfcfdf] font-medium">
                  Figma design system release reference
                </div>
              </div>
            </div>
          </div>

          {/* Files Shared */}
          <div>
            <div className="text-[10px] text-[#63637e] uppercase tracking-wider mb-2">
              FILES SHARED (18)
            </div>
            <div className="space-y-1.5 text-[11px] text-[#a0a0be]">
              <div className="flex items-center justify-between p-1.5 hover:bg-[#141420] rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-[#FF9E64]" />
                  <span className="truncate">edge-benchmarks-v2.4.json</span>
                </div>
                <span className="text-[10px] text-[#6c6c88]">142 KB</span>
              </div>
              <div className="flex items-center justify-between p-1.5 hover:bg-[#141420] rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-[#0DF5C4]" />
                  <span className="truncate">ui-layout-specs-v3.png</span>
                </div>
                <span className="text-[10px] text-[#6c6c88]">1.4 MB</span>
              </div>
              <div className="flex items-center justify-between p-1.5 hover:bg-[#141420] rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 text-[#6C63FF]" />
                  <span className="truncate">tailwind-tokens.json</span>
                </div>
                <span className="text-[10px] text-[#6c6c88]">26 KB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
