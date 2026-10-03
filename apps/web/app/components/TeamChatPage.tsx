"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useApp } from "../context/AppContext";
import {
  Hash,
  Send,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Users,
  FileText,
  Download,
  Code2,
  Plus,
  Bot,
  ChevronDown,
} from "lucide-react";
import { FriendlyHint, HelpfulInfo } from "./FriendlyHelpers";
import { ChatListSkeleton } from "./SkeletonLoaders";

interface ChatMessage {
  id: number;
  sender: string;
  role: string;
  roleColor: string;
  avatar: string;
  time: string;
  text: string;
  richTextHtml?: string;
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

const channelDescriptions: Record<string, string> = {
  general: "Team updates and announcements",
  frontend: "Client-side architecture & review",
  bugs: "Bug triage and fixes",
  random: "Off-topic team conversation",
};

const allowedMessageTags = new Set([
  "B",
  "BR",
  "CODE",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL",
]);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeMessageHtml = (html: string) => {
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
    if (!(node instanceof HTMLElement)) return "";

    const tagName = node.tagName;
    const children = Array.from(node.childNodes).map(sanitizeNode).join("");
    if (!allowedMessageTags.has(tagName)) return children;
    if (tagName === "BR") return "<br>";
    return `<${tagName.toLowerCase()}>${children}</${tagName.toLowerCase()}>`;
  };

  return Array.from(documentFragment.body.childNodes).map(sanitizeNode).join("");
};

export const TeamChatPage: React.FC = () => {
  const { theme, user } = useApp();
  const [activeChannel, setActiveChannel] = useState("frontend");
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMessageEmpty, setIsMessageEmpty] = useState(true);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setIsChatLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const handleFormat = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    setIsMessageEmpty(!editorRef.current?.innerText.trim());
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const editor = editorRef.current;
    const text = editor?.innerText.trim() || "";
    if (!editor || !text) return;

    const newMsg = {
      id: Date.now(),
      sender: user.name,
      role: user.role,
      roleColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      avatar: user.avatar,
      time: "Just now",
      text,
      richTextHtml: sanitizeMessageHtml(editor.innerHTML),
      reactions: [],
    };

    setMessages([...messages, newMsg]);
    editor.innerHTML = "";
    setIsMessageEmpty(true);
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden font-sans md:flex-row">
      <div className="w-full border-b border-[#1c1c2b] bg-[#0b0b12] px-4 py-2 md:hidden">
        <FriendlyHint
          title="Team chat"
          body="Use this space to comment, share updates, and keep the team aligned on the project."
        />
      </div>
      <aside className="order-1 flex max-h-52 w-full shrink-0 flex-col overflow-y-auto border-b border-[#1e1e2d] bg-[#0d0d16] p-3 md:order-2 md:max-h-none md:w-60 md:border-b-0 md:border-l md:border-r-0 xl:w-64">
        <div className="space-y-4 md:space-y-6">
          {/* Workspace Title */}
          <div className="flex items-center justify-between rounded-xl border border-[#242436] bg-[#141422] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6C63FF] text-xs font-bold text-white">
                M
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight text-white">
                  MyStartup
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-[#0DF5C4]">
                  ● PRO Tier · 14 Devs
                </div>
              </div>
            </div>
            <span className="text-[#6d6d88] text-xs">▼</span>
          </div>

          {/* Channels */}
          <div>
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-[#777791]">
              <span>Channels · 4</span>
              <button
                type="button"
                aria-label="Add channel"
                className="rounded p-1 text-[#8d8da5] transition hover:bg-[#20202d] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {["general", "frontend", "bugs", "random"].map((ch) => {
                const isActive = activeChannel === ch;
                return (
                  <div key={ch}>
                    <div
                      className={`flex items-center rounded-lg text-xs transition-colors ${
                        isActive
                          ? "bg-[#1a1a2a] font-medium text-white ring-1 ring-inset ring-[#2c2c40]"
                          : "text-[#9292a9] hover:bg-[#141420] hover:text-[#e0e0ed]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChannel(ch);
                          setIsChannelDetailsOpen(false);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0 text-[#8b8ba3]" />
                        <span className="truncate">{ch}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`${isChannelDetailsOpen && isActive ? "Hide" : "Show"} #${ch} details`}
                        aria-expanded={isActive && isChannelDetailsOpen}
                        onClick={() => {
                          setActiveChannel(ch);
                          setIsChannelDetailsOpen(
                            isActive ? !isChannelDetailsOpen : true,
                          );
                        }}
                        className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#85859e] transition hover:bg-[#29293a] hover:text-white"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${isActive && isChannelDetailsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {isActive && isChannelDetailsOpen && (
                      <div className="mx-1 mt-2 space-y-4 rounded-lg border border-[#29293a] bg-[#11111a] p-3 text-[11px]">
                        <section>
                          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#85859e]">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3 w-3" /> Team · 14
                            </span>
                            <span className="text-[#0DF5C4]">4 active</span>
                          </div>
                          <div className="space-y-2">
                            {[
                              {
                                name: "Sarah Lin",
                                role: "Staff Frontend",
                                status: "online",
                              },
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
                              {
                                name: "DevAIX",
                                role: "Platform Copilot",
                                status: "bot",
                              },
                              {
                                name: "Devpulse Bot",
                                role: "Automation CI",
                                status: "bot",
                              },
                            ].map((member) => (
                              <div
                                key={member.name}
                                className="flex min-w-0 items-center justify-between gap-2"
                              >
                                <span className="flex min-w-0 items-center gap-2 font-medium text-white">
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${member.status === "online" ? "bg-[#0DF5C4]" : member.status === "bot" ? "bg-[#6C63FF]" : "bg-[#FF9E64]"}`}
                                  />
                                  <span className="truncate">
                                    {member.name}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right text-[9px] text-[#85859e]">
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                        <section className="border-t border-[#29293a] pt-3">
                          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#85859e]">
                            Pinned · 2
                          </div>
                          <div className="space-y-2">
                            <div className="rounded-md border border-[#29293a] bg-[#171722] p-2">
                              <div className="mb-1 text-[10px] text-[#85859e]">
                                Sarah Lin · 1d ago
                              </div>
                              <div className="leading-relaxed text-[#d8d8e5]">
                                Frontend deployment guidelines &amp; PR
                                checklist
                              </div>
                            </div>
                            <div className="rounded-md border border-[#29293a] bg-[#171722] p-2">
                              <div className="mb-1 text-[10px] text-[#85859e]">
                                Marcus Vance · 3d ago
                              </div>
                              <div className="leading-relaxed text-[#d8d8e5]">
                                Figma design system release reference
                              </div>
                            </div>
                          </div>
                        </section>
                        <section className="border-t border-[#29293a] pt-3">
                          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#85859e]">
                            Shared files · 18
                          </div>
                          <div className="space-y-2 text-[#b0b0c4]">
                            {[
                              {
                                name: "edge-benchmarks-v2.4.json",
                                size: "142 KB",
                                color: "text-[#FF9E64]",
                              },
                              {
                                name: "ui-layout-specs-v3.png",
                                size: "1.4 MB",
                                color: "text-[#0DF5C4]",
                              },
                              {
                                name: "tailwind-tokens.json",
                                size: "26 KB",
                                color: "text-[#6C63FF]",
                              },
                            ].map((file) => (
                              <div
                                key={file.name}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <FileText
                                    className={`h-3.5 w-3.5 shrink-0 ${file.color}`}
                                  />
                                  <span className="truncate">{file.name}</span>
                                </span>
                                <span className="shrink-0 text-[9px] text-[#777791]">
                                  {file.size}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="hidden md:block">
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-[#777791]">
              <span>Direct messages</span>
              <button
                type="button"
                aria-label="Add direct message"
                className="rounded p-1 text-[#8d8da5] transition hover:bg-[#20202d] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {[
                { name: "Sarah Lin", status: "online" },
                { name: "Marcus Vance", status: "online" },
                { name: "Elena Rostova", status: "online" },
                { name: "Devpulse Bot", isBot: true },
              ].map((dm) => (
                <div
                  key={dm.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-[#9292a9] transition-colors hover:bg-[#141420] hover:text-[#e0e0ed]"
                >
                  <div className="flex items-center gap-2">
                    {dm.isBot ? (
                      <Bot className="h-3.5 w-3.5 text-[#6C63FF]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#0DF5C4]" />
                    )}
                    <span>{dm.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#09090e] md:order-1">
        {/* Chat Header */}
        <div className="flex min-h-[4.25rem] shrink-0 items-center justify-between border-b border-[#242432] bg-[#0d0d15] px-4 sm:px-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 shrink-0 text-[#0DF5C4]" />
              <h1 className="truncate text-base font-semibold text-white">
                {activeChannel}
              </h1>
            </div>
            <div className="mt-1 truncate pl-6 text-xs text-[#9292a9]">
              {channelDescriptions[activeChannel]}
            </div>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2 rounded-lg border border-[#29293a] bg-[#15151f] px-3 py-2 text-xs text-[#b5b5c8]">
            <Users className="h-3.5 w-3.5 text-[#8d8da5]" />
            <span>14</span>
            <span className="hidden text-[#777791] sm:inline">members</span>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-center gap-3" aria-label="Today">
            <span className="h-px flex-1 bg-[#20202d]" />
            <span className="rounded-full border border-[#29293a] bg-[#141420] px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#a1a1b5]">
              Today
            </span>
            <span className="h-px flex-1 bg-[#20202d]" />
          </div>

          {isChatLoading ? (
            <ChatListSkeleton />
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8b8ba8]">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((msg) => (
              <article
                key={msg.id}
                className="group mx-auto flex w-full max-w-5xl items-start gap-3 rounded-lg border border-transparent px-3 py-4 transition-colors hover:border-[#242432] hover:bg-[#0f0f17] sm:gap-4 sm:px-4"
              >
                <Image
                  src={msg.avatar}
                  alt={msg.sender}
                  width={40}
                  height={40}
                  unoptimized
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#343444]"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-[#f2f2f7]">
                      {msg.sender}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] ${msg.roleColor}`}
                    >
                      {msg.role}
                    </span>
                    <span className="font-mono text-[11px] text-[#777791]">
                      {msg.time}
                    </span>
                  </div>

                  {msg.richTextHtml ? (
                    <div
                      className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-[#d3d3e1] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_code]:rounded [&_code]:bg-[#1b1b27] [&_code]:px-1 [&_code]:font-mono [&_strong]:font-semibold [&_u]:underline"
                      dangerouslySetInnerHTML={{ __html: msg.richTextHtml }}
                    />
                  ) : (
                    <p className="max-w-4xl text-sm leading-6 text-[#d3d3e1]">
                      {msg.text}
                    </p>
                  )}

                  {/* Embedded Syntax Code Block */}
                  {msg.hasCode && (
                    <details
                      open
                      className="group mt-3 max-w-4xl overflow-hidden rounded-lg border border-[#303040] bg-[#0d0d15] shadow-sm shadow-black/20"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#141420] px-3 py-2.5 text-[#a0a0b6] transition-colors hover:bg-[#191925] sm:px-4 [&::-webkit-details-marker]:hidden">
                        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
                          <Code2 className="h-3.5 w-3.5 shrink-0 text-[#0DF5C4]" />
                          <span className="truncate">{msg.codeFilename}</span>
                        </div>
                        <span className="flex shrink-0 items-center gap-2 text-[10px] text-[#85859e]">
                          TypeScript
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <pre className="max-h-56 overflow-auto overscroll-contain border-t border-[#29293a] p-4 font-mono text-[11px] leading-5 text-[#c4c4dc]">
                        <code>{msg.codeSnippet}</code>
                      </pre>
                    </details>
                  )}

                  {/* Attachment */}
                  {msg.attachment && (
                    <div className="mt-2 flex max-w-md items-center justify-between gap-3 rounded-lg border border-[#303040] bg-[#13131d] p-3 transition-colors hover:border-[#454558]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#FF9E64]/30 bg-[#FF9E64]/15 text-[#FF9E64]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 font-mono text-xs">
                          <div className="truncate font-medium text-white">
                            {msg.attachment.name}
                          </div>
                          <div className="mt-1 text-[10px] text-[#85859e]">
                            {msg.attachment.size} · {msg.attachment.sub}
                          </div>
                        </div>
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-[#8f8fa8]" />
                    </div>
                  )}

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {msg.reactions.map((reaction, index) => (
                        <span
                          key={index}
                          className="flex items-center gap-1.5 rounded-full border border-[#29293a] bg-[#151522] px-2.5 py-1 text-xs text-[#b2b2c6]"
                        >
                          <span>{reaction.emoji}</span>
                          <span className="font-mono text-[10px]">
                            {reaction.count}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="shrink-0 border-t border-[#1c1c2b] bg-[#0c0c13] px-3 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-5xl">
            <div className="rounded-lg border border-[#343444] bg-[#14141e] transition-colors focus-within:border-[#0DF5C4]/70 focus-within:shadow-[0_0_0_3px_rgba(13,245,196,0.06)]">
              <div className="flex items-center gap-1 border-b border-[#29293a] px-2 py-1.5">
                {[
                  { command: "bold", label: "Bold", Icon: Bold },
                  { command: "italic", label: "Italic", Icon: Italic },
                  { command: "underline", label: "Underline", Icon: Underline },
                  { command: "insertUnorderedList", label: "Bulleted list", Icon: List },
                  { command: "insertOrderedList", label: "Numbered list", Icon: ListOrdered },
                ].map(({ command, label, Icon }) => (
                  <button
                    key={command}
                    type="button"
                    aria-label={label}
                    title={label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleFormat(command)}
                    className="flex h-8 w-8 items-center justify-center rounded text-[#a0a0b6] transition hover:bg-[#242432] hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 p-1.5">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label={`Message #${activeChannel}`}
                  data-placeholder={`Message #${activeChannel}...`}
                  onInput={(event) =>
                    setIsMessageEmpty(!event.currentTarget.innerText.trim())
                  }
                  onPaste={(event) => {
                    event.preventDefault();
                    document.execCommand(
                      "insertText",
                      false,
                      event.clipboardData.getData("text/plain"),
                    );
                    setIsMessageEmpty(!editorRef.current?.innerText.trim());
                  }}
                  className="max-h-36 min-h-10 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-sm leading-6 text-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#777791]"
                />
              <button
                type="submit"
                disabled={isMessageEmpty}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-[#09090e] transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                style={{ backgroundColor: theme.primary }}
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
