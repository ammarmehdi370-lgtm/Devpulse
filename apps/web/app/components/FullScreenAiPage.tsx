"use client";

import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Plus,
  ChevronDown,
  FileCode,
  Package,
  GitBranch,
  ShieldCheck,
  CornerDownLeft,
  Activity,
  BrainCircuit,
  Code2,
  Globe,
  Terminal,
  Loader2,
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

export const FullScreenAiPage: React.FC = () => {
  const { theme, user, setPage, applyDiffToActiveFile } = useApp();

  const [selectedModel, setSelectedModel] = useState("Claude Sonnet 4.6");
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.95);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveActivity, setLiveActivity] = useState<ActivityStep[]>([]);
  const [streamingText, setStreamingText] = useState("");

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
      text: "Identified the issue in login.js . The token verification promise was not properly awaited before setting the session cookie, resulting in an unhandled race condition where requests were rejected with 401 Unauthorized .",
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
      codeFilename: "JavaScript - login.js",
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

    setChatMessages((previous) => [...previous, userMsg]);
    setInputQuery("");
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

      if (!streamCompleted)
        throw new Error("The AI response ended unexpectedly.");
      if (!responseText.trim()) responseText = "The AI returned no text.";
      requestActivity = requestActivity.map((step) => ({
        ...step,
        status: "complete",
      }));
      setLiveActivity(requestActivity);

      const aiMsg: ChatMessage = {
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
      };
      setChatMessages((previous) => [...previous, aiMsg]);
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
          codeFilename: "AI error",
          codeSnippet: "",
          generationStats: "Request failed",
          activity: requestActivity,
        },
      ]);
      setStreamingText("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (snippet: string) => {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#09090e] font-sans text-[#d6d6e6]">
      <div className="z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#242432] bg-[#0f0f17] px-4 py-2.5 sm:px-6">
        {/* Left: AI Assistant Version & Model Switcher */}
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex shrink-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#09090e]"
              style={{ backgroundColor: theme.primary }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-white">
                AI Assistant
              </h1>
              <span className="text-[10px] text-[#85859e]">
                Devpulse Studio
              </span>
            </div>
            <span className="rounded-full border border-[#0DF5C4]/25 bg-[#0DF5C4]/10 px-2 py-0.5 font-mono text-[9px] text-[#0DF5C4]">
              v4.4
            </span>
          </div>

          {/* Model Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={isModelDropdownOpen}
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex max-w-full items-center gap-2 overflow-hidden rounded-lg border border-[#303040] bg-[#171720] px-3 py-2 text-xs text-white transition-colors hover:border-[#47475a] hover:bg-[#1b1b26]"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#0DF5C4]" />
              <span className="truncate font-medium">{selectedModel}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#85859e]" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute left-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-[#303040] bg-[#15151e] py-1 text-xs shadow-2xl">
                {[
                  "Claude Sonnet 4.6",
                  "GPT-4o (Omni Fast)",
                  "CodeLlama 70B (Local MicroVM)",
                ].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedModel(m);
                      setIsModelDropdownOpen(false);
                    }}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-white transition hover:bg-[#22222d]"
                  >
                    <span>{m}</span>
                    {selectedModel === m && (
                      <Check className="w-3.5 h-3.5 text-[#0DF5C4]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Hyperparameters & New Chat */}
        <div className="flex items-center gap-2 text-[#9292a9] sm:gap-4">
          <div className="hidden items-center gap-3 font-mono text-[10px] lg:flex">
            <span>
              Temp: <strong className="text-white">{temperature}</strong>
            </span>
            <span>·</span>
            <span>
              Top-p: <strong className="text-white">{topP}</strong>
            </span>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => {
              setChatMessages([]);
              setLiveActivity([]);
              setStreamingText("");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#303040] bg-[#191923] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#22222d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Active Context Chips Bar (Pixel-Perfect to Screenshot 3) */}
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-[#20202d] bg-[#0b0b12] px-4 sm:px-6">
        <div className="flex min-w-max items-center gap-2 sm:gap-3">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-wider text-[#85859e]">
            ACTIVE CONTEXT
          </span>

          <span className="flex items-center gap-1.5 rounded-md border border-[#29293a] bg-[#15151e] px-2.5 py-1.5 text-[10px] text-[#c4c4dc]">
            <FileCode className="h-3 w-3 text-[#69a9ef]" />
            <span>src/auth/login.js</span>
          </span>

          <span className="flex items-center gap-1.5 rounded-md border border-[#29293a] bg-[#15151e] px-2.5 py-1.5 text-[10px] text-[#0DF5C4]">
            <Package className="h-3 w-3" />
            <span>auth-service</span>
          </span>

          <span className="flex items-center gap-1.5 rounded-md border border-[#29293a] bg-[#15151e] px-2.5 py-1.5 text-[10px] text-[#FF9E64]">
            <GitBranch className="h-3 w-3" />
            <span>fix/jwt-expiry</span>
          </span>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] text-[#85859e] sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0DF5C4]" />
          <span>3 context items</span>
        </div>
      </div>

      {/* Main Chat Conversation Area (Pixel-Perfect to Screenshot 3) */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto w-full max-w-4xl space-y-4 select-text">
          {chatMessages.map((msg) => (
            <article key={msg.id} className="space-y-3">
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${msg.isUser ? "text-white" : "text-[#c5c1ff]"}`}
                  >
                    {msg.sender}
                  </span>
                  {!msg.isUser && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#6C63FF]/20 text-[#c8c4ff] border border-[#6C63FF]/40">
                      {msg.model}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-[#77778f]">
                  {msg.time}
                </span>
              </div>

              {/* User message balloon */}
              {msg.isUser ? (
                <div className="ml-auto max-w-2xl rounded-xl border border-[#353548] bg-[#191923] px-4 py-3 text-sm leading-6 text-white">
                  {msg.text}
                </div>
              ) : (
                /* AI Response Container */
                <div className="space-y-4 rounded-xl border border-[#29293a] bg-[#111119] p-4 sm:p-5">
                  {msg.activity && msg.activity.length > 0 && (
                    <details className="group rounded-md border border-[#29293a] bg-[#0d0d14]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[10px] text-[#a0a0b5] [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-[#0DF5C4]" />{" "}
                          Activity · {msg.activity.length} steps
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                      </summary>
                      <ol className="space-y-2 border-t border-[#242432] px-3 py-2.5">
                        {msg.activity.map((step) => {
                          const StepIcon = phasePresentation[step.phase].icon;
                          return (
                            <li
                              key={step.id}
                              className="flex items-center gap-2 text-[10px] text-[#9d9daf]"
                            >
                              <StepIcon
                                className={`h-3.5 w-3.5 ${step.status === "failed" ? "text-[#fb7185]" : "text-[#0DF5C4]"}`}
                              />
                              <span className="font-medium text-[#d0d0df]">
                                {phasePresentation[step.phase].label}
                              </span>
                              <span className="truncate">{step.detail}</span>
                              {step.status === "failed" ? (
                                <span className="ml-auto shrink-0 text-[#fb7185]">
                                  Failed
                                </span>
                              ) : (
                                <Check className="ml-auto h-3 w-3 shrink-0 text-[#0DF5C4]" />
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#d0d0e4]">
                    {msg.text}
                  </p>

                  {/* Embedded Syntax Highlighted Code Box */}
                  {msg.hasCode && (
                    <details className="group overflow-hidden rounded-lg border border-[#29293a] bg-[#0b0b12] font-mono text-xs">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#13131f] px-4 py-3 text-[11px] transition-colors hover:bg-[#181823] [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2 text-white">
                          <Code2 className="h-3.5 w-3.5 shrink-0 text-[#0DF5C4]" />
                          <span className="truncate">{msg.codeFilename}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[10px] text-[#9292a9]">
                          Code preview
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="border-t border-[#29293a]">
                        <div className="flex items-center justify-between gap-3 border-b border-[#202030] bg-[#101018] px-4 py-2 text-[11px]">
                          <span className="text-[10px] text-[#85859e]">
                            Suggested change
                          </span>
                          <div className="flex items-center gap-3 text-[#8b8ba8]">
                            <button
                              onClick={() => handleCopyCode(msg.codeSnippet!)}
                              className="hover:text-white flex items-center gap-1"
                            >
                              {copied ? (
                                <Check className="w-3.5 h-3.5 text-[#0DF5C4]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={() => {
                                void applyDiffToActiveFile(
                                  msg.codeSnippet || "",
                                ).then(() => {
                                  setApplied(true);
                                  setPage("editor");
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 text-white font-semibold flex items-center gap-1"
                            >
                              <span>Insert at Cursor</span>
                            </button>
                          </div>
                        </div>

                        <pre className="max-h-[min(24vh,180px)] overflow-auto overscroll-contain p-4 text-[11px] leading-relaxed text-[#d6d6e8]">
                          <code>{msg.codeSnippet}</code>
                        </pre>

                        <div className="flex items-center justify-between border-t border-[#1a1a28] bg-[#0d0d16] px-4 py-2 font-mono text-[11px] text-[#6c6c88]">
                          <span className="flex items-center gap-1 text-[#0DF5C4]">
                            <Check className="h-3 w-3" />{" "}
                            {applied ? "Inserted in editor" : "Ready to insert"}
                          </span>
                          <span>{msg.generationStats}</span>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </article>
          ))}
          {isGenerating && (
            <section
              aria-live="polite"
              aria-label="AI activity"
              className="rounded-xl border border-[#2d2d3d] bg-[#111119] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Activity className="h-4 w-4 text-[#0DF5C4]" />
                  Working on your request
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-[#0DF5C4]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Live
                </span>
              </div>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {liveActivity.map((step) => {
                  const StepIcon = phasePresentation[step.phase].icon;
                  return (
                    <li
                      key={step.id}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[11px] ${step.status === "active" ? "border-[#0DF5C4]/30 bg-[#0DF5C4]/5 text-white" : "border-[#29293a] bg-[#0d0d14] text-[#a0a0b5]"}`}
                    >
                      {step.status === "active" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0DF5C4]" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5 text-[#0DF5C4]" />
                      )}
                      <span className="font-medium">
                        {phasePresentation[step.phase].label}
                      </span>
                      <span className="ml-auto truncate text-[#85859e]">
                        {step.detail}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {streamingText && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#c9c9d8]">
                  {streamingText}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#242432] pt-3">
                <span className="mr-1 text-[10px] text-[#77778f]">Tools</span>
                <span
                  title="Web search is not connected to this AI service"
                  className="flex items-center gap-1.5 rounded-md border border-[#29293a] px-2 py-1 text-[10px] text-[#77778f]"
                >
                  <Globe className="h-3 w-3" /> Web search unavailable
                </span>
                <span
                  title="Terminal execution is not connected to this AI service"
                  className="flex items-center gap-1.5 rounded-md border border-[#29293a] px-2 py-1 text-[10px] text-[#77778f]"
                >
                  <Terminal className="h-3 w-3" /> Terminal unavailable
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Bottom AI Input Dock (Pixel-Perfect to Screenshot 3) */}
      <div className="shrink-0 border-t border-[#242432] bg-[#0f0f17] px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-4xl space-y-2.5">
          {/* Tagged Files Bar */}
          <div className="flex items-center gap-2 overflow-x-auto text-[10px]">
            <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#29293a] bg-[#15151e] px-2.5 py-1.5 text-[#9ac7f5]">
              <FileCode className="h-3 w-3" /> @login.js
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#29293a] bg-[#15151e] px-2.5 py-1.5 text-[#FFAE80]">
              <Package className="h-3 w-3" /> @package.json
            </span>
          </div>

          {/* Prompt Form */}
          <form
            onSubmit={handleSend}
            className="relative rounded-xl border border-[#343444] bg-[#15151e] p-2 transition-colors focus-within:border-[#0DF5C4]/60"
          >
            <textarea
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={4096}
              aria-label="Ask the AI assistant"
              placeholder="Ask about your code or describe a change..."
              className="max-h-32 min-h-14 w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 text-white placeholder-[#77778f] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[#29293a] px-2 pt-2">
              <span className="text-[10px] text-[#77778f]">
                Enter to send · Shift+Enter for new line
              </span>
              <div className="flex items-center gap-3">
                <span className="hidden text-[10px] text-[#77778f] sm:inline">
                  {inputQuery.length}/4,096
                </span>
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold text-[#09090e] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: theme.primary }}
                >
                  <span>{isGenerating ? "Working" : "Send"}</span>
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CornerDownLeft className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Footer Telemetry & Security note */}
          <div className="flex items-center justify-end px-1 text-[10px] text-[#77778f]">
            <span className="flex items-center gap-1.5 text-[#0DF5C4]">
              <ShieldCheck className="h-3 w-3" /> Code isolation enabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
