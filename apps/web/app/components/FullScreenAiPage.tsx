"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Activity,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  FileCode,
  Globe,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

type ActivityPhase = "thinking" | "searching" | "terminal" | "writing";

interface ActivityStep {
  id: number;
  phase: ActivityPhase;
  detail: string;
  status: "active" | "complete" | "failed";
}

interface ChatMessage {
  id: number;
  sender: string;
  time: string;
  isUser: boolean;
  text: string;
  model?: string;
  hasCode?: boolean;
  codeFilename?: string;
  codeSnippet?: string;
  generationStats?: string;
  activity?: ActivityStep[];
}

const phasePresentation: Record<
  ActivityPhase,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  thinking: { label: "Thinking", icon: BrainCircuit },
  searching: { label: "Searching online", icon: Globe },
  terminal: { label: "Running in terminal", icon: Terminal },
  writing: { label: "Writing response", icon: Sparkles },
};

const modelDescriptions: Record<string, string> = {
  "Claude Sonnet 4.6": "Balanced reasoning and code generation",
  "GPT-4o (Omni Fast)": "Fast responses for everyday tasks",
  "CodeLlama 70B (Local MicroVM)": "Private code assistance on your workspace",
};

export const FullScreenAiPage: React.FC = () => {
  const { user, setPage, applyDiffToActiveFile } = useApp();
  const [selectedModel, setSelectedModel] = useState("Claude Sonnet 4.6");
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.95);
  const [copied, setCopied] = useState(false);
  const [appliedMessageId, setAppliedMessageId] = useState<number | null>(null);
  const [expandedCodeSnippets, setExpandedCodeSnippets] = useState<
    Record<number, boolean>
  >({});
  const [inputQuery, setInputQuery] = useState("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveActivity, setLiveActivity] = useState<ActivityStep[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isLatestVisible, setIsLatestVisible] = useState(true);
  const [lastPrompt, setLastPrompt] = useState("");
  const [contextChips, setContextChips] = useState([
    { id: "login", label: "@login.js" },
    { id: "package", label: "@package.json" },
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "Alex R.",
      time: "11:24 AM",
      isUser: true,
      text: "Fix the authentication bug in my login.js file",
    },
    {
      id: 2,
      sender: "Devpulse Engine",
      model: "Claude Sonnet 4.6",
      time: "11:24 AM",
      isUser: false,
      text: "Identified the issue in login.js. The token verification promise was not properly awaited before setting the session cookie, resulting in an unhandled race condition where requests were rejected with 401 Unauthorized.",
      hasCode: true,
      activity: [
        {
          id: 1,
          phase: "thinking",
          detail: "Reviewed the request and active file",
          status: "complete",
        },
        {
          id: 2,
          phase: "writing",
          detail: "Generated a suggested fix",
          status: "complete",
        },
      ],
      codeFilename: "login.js",
      codeSnippet: `export async function handleLogin(req, res) {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);
  if (!user) throw new AuthError('Invalid credentials');

  // Await signed JWT token generation before session dispatch
  const sessionToken = await createSessionToken(user.id, { expiresIn: '7d' });
  res.setHeader('Set-Cookie', serializeCookie('cp_session', sessionToken, {
    httpOnly: true,
    secure: true
  }));
  return res.status(200).json({ success: true, user: sanitizeUser(user) });
}`,
      generationStats: "Generated in 1.4s · 320 tokens",
    },
  ]);

  useEffect(() => {
    if (isLatestVisible) {
      const messages = messagesRef.current;
      messages?.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages, isGenerating, streamingText, liveActivity, isLatestVisible]);

  const resizeComposer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const lineHeight =
      Number.parseFloat(getComputedStyle(textarea).lineHeight) || 24;
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, lineHeight * 2),
      lineHeight * 8,
    )}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > lineHeight * 8 ? "auto" : "hidden";
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputQuery.trim() || isGenerating) return;

    const userMsg = {
      id: Date.now(),
      sender: user.name,
      time: "Just now",
      isUser: true,
      text: inputQuery.trim(),
    };
    setLastPrompt(userMsg.text);
    setChatMessages((previous) => [...previous, userMsg]);
    setInputQuery("");
    if (textareaRef.current) textareaRef.current.style.height = "";
    setIsLatestVisible(true);
    setIsGenerating(true);
    setStreamingText("");
    let requestActivity: ActivityStep[] = [
      {
        id: Date.now(),
        phase: "thinking",
        detail: "Reviewing your request",
        status: "active",
      },
    ];
    setLiveActivity(requestActivity);

    const setActivityPhase = (phase: ActivityPhase, detail: string) => {
      requestActivity = [
        ...requestActivity.map((step) =>
          step.status === "active"
            ? { ...step, status: "complete" as const }
            : step,
        ),
        { id: Date.now(), phase, detail, status: "active" },
      ];
      setLiveActivity([...requestActivity]);
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:4002"}/v1/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Project: auth-service\nActive file: src/auth/login.js\nBranch: fix/jwt-expiry\nModel preference: ${selectedModel}\nTemperature: ${temperature}\nTop-p: ${topP}\nRequest: ${userMsg.text}`,
              },
            ],
          }),
        },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "AI request failed");
      }
      if (
        !response.body ||
        !response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        throw new Error("AI service did not start a response stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let responseText = "";
      let streamCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const eventBlock = buffer.slice(0, boundary).replace(/\r/g, "");
          buffer = buffer.slice(boundary + 2);
          const data = eventBlock
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("\n");
          if (data) {
            const event = JSON.parse(data) as {
              type: "activity" | "token" | "done" | "error";
              phase?: ActivityPhase;
              detail?: string;
              text?: string;
              error?: string;
            };
            if (event.type === "activity" && event.phase) {
              setActivityPhase(event.phase, event.detail || "Working");
            } else if (event.type === "token" && event.text) {
              responseText += event.text;
              setStreamingText(responseText);
            } else if (event.type === "error") {
              throw new Error(event.error || "AI request failed");
            } else if (event.type === "done") {
              streamCompleted = true;
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
        if (done) break;
      }

      if (!streamCompleted) throw new Error("The AI response ended unexpectedly.");
      if (!responseText.trim()) responseText = "The AI returned no text.";
      requestActivity = requestActivity.map((step) => ({
        ...step,
        status: "complete",
      }));
      setLiveActivity(requestActivity);
      setChatMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          sender: "Devpulse Engine",
          model: selectedModel,
          time: "Just now",
          isUser: false,
          text: responseText,
          hasCode: false,
          codeFilename: "AI response",
          codeSnippet: responseText,
          generationStats: "Generated by AI service",
          activity: requestActivity,
        },
      ]);
      setStreamingText("");
    } catch (error) {
      requestActivity = requestActivity.map((step) =>
        step.status === "active" ? { ...step, status: "failed" } : step,
      );
      setLiveActivity(requestActivity);
      setChatMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          sender: "Devpulse Engine",
          model: selectedModel,
          time: "Just now",
          isUser: false,
          text:
            error instanceof Error
              ? `AI error: ${error.message}`
              : "AI request failed",
          hasCode: false,
          activity: requestActivity,
        },
      ]);
      setStreamingText("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (snippet: string) => {
    void navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch((error: unknown) => {
        console.error("Unable to copy the AI code snippet.", error);
      });
  };

  const copyMessage = (text: string) => {
    void navigator.clipboard.writeText(text).catch((error: unknown) => {
      console.error("Unable to copy the AI message.", error);
    });
  };

  const startNewChat = () => {
    setChatMessages([]);
    setLiveActivity([]);
    setStreamingText("");
    setInputQuery("");
  };

  const suggestions = [
    "Explain this project to me",
    "Find and fix a bug",
    "Write tests for the active file",
    "Refactor this code for clarity",
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-ide-bg font-sans text-ide-text">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ide-border-strong bg-ide-panel px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ide-accent/15 text-ide-accent">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="hidden shrink-0 text-lg font-semibold text-ide-text-strong sm:block">
            AI Assistant
          </h1>
          <div className="relative min-w-0">
            <button
              type="button"
              aria-label={`Select model, current model ${selectedModel}`}
              aria-expanded={isModelDropdownOpen}
              onClick={() => {
                setIsModelDropdownOpen((open) => !open);
                setIsSettingsOpen(false);
              }}
              className="flex max-w-[min(48vw,18rem)] items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 py-2 text-left text-xs text-ide-text-strong transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-ide-accent" />
              <span className="truncate font-medium">{selectedModel}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ide-text-secondary" />
            </button>
            {isModelDropdownOpen && (
              <div
                role="menu"
                aria-label="Choose an AI model"
                className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ide-border-strong bg-ide-panel p-1.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--ide-color-shadow-color)_30%,transparent)]"
              >
                {Object.entries(modelDescriptions).map(([model, description]) => (
                  <button
                    key={model}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selectedModel === model}
                    onClick={() => {
                      setSelectedModel(model);
                      setIsModelDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-ide-text-strong">
                        {model}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ide-text-secondary">
                        {description}
                      </span>
                    </span>
                    {selectedModel === model && (
                      <Check className="h-4 w-4 shrink-0 text-ide-accent" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              type="button"
              aria-expanded={isSettingsOpen}
              aria-label="Generation settings"
              onClick={() => {
                setIsSettingsOpen((open) => !open);
                setIsModelDropdownOpen(false);
              }}
              className="flex h-9 items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-surface px-3 text-xs font-medium text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-ide-border-strong bg-ide-panel p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--ide-color-shadow-color)_30%,transparent)]">
                <h2 className="text-sm font-semibold text-ide-text-strong">
                  Generation settings
                </h2>
                <label className="mt-4 block text-xs font-medium text-ide-text-secondary">
                  <span className="flex justify-between">
                    <span>Temperature</span>
                    <span className="font-mono tabular-nums text-ide-text-strong">
                      {temperature.toFixed(1)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(event) =>
                      setTemperature(Number(event.target.value))
                    }
                    className="mt-2 w-full accent-[var(--ide-color-accent)]"
                  />
                  <span className="mt-1 block text-[11px] text-ide-text-secondary">
                    Lower values are more focused and predictable.
                  </span>
                </label>
                <label className="mt-4 block text-xs font-medium text-ide-text-secondary">
                  <span className="flex justify-between">
                    <span>Top-p</span>
                    <span className="font-mono tabular-nums text-ide-text-strong">
                      {topP.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(event) => setTopP(Number(event.target.value))}
                    className="mt-2 w-full accent-[var(--ide-color-accent)]"
                  />
                  <span className="mt-1 block text-[11px] text-ide-text-secondary">
                    Controls the diversity of generated responses.
                  </span>
                </label>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={startNewChat}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-ide-border-strong bg-ide-surface px-3 text-xs font-medium text-ide-text-strong transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          onScroll={(event) => {
            const element = event.currentTarget;
            setIsLatestVisible(
              element.scrollHeight - element.scrollTop - element.clientHeight < 72,
            );
          }}
          className="ai-studio-messages-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain scroll-smooth px-4 sm:px-6"
        >
          <div className="mx-auto min-h-full w-full max-w-[820px] select-text pb-8 pt-6">
            {chatMessages.length === 0 && !isGenerating ? (
              <section className="flex min-h-[min(52vh,34rem)] flex-col items-center justify-center py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ide-accent/20 bg-ide-accent/10 text-ide-accent">
                  <Sparkles className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-ide-text-strong">
                  What can I help you build?
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-ide-text-secondary">
                  Ask a question, explore your code, or describe a change to get
                  started.
                </p>
                <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInputQuery(suggestion);
                        requestAnimationFrame(() => {
                          resizeComposer();
                          textareaRef.current?.focus();
                        });
                      }}
                      className="rounded-full border border-ide-border-strong bg-ide-panel px-3.5 py-2 text-xs text-ide-text-secondary transition-colors duration-150 hover:border-ide-accent/40 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="space-y-8">
                {chatMessages.map((msg) => {
                  const isError = !msg.isUser && msg.text.startsWith("AI error:");
                  const codeLines = msg.codeSnippet?.split("\n").length ?? 0;
                  return (
                    <article key={msg.id} className="group/message">
                      {msg.isUser ? (
                        <div className="ml-auto max-w-[75%]">
                          <div className="mb-1.5 flex justify-end gap-2 text-xs text-ide-text-secondary">
                            <span>{msg.sender}</span>
                            <span aria-hidden="true">·</span>
                            <time>{msg.time}</time>
                          </div>
                          <div className="rounded-2xl rounded-tr-md border border-ide-accent/20 bg-ide-accent/10 px-4 py-3 text-[15px] leading-6 text-ide-text-strong">
                            {msg.text}
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ide-accent/10 text-ide-accent">
                              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <span className="text-xs font-semibold text-ide-text-strong">
                              {msg.sender}
                            </span>
                            {msg.model && (
                              <span className="rounded-full border border-ide-border-subtle bg-ide-surface px-2 py-0.5 text-[10px] text-ide-text-secondary">
                                {msg.model}
                              </span>
                            )}
                            <time className="ml-auto text-xs text-ide-text-secondary">
                              {msg.time}
                            </time>
                            <button
                              type="button"
                              aria-label="Copy message"
                              title="Copy message"
                              onClick={() => copyMessage(msg.text)}
                              className="rounded-md p-1.5 text-ide-text-secondary opacity-0 transition-opacity duration-150 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring group-hover/message:opacity-100"
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>

                          {msg.activity && msg.activity.length > 0 && (
                            <details className="group/activity mt-3 max-w-2xl">
                              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-ide-border-subtle bg-ide-panel px-3 py-2 text-xs text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover [&::-webkit-details-marker]:hidden">
                                <Activity className="h-3.5 w-3.5 text-ide-accent" />
                                <span>Activity · {msg.activity.length} steps</span>
                                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform duration-150 group-open/activity:rotate-180 motion-reduce:transition-none" />
                              </summary>
                              <ol className="ml-4 mt-2 space-y-2 border-l border-ide-border-strong py-1 pl-4">
                                {msg.activity.map((step) => {
                                  const StepIcon = phasePresentation[step.phase].icon;
                                  return (
                                    <li
                                      key={step.id}
                                      className="relative flex items-center gap-2 text-xs text-ide-text-secondary"
                                    >
                                      <span className="absolute -left-[21px] flex h-3 w-3 items-center justify-center rounded-full bg-ide-panel">
                                        {step.status === "complete" ? (
                                          <CheckCircle2 className="h-3 w-3 text-ide-success" />
                                        ) : (
                                          <StepIcon
                                            className={`h-3 w-3 ${step.status === "failed" ? "text-ide-danger" : "text-ide-accent"}`}
                                          />
                                        )}
                                      </span>
                                      <span className="font-medium text-ide-text-strong">
                                        {phasePresentation[step.phase].label}
                                      </span>
                                      <span>{step.detail}</span>
                                    </li>
                                  );
                                })}
                              </ol>
                            </details>
                          )}

                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.7] text-ide-text-strong">
                            {msg.text}
                          </p>
                          {isError && lastPrompt && (
                            <button
                              type="button"
                              onClick={() => {
                                setInputQuery(lastPrompt);
                                requestAnimationFrame(() =>
                                  formRef.current?.requestSubmit(),
                                );
                              }}
                              className="mt-3 rounded-lg border border-ide-border-strong bg-ide-panel px-3 py-2 text-xs font-medium text-ide-text-strong transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                            >
                              Retry
                            </button>
                          )}

                          {msg.hasCode && msg.codeSnippet && (
                            <section className="mt-4 overflow-hidden rounded-xl border border-ide-border-strong bg-ide-panel">
                              <div className="flex items-center gap-2 border-b border-ide-border-subtle px-3 py-2.5 text-xs text-ide-text-secondary">
                                <Code2 className="h-4 w-4 shrink-0 text-ide-accent" />
                                <span className="min-w-0 flex-1 truncate font-medium text-ide-text-strong">
                                  {msg.codeFilename || "Code snippet"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(msg.codeSnippet!)}
                                  aria-label="Copy code snippet"
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                                >
                                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void applyDiffToActiveFile(msg.codeSnippet || "").then(() => {
                                      setAppliedMessageId(msg.id);
                                      setPage("editor");
                                    });
                                  }}
                                  aria-label="Apply code snippet"
                                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ide-accent/15 px-2 py-1 text-[11px] font-medium text-ide-text-strong transition-colors duration-150 hover:bg-ide-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  aria-label={expandedCodeSnippets[msg.id] ?? codeLines <= 12 ? "Collapse code snippet" : "Expand code snippet"}
                                  aria-expanded={expandedCodeSnippets[msg.id] ?? codeLines <= 12}
                                  onClick={() =>
                                    setExpandedCodeSnippets((current) => ({
                                      ...current,
                                      [msg.id]: !(current[msg.id] ?? codeLines <= 12),
                                    }))
                                  }
                                  className="rounded-md p-1 text-ide-text-secondary transition-colors duration-150 hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                                >
                                  {expandedCodeSnippets[msg.id] ?? codeLines <= 12 ? (
                                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                              {(expandedCodeSnippets[msg.id] ?? codeLines <= 12) && (
                                <>
                                  <pre className="max-h-72 overflow-x-auto overscroll-x-contain p-4 font-mono text-xs leading-6 text-ide-text-strong">
                                    <code>{msg.codeSnippet}</code>
                                  </pre>
                                  <div className="flex items-center justify-between gap-3 border-t border-ide-border-subtle px-3 py-2 text-[11px] text-ide-text-secondary">
                                    <span>
                                      {appliedMessageId === msg.id
                                        ? "Applied to editor"
                                        : "Suggested change"}
                                    </span>
                                    <span>{msg.generationStats}</span>
                                  </div>
                                </>
                              )}
                            </section>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}

                {isGenerating && (
                  <section aria-label="Assistant is responding">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ide-accent/10 text-ide-accent">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold text-ide-text-strong">
                        Devpulse Engine
                      </span>
                      <span className="ml-1 flex items-center gap-1" aria-label="Typing">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ide-text-secondary motion-reduce:animate-none"
                            style={{ animationDelay: `${dot * 150}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                    {!streamingText && (
                      <div aria-hidden="true" className="mt-4 max-w-xl space-y-2">
                        <div className="h-3 w-11/12 animate-pulse rounded bg-ide-surface motion-reduce:animate-none" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-ide-surface motion-reduce:animate-none" />
                        <div className="h-3 w-2/5 animate-pulse rounded bg-ide-surface motion-reduce:animate-none" />
                      </div>
                    )}
                    {liveActivity.length > 0 && (
                      <details className="group/activity mt-3 max-w-2xl">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-ide-text-secondary [&::-webkit-details-marker]:hidden">
                          <Activity className="h-3.5 w-3.5 text-ide-accent" />
                          Working · {liveActivity.length} steps
                          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open/activity:rotate-180 motion-reduce:transition-none" />
                        </summary>
                        <ol className="ml-4 mt-2 space-y-2 border-l border-ide-border-strong py-1 pl-4">
                          {liveActivity.map((step) => {
                            const StepIcon = phasePresentation[step.phase].icon;
                            return (
                              <li key={step.id} className="relative flex gap-2 text-xs text-ide-text-secondary">
                                <span className="absolute -left-[21px] flex h-3 w-3 items-center justify-center rounded-full bg-ide-bg">
                                  {step.status === "complete" ? (
                                    <CheckCircle2 className="h-3 w-3 text-ide-success" />
                                  ) : (
                                    <StepIcon className={`h-3 w-3 ${step.status === "failed" ? "text-ide-danger" : "text-ide-accent"}`} />
                                  )}
                                </span>
                                <span className="font-medium text-ide-text-strong">
                                  {phasePresentation[step.phase].label}
                                </span>
                                <span>{step.detail}</span>
                              </li>
                            );
                          })}
                        </ol>
                      </details>
                    )}
                    {streamingText && (
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-[1.7] text-ide-text-strong">
                        {streamingText}
                      </p>
                    )}
                  </section>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        {!isLatestVisible && (
          <button
            type="button"
            onClick={() => {
              setIsLatestVisible(true);
              const messages = messagesRef.current;
              messages?.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
            }}
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-ide-border-strong bg-ide-panel px-4 py-2 text-xs font-medium text-ide-text-strong shadow-lg transition-colors duration-150 hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
          >
            Jump to latest
          </button>
        )}
      </div>

      <footer
        className="z-10 shrink-0 border-t border-ide-border-strong bg-ide-panel px-3 pt-3 sm:px-6 sm:pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="mx-auto w-full max-w-[820px]">
          {contextChips.length > 0 && (
            <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
              {contextChips.map((chip) => (
                <span
                  key={chip.id}
                  title={chip.label}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ide-border-strong bg-ide-surface px-2.5 py-1 text-xs text-ide-text-secondary"
                >
                  <FileCode className="h-3.5 w-3.5 shrink-0 text-ide-text-secondary" />
                  <span className="max-w-[14rem] truncate">{chip.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label} context`}
                    onClick={() =>
                      setContextChips((current) =>
                        current.filter((item) => item.id !== chip.id),
                      )
                    }
                    className="rounded-full p-0.5 text-ide-text-secondary transition-colors duration-150 hover:bg-ide-accent/15 hover:text-ide-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={handleSend}
            className="rounded-xl border border-ide-border-strong bg-ide-surface p-2 shadow-[0_8px_24px_color-mix(in_srgb,var(--ide-color-shadow-color)_16%,transparent)] transition-[border-color,box-shadow] duration-150 focus-within:border-ide-accent focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ide-color-accent)_16%,transparent)]"
          >
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputQuery}
              onChange={(event) => {
                setInputQuery(event.target.value);
                resizeComposer();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={4096}
              aria-label="Ask the AI assistant"
              placeholder="Ask about your code or describe a change..."
              className="max-h-48 min-h-12 w-full resize-none overflow-y-hidden bg-transparent px-3 py-2 text-[15px] leading-6 text-ide-text-strong placeholder:text-ide-text-secondary focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 border-t border-ide-border-subtle px-2 pt-2">
              <span className="text-xs text-ide-text-secondary">
                Enter to send · Shift+Enter for a new line
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-[11px] tabular-nums text-ide-text-secondary sm:inline">
                  {inputQuery.length}/4,096
                </span>
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!inputQuery.trim() || isGenerating}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-ide-accent text-ide-accent-fg transition-colors duration-150 hover:bg-ide-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ide-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </form>
          <div className="mt-1.5 flex justify-end px-1 text-[11px] text-ide-text-secondary">
            <span>Code isolation enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
