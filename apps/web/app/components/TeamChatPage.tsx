"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { useHuddle } from "../context/HuddleContext";
import {
  chatService,
  type ChatChannel,
  type ChatMessage,
  type ChatPerson,
  type ChatVisibility,
} from "../services/chatService";
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
  ChevronRight,
  Headphones,
  UserRound,
  LockKeyhole,
  X,
  MoreHorizontal,
  SmilePlus,
  MessageSquare,
  Pencil,
  Trash2,
  Bookmark,
  BellOff,
  Bell,
  Pin,
  Link2,
  Copy,
  Forward,
  CornerDownRight,
  CalendarClock,
  Check,
  Search,
} from "lucide-react";
import { FriendlyHint, HelpfulInfo, friendlyConfirm } from "./FriendlyHelpers";
import { ChatListSkeleton } from "./SkeletonLoaders";
import { EmojiPicker } from "./chat/EmojiPicker";
import { ChatModal } from "./chat/ChatModal";

const formatHuddleDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

const HuddlePanel = dynamic(
  () => import("./HuddlePanel").then((module) => module.HuddlePanel),
  { ssr: false },
);

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
  const { theme, user, addToast } = useApp();
  const huddle = useHuddle();
  const chatAreaRef = useRef<HTMLElement>(null);
  const startHuddleAction = huddle.start;
  const editorRef = useRef<HTMLDivElement>(null);
  const channelTriggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const threadMobileInputRef = useRef<HTMLTextAreaElement>(null);
  const threadDesktopInputRef = useRef<HTMLTextAreaElement>(null);
  const [channels, setChannels] = useState<ChatChannel[]>(chatService.listChannels);
  const [directMessagePeople, setDirectMessagePeople] = useState<ChatPerson[]>(
    chatService.listDirectMessages,
  );
  const [activeChannel, setActiveChannel] = useState("frontend");
  const [activeDirectMessage, setActiveDirectMessage] = useState<string | null>(
    null,
  );
  const [, setMessageVersion] = useState(0);
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [isHuddlePanelOpen, setIsHuddlePanelOpen] = useState(() => {
    try {
      const saved = typeof window === "undefined"
        ? null
        : window.localStorage.getItem("devpulse-huddle-expanded");
      return saved === null ? huddle.active : saved === "true";
    } catch (error) {
      console.error("Unable to restore huddle preferences.", error);
      return huddle.active;
    }
  });
  const [huddleElapsed, setHuddleElapsed] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelVisibility, setChannelVisibility] =
    useState<ChatVisibility>("public");
  const [channelMembers, setChannelMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isDmPickerOpen, setIsDmPickerOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [dmHighlight, setDmHighlight] = useState(0);
  const [menuMessage, setMenuMessage] = useState<ChatMessage | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [emojiMessage, setEmojiMessage] = useState<ChatMessage | null>(null);
  const [emojiPosition, setEmojiPosition] = useState({ x: 0, y: 0 });
  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [forwardTarget, setForwardTarget] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const [reminderMessage, setReminderMessage] = useState<ChatMessage | null>(null);
  const [reminderDueAt, setReminderDueAt] = useState("");
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);
  const [reminderVersion, setReminderVersion] = useState(0);
  const [, setTodoVersion] = useState(0);
  const [isTodosOpen, setIsTodosOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [undoMessage, setUndoMessage] = useState<{
    threadId: string;
    message: ChatMessage;
    replyToId?: string;
  } | null>(null);
  const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null);
  const [isMessageEmpty, setIsMessageEmpty] = useState(true);
  const [touchMessageId, setTouchMessageId] = useState<string | null>(null);
  const dmPeople = useMemo(
    () => (dmQuery ? chatService.searchPeople(dmQuery) : chatService.listPeople()),
    [dmQuery],
  );
  const activeThreadId = activeDirectMessage
    ? `dm:${activeDirectMessage}`
    : `channel:${activeChannel}`;
  const messages = chatService.listMessages(activeThreadId);
  const threadReplies = threadParent
    ? chatService.getThreadReplies(threadParent.id)
    : [];
  const pinnedMessages = chatService.listPinnedMessages(activeThreadId);
  const todos = chatService.listTodos();
  const normalizedChannelName = channelName
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, "-");
  const channelNameError = !normalizedChannelName
    ? "Channel name is required."
    : !/^[a-z0-9_-]{1,80}$/.test(normalizedChannelName)
      ? "Use up to 80 lowercase letters, numbers, hyphens, or underscores."
      : channels.some((channel) => channel.name === normalizedChannelName)
        ? "A channel with this name already exists."
        : "";
  const refreshData = () => {
    setChannels(chatService.listChannels());
    setDirectMessagePeople(chatService.listDirectMessages());
    setMessageVersion((version) => version + 1);
  };

  const notifyError = (action: string, error: unknown) => {
    console.error(`Unable to ${action}.`, error);
    addToast({
      type: "error",
      title: "Chat action failed",
      description: `Unable to ${action}. Please try again.`,
    });
  };

  const openMessageMenu = (
    message: ChatMessage,
    event: React.MouseEvent | React.KeyboardEvent,
  ) => {
    event.preventDefault();
    const bounds =
      "clientX" in event
        ? { x: event.clientX, y: event.clientY }
        : (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuMessage(message);
    setReminderMenuOpen(false);
    setMenuPosition({
      x: Math.max(8, Math.min(bounds.x, window.innerWidth - 272)),
      y: Math.max(8, Math.min(bounds.y, window.innerHeight - 520)),
    });
  };

  const openEmojiPicker = (message: ChatMessage, x?: number, y?: number) => {
    setEmojiMessage(message);
    setEmojiPosition({
      x: Math.max(8, Math.min(x ?? window.innerWidth - 340, window.innerWidth - 300)),
      y: Math.max(8, Math.min(y ?? 180, window.innerHeight - 360)),
    });
    setMenuMessage(null);
  };

  const toggleMessageReaction = (
    message: ChatMessage,
    emoji: string,
    threadId = activeThreadId,
  ) => {
    try {
      chatService.toggleReaction(threadId, message.id, emoji, user.name);
      refreshData();
    } catch (error) {
      notifyError("add the reaction", error);
    }
    setEmojiMessage(null);
  };

  const openThread = (message: ChatMessage) => {
    chatService.setReplyThread(message.id);
    setThreadParent(message);
    setMenuMessage(null);
    window.requestAnimationFrame(() => {
      const input = window.matchMedia("(min-width: 768px)").matches
        ? threadDesktopInputRef.current
        : threadMobileInputRef.current;
      input?.focus();
    });
  };
  const closeThread = useCallback(() => {
    chatService.setReplyThread(null);
    setThreadParent(null);
  }, []);

  const completeEdit = (message: ChatMessage) => {
    const text = editingText.trim();
    if (!text) return;
    try {
      chatService.editMessage(activeThreadId, message.id, text);
      refreshData();
      addToast({ type: "success", title: "Message edited" });
    } catch (error) {
      notifyError("edit the message", error);
    }
    setEditingMessageId(null);
  };

  const setReminder = (
    message: ChatMessage,
    duration: number | "tomorrow" | "monday",
  ) => {
    const now = new Date();
    const due = new Date(now);
    if (duration === "tomorrow") {
      due.setDate(due.getDate() + 1);
      due.setHours(9, 0, 0, 0);
    } else if (duration === "monday") {
      const days = ((8 - due.getDay()) % 7) || 7;
      due.setDate(due.getDate() + days);
      due.setHours(9, 0, 0, 0);
    } else {
      due.setTime(now.getTime() + duration);
    }
    try {
      chatService.setReminder(activeThreadId, message.id, due.getTime());
      setReminderVersion((version) => version + 1);
      addToast({ type: "success", title: "Reminder set" });
    } catch (error) {
      notifyError("set the reminder", error);
    }
    setMenuMessage(null);
  };

  const handleMenuAction = (action: string, message = menuMessage) => {
    if (!message) return;
    const isMine = message.sender === user.name;
    try {
      switch (action) {
        case "reaction":
          openEmojiPicker(message, menuPosition.x, menuPosition.y);
          return;
        case "thread":
          openThread(message);
          return;
        case "forward":
          setForwardMessage(message);
          setForwardTarget("");
          setForwardNote("");
          setMenuMessage(null);
          return;
        case "reminder":
          setReminderMenuOpen((open) => !open);
          return;
        case "reminder-custom":
          setReminderMessage(message);
          setReminderDueAt("");
          setMenuMessage(null);
          return;
        case "todo":
          chatService.addTodo(activeThreadId, message);
          setTodoVersion((version) => version + 1);
          addToast({ type: "success", title: "Added to To-do" });
          break;
        case "edit":
          if (isMine) {
            setEditingMessageId(message.id);
            setEditingText(message.text);
          }
          break;
        case "unread":
          chatService.markUnread(activeThreadId, message.id);
          setUnreadDividerId(message.id);
          setChannels(chatService.listChannels());
          addToast({ type: "info", title: "Marked unread" });
          break;
        case "saved": {
          const saved = chatService.toggleSaved(activeThreadId, message.id);
          refreshData();
          addToast({ type: "success", title: saved ? "Saved message" : "Removed from saved" });
          break;
        }
        case "notifications": {
          const disabled = chatService.toggleThreadNotifications(activeThreadId, message.id);
          refreshData();
          addToast({ type: "info", title: disabled ? "Reply notifications off" : "Reply notifications on" });
          break;
        }
        case "pin": {
          const pinned = chatService.togglePin(activeThreadId, message.id);
          refreshData();
          addToast({ type: "success", title: pinned ? "Pinned to conversation" : "Unpinned message" });
          break;
        }
        case "copy-link":
          void navigator.clipboard.writeText(
            `${window.location.origin}/?page=chat&thread=${encodeURIComponent(activeThreadId)}&message=${encodeURIComponent(message.id)}`,
          ).then(
            () => addToast({ type: "success", title: "Link copied" }),
            (error) => notifyError("copy the link", error),
          );
          break;
        case "copy":
          void navigator.clipboard.writeText(message.text).then(
            () => addToast({ type: "success", title: "Message copied" }),
            (error) => notifyError("copy the message", error),
          );
          break;
        case "delete":
          if (isMine) {
            void friendlyConfirm("Delete this message? This action can be undone for 5 seconds.").then((confirmed) => {
              if (!confirmed) return;
              try {
                const replyToId = threadParent &&
                  chatService.getThreadReplies(threadParent.id).some((reply) => reply.id === message.id)
                  ? threadParent.id
                  : undefined;
                const deleted = chatService.deleteMessage(activeThreadId, message.id);
                if (deleted) {
                  setUndoMessage({ threadId: activeThreadId, message: deleted, replyToId });
                }
                refreshData();
                addToast({ type: "success", title: "Message deleted" });
                window.setTimeout(() => setUndoMessage(null), 5000);
              } catch (error) {
                notifyError("delete the message", error);
              }
            });
          }
          break;
        default:
          break;
      }
    } catch (error) {
      notifyError("complete the action", error);
    }
    setMenuMessage(null);
  };
  const menuActionRef = useRef(handleMenuAction);
  menuActionRef.current = handleMenuAction;

  const createChannel = () => {
    if (channelNameError) return;
    try {
      const channel = chatService.createChannel({
        name: normalizedChannelName,
        description: channelDescription,
        visibility: channelVisibility,
        members: channelMembers,
      });
      refreshData();
      selectChannel(channel.name);
      setIsCreateChannelOpen(false);
      setChannelName("");
      setChannelDescription("");
      setChannelMembers([]);
      setChannelVisibility("public");
      addToast({ type: "success", title: `Channel #${channel.name} created` });
    } catch (error) {
      notifyError("create the channel", error);
    }
  };
  const closeCreateChannel = () => {
    setIsCreateChannelOpen(false);
    setChannelName("");
    setChannelDescription("");
    setChannelVisibility("public");
    setChannelMembers([]);
    setMemberSearch("");
  };

  const choosePerson = (person: ChatPerson) => {
    try {
      const dm = chatService.startDirectMessage(person);
      setDirectMessagePeople(chatService.listDirectMessages());
      selectDirectMessage(dm.name);
      setIsDmPickerOpen(false);
      setDmQuery("");
      setDmHighlight(0);
    } catch (error) {
      notifyError("open the direct message", error);
    }
  };

  const sendForward = () => {
    if (!forwardMessage || !forwardTarget) return;
    const sender = {
      sender: user.name,
      role: user.role,
      roleColor: "bg-ide-secondary/15 text-[var(--ide-color-secondary-readable)] border-ide-secondary/30",
      avatar: user.avatar,
    };
    try {
      chatService.forwardMessage(forwardTarget, forwardMessage, forwardNote.trim(), sender);
      refreshData();
      setForwardMessage(null);
      addToast({ type: "success", title: "Message forwarded" });
    } catch (error) {
      notifyError("forward the message", error);
    }
  };

  const sendThreadReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector<HTMLTextAreaElement>("textarea");
    const text = input?.value.trim();
    if (!threadParent || !text) return;
    try {
      chatService.replyToThread(activeThreadId, threadParent.id, {
        sender: user.name,
        role: user.role,
        roleColor: "bg-ide-secondary/15 text-[var(--ide-color-secondary-readable)] border-ide-secondary/30",
        avatar: user.avatar,
        text,
      });
      if (input) input.value = "";
      setMessageVersion((version) => version + 1);
      addToast({ type: "success", title: "Reply sent" });
    } catch (error) {
      notifyError("send the reply", error);
    }
  };

  const restoreDeletedMessage = () => {
    if (!undoMessage) return;
    try {
      chatService.restoreMessage(
        undoMessage.threadId,
        undoMessage.message,
        undoMessage.replyToId,
      );
      refreshData();
      addToast({ type: "success", title: "Message restored" });
    } catch (error) {
      notifyError("restore the message", error);
    }
    setUndoMessage(null);
  };

  useEffect(() => {
    chatService.setStorageScope(user.email);
    setChannels(chatService.listChannels());
    setDirectMessagePeople(chatService.listDirectMessages());
    setMessageVersion((version) => version + 1);
  }, [user.email]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsChatLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const startHuddle = () => {
      startHuddleAction();
      setIsHuddlePanelOpen(true);
    };
    window.addEventListener("devpulse:start-huddle", startHuddle);
    return () =>
      window.removeEventListener("devpulse:start-huddle", startHuddle);
  }, [startHuddleAction]);

  useEffect(() => {
    if (huddle.active) setIsHuddlePanelOpen(true);
  }, [huddle.active]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "devpulse-huddle-expanded",
        String(isHuddlePanelOpen),
      );
    } catch (error) {
      console.error("Unable to save huddle preferences.", error);
    }
  }, [isHuddlePanelOpen]);

  useEffect(() => {
    const startedAt = huddle.startedAt;
    if (!huddle.active || !startedAt) return;
    const updateElapsed = () =>
      setHuddleElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [huddle.active, huddle.startedAt]);

  useEffect(() => {
    if (!menuMessage) return;
    const focusFirst = () =>
      menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    window.requestAnimationFrame(focusFirst);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [],
      );
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuMessage(null);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        items[(index + delta + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuMessage]);

  useEffect(() => {
    if (!threadParent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeThread();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeThread, threadParent]);

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (reminder: ReturnType<typeof chatService.listReminders>[number]) => {
      const delay = reminder.dueAt - Date.now();
      if (delay > 0) {
        timers.push(
          window.setTimeout(
            () => schedule(reminder),
            Math.min(delay, 2_147_000_000),
          ),
        );
        return;
      }
      const message = chatService
        .listMessages(reminder.threadId)
        .find((item) => item.id === reminder.messageId);
      chatService.markReminderFired(reminder.id);
      if (message) {
        addToast({
          type: "info",
          title: `Reminder: message from ${message.sender}`,
          description: message.text,
        });
      }
    };
    chatService
      .listReminders()
      .filter((reminder) => !reminder.fired)
      .forEach(schedule);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [addToast, reminderVersion]);

  useEffect(() => {
    if (!undoMessage) return;
    const timeout = window.setTimeout(() => setUndoMessage(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [undoMessage]);

  useEffect(() => {
    if (!menuMessage) return;
    const shortcuts: Record<string, string> = {
      r: "reaction",
      t: "thread",
      f: "forward",
      e: "edit",
      u: "unread",
      a: "saved",
      l: "copy-link",
      p: "pin",
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        menuActionRef.current("copy", menuMessage);
        return;
      }
      const action = shortcuts[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        menuActionRef.current(action, menuMessage);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuMessage]);

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

    try {
      chatService.sendMessage(activeThreadId, {
      sender: user.name,
      role: user.role,
      roleColor: "bg-ide-secondary/15 text-[var(--ide-color-secondary-readable)] border-ide-secondary/30",
      avatar: user.avatar,
      text,
      richTextHtml: sanitizeMessageHtml(editor.innerHTML),
      });
      refreshData();
      editor.innerHTML = "";
      setIsMessageEmpty(true);
    } catch (error) {
      notifyError("send the message", error);
    }
  };

  const selectChannel = (channel: string) => {
    chatService.markRead(`channel:${channel}`);
    setChannels(chatService.listChannels());
    setUnreadDividerId(null);
    setActiveChannel(channel);
    setActiveDirectMessage(null);
    setIsChannelDetailsOpen(false);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setIsMessageEmpty(true);
  };

  const selectDirectMessage = (name: string) => {
    setActiveDirectMessage(name);
    setIsChannelDetailsOpen(false);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setIsMessageEmpty(true);
  };

  const renderMessageRow = (msg: ChatMessage, threadId = activeThreadId) => {
    const isMine = msg.sender === user.name;
    const replies = chatService.getThreadReplies(msg.id);
    const isFocused = touchMessageId === msg.id;
    return (
      <React.Fragment key={msg.id}>
        {(unreadDividerId === msg.id || msg.unread) && (
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-3" role="separator" aria-label="Unread messages">
            <span className="h-px flex-1 bg-ide-danger/60" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ide-danger-readable">Unread</span>
            <span className="h-px flex-1 bg-ide-danger/60" />
          </div>
        )}
        <article
          id={`chat-message-${msg.id}`}
          tabIndex={0}
          aria-label={`Message from ${msg.sender}`}
          onFocus={() => setTouchMessageId(msg.id)}
          onTouchStart={() => setTouchMessageId(msg.id)}
          onContextMenu={(event) => openMessageMenu(msg, event)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setTouchMessageId((current) => current === msg.id ? null : current);
            }
          }}
          onKeyDown={(event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
              event.preventDefault();
              handleMenuAction("copy", msg);
              return;
            }
            const shortcutActions: Record<string, string> = {
              r: "reaction",
              t: "thread",
              f: "forward",
              e: "edit",
              u: "unread",
              a: "saved",
              l: "copy-link",
              p: "pin",
            };
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              openThread(msg);
            } else if (shortcutActions[event.key.toLowerCase()]) {
              event.preventDefault();
              const action = shortcutActions[event.key.toLowerCase()]!;
              if (action === "edit" && !isMine) return;
              handleMenuAction(action, msg);
            } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
              openMessageMenu(msg, event);
            }
          }}
          className="group relative mx-auto flex w-full max-w-5xl items-start gap-3 rounded-lg border border-transparent px-3 py-4 transition-colors duration-150 hover:border-ide-border-subtle hover:bg-ide-surface-hover/40 focus-visible:border-ide-border-subtle focus-visible:bg-ide-surface-hover/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ide-focus-ring sm:gap-4 sm:px-4"
        >
          <div className="pointer-events-none absolute right-3 top-1 z-20 origin-top-right transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none sm:right-4">
            <div
              className={`flex items-center gap-0.5 rounded-full border border-ide-border-strong bg-ide-panel p-1 shadow-[0_8px_24px_var(--ide-color-shadow-panel)] transition-opacity duration-[120ms] motion-reduce:transition-none ${
                isFocused
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
              }`}
            >
              {[
                { emoji: "✅", label: "Check" },
                { emoji: "👀", label: "Eyes" },
                { emoji: "🙌", label: "Raised hands" },
              ].map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => toggleMessageReaction(msg, reaction.emoji, threadId)}
                  aria-label={`React with ${reaction.label}`}
                  title={`${reaction.label} reaction`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                >
                  {reaction.emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openEmojiPicker(msg, rect.right, rect.bottom + 4);
                }}
                aria-label="Add reaction"
                title="Add reaction (R)"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ide-text-soft hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <SmilePlus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => openThread(msg)}
                aria-label="Reply in thread"
                title="Reply in thread (T)"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ide-text-soft hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(event) => openMessageMenu(msg, event)}
                aria-label="More message actions"
                title="More actions"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ide-text-soft hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <Image
            src={msg.avatar}
            alt={msg.sender}
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            unoptimized
            className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-ide-focus-ring"
          />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-48 sm:pr-56">
              <span className="text-sm font-semibold text-ide-text-strong">{msg.sender}</span>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] ${msg.roleColor}`}>{msg.role}</span>
              <span className="font-mono text-[11px] text-ide-muted">{msg.time}</span>
              {msg.edited && <span className="text-[10px] text-ide-muted">(edited)</span>}
              {msg.saved && <Bookmark className="h-3.5 w-3.5 text-ide-accent" aria-label="Saved" />}
              {msg.pinned && <Pin className="h-3.5 w-3.5 text-ide-warning" aria-label="Pinned" />}
              {msg.notificationsOff && <BellOff className="h-3.5 w-3.5 text-ide-muted" aria-label="Reply notifications off" />}
            </div>
            {editingMessageId === msg.id ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  completeEdit(msg);
                }}
                className="flex flex-col gap-2"
              >
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setEditingMessageId(null);
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      completeEdit(msg);
                    }
                  }}
                  aria-label="Edit message"
                  className="min-h-20 w-full rounded-lg border border-ide-border-strong bg-ide-input-bg p-2 text-sm text-ide-text-strong focus:outline-none focus:ring-2 focus:ring-ide-focus-ring"
                />
                <div className="flex gap-2">
                  <button type="submit" className="rounded-md bg-ide-accent px-3 py-1.5 text-xs font-semibold text-ide-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Save</button>
                  <button type="button" onClick={() => setEditingMessageId(null)} className="rounded-md px-3 py-1.5 text-xs text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Cancel</button>
                </div>
              </form>
            ) : msg.richTextHtml ? (
              <div
                className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-ide-text-secondary [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_code]:rounded [&_code]:bg-ide-surface-toolbar [&_code]:px-1 [&_code]:font-mono [&_strong]:font-semibold [&_u]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeMessageHtml(msg.richTextHtml) }}
              />
            ) : (
              <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-6 text-ide-text-secondary">
                {msg.forwardedFrom && <span className="mb-1 block text-xs text-ide-muted">Forwarded from {msg.forwardedFrom.sender}</span>}
                {msg.text}
              </p>
            )}
            {msg.hasCode && (
              <details open className="group mt-3 max-w-4xl overflow-hidden rounded-lg border border-ide-border-strong bg-ide-workbench-bg">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-ide-panel px-3 py-2.5 text-ide-text-soft hover:bg-ide-surface-toolbar sm:px-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2 font-mono text-[11px]"><Code2 className="h-3.5 w-3.5 shrink-0 text-ide-success" /><span className="truncate">{msg.codeFilename}</span></span>
                  <span className="flex shrink-0 items-center gap-2 text-[10px] text-ide-muted">TypeScript<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span>
                </summary>
                <pre className="max-h-56 overflow-auto overscroll-contain border-t border-ide-border-strong p-4 font-mono text-[11px] leading-5 text-ide-text-secondary"><code>{msg.codeSnippet}</code></pre>
              </details>
            )}
            {msg.attachment && (
              <div className="mt-2 flex max-w-md items-center justify-between gap-3 rounded-lg border border-ide-border-strong bg-ide-panel p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ide-warning/30 bg-ide-warning/15 text-ide-warning"><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0 font-mono text-xs">
                    <div className="truncate font-medium text-ide-text-strong">{msg.attachment.name}</div>
                    <div className="mt-1 text-[10px] text-ide-muted">{msg.attachment.size} · {msg.attachment.sub}</div>
                  </div>
                </div>
                <Download className="h-4 w-4 shrink-0 text-ide-text-soft" />
              </div>
            )}
            {msg.reactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {msg.reactions.map((reaction) => {
                  const reacted = reaction.users.includes(user.name);
                  const names = reaction.users.join(", ");
                  const token = reaction.emoji === "👀" ? "eyes" : reaction.emoji;
                  return (
                    <button
                      key={reaction.emoji}
                      type="button"
                      onClick={() => toggleMessageReaction(msg, reaction.emoji, threadId)}
                      title={`${names} reacted with :${token}:`}
                      aria-label={`${reaction.emoji} ${reaction.count}; ${names || "No one"} reacted`}
                      aria-pressed={reacted}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${
                        reacted
                          ? "border-ide-accent bg-ide-accent-soft text-ide-text-strong"
                          : "border-ide-border-strong bg-ide-panel text-ide-text-secondary hover:bg-ide-surface-hover"
                      }`}
                    >
                      <span>{reaction.emoji}</span><span className="font-mono text-[10px]">{reaction.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {replies.length > 0 && (
              <button
                type="button"
                onClick={() => openThread(msg)}
                className="flex items-center gap-2 pt-1 text-xs font-medium text-ide-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
                <span className="text-ide-muted">{replies[replies.length - 1]?.time}</span>
                <span className="flex -space-x-1">
                  {replies.slice(-3).map((reply) => <Image key={reply.id} src={reply.avatar} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] rounded-full border border-ide-panel object-cover" />)}
                </span>
              </button>
            )}
          </div>
        </article>
      </React.Fragment>
    );
  };

  const renderThreadPanel = (
    inputRef: React.RefObject<HTMLTextAreaElement>,
    className = "",
  ) => threadParent && (
    <section
      aria-label="Thread replies"
      className={`flex min-h-0 flex-col border-ide-border-strong bg-ide-workbench-bg shadow-[0_16px_44px_var(--ide-color-shadow-strong)] motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200 motion-reduce:animate-none ${className}`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-ide-border-strong px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ide-text-strong">Thread</h2>
          <p className="mt-0.5 text-[10px] text-ide-muted">{threadReplies.length} replies</p>
        </div>
        <button type="button" onClick={closeThread} aria-label="Close thread" title="Close thread" className="flex h-8 w-8 items-center justify-center rounded-lg text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {renderMessageRow(threadParent)}
        {threadReplies.length > 0 ? (
          <div className="mt-2 border-t border-ide-border-control pt-2">
            {threadReplies.map((reply) => renderMessageRow(reply))}
          </div>
        ) : (
          <p className="px-4 py-5 text-xs text-ide-text-soft">Start the conversation in this thread.</p>
        )}
      </div>
      <form onSubmit={sendThreadReply} className="shrink-0 border-t border-ide-border-control p-3">
        <textarea
          ref={inputRef}
          aria-label="Reply to thread"
          placeholder="Reply in thread..."
          rows={2}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          className="w-full resize-none rounded-lg border border-ide-border-strong bg-ide-panel p-2.5 text-xs text-ide-text-strong placeholder:text-ide-text-muted focus:outline-none focus:ring-2 focus:ring-ide-focus-ring"
        />
        <div className="mt-2 flex justify-end">
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-ide-accent px-3 py-2 text-xs font-semibold text-ide-accent-fg hover:bg-ide-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
            Reply <CornerDownRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </section>
  );

  return (
    <>
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden font-sans md:flex-row">
      <div className="w-full border-b border-ide-border-control bg-ide-workbench-bg px-4 py-2 md:hidden">
        <FriendlyHint
          title="Team chat"
          body="Use this space to comment, share updates, and keep the team aligned on the project."
        />
      </div>
      <aside className="order-1 flex max-h-52 w-full shrink-0 flex-col overflow-y-auto border-b border-ide-border-control bg-ide-workbench-bg p-3 md:order-2 md:max-h-none md:w-60 md:border-b-0 md:border-l md:border-r-0 xl:w-64">
        {threadParent ? renderThreadPanel(threadDesktopInputRef, "hidden h-full md:flex") : (
        <div className="space-y-4 md:space-y-6">
          {/* Workspace Title */}
          <div className="flex items-center justify-between rounded-xl border border-ide-border-strong bg-ide-panel px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ide-info text-xs font-bold text-[var(--ide-color-secondary-fg)]">
                M
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight text-ide-text-strong">
                  MyStartup
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-ide-success">
                  ● PRO Tier · 14 Devs
                </div>
              </div>
            </div>
            <span className="text-ide-muted text-xs">▼</span>
          </div>

          {/* Channels */}
          <div>
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-ide-muted">
              <span>Channels · {channels.length}</span>
              <button
                type="button"
                aria-label="Add channel"
                ref={channelTriggerRef}
                onClick={() => setIsCreateChannelOpen(true)}
                title="Create channel"
                className="rounded p-1 text-ide-text-soft transition hover:bg-ide-surface-toolbar hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {channels.map((channel) => {
                const ch = channel.name;
                const isActive = activeChannel === ch && !activeDirectMessage;
                return (
                  <div key={channel.id}>
                    <div
                      className={`flex items-center rounded-lg text-xs transition-colors ${
                        isActive
                          ? "bg-ide-surface-toolbar font-medium text-ide-text-strong ring-1 ring-inset ring-ide-focus-ring"
                          : "text-ide-text-soft hover:bg-ide-panel hover:text-ide-text"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectChannel(ch)}
                        aria-current={isActive ? "page" : undefined}
                        title={channel.visibility === "private" ? `Private channel #${ch}` : `#${ch}`}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                      >
                        {channel.visibility === "private" ? (
                          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-ide-text-soft" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 shrink-0 text-ide-text-soft" />
                        )}
                        <span className="truncate">{ch}</span>
                        {channel.unread && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ide-accent" aria-label="Unread" />}
                      </button>
                      <button
                        type="button"
                        aria-label={`${isChannelDetailsOpen && isActive ? "Hide" : "Show"} #${ch} details`}
                        aria-expanded={isActive && isChannelDetailsOpen}
                        onClick={() => {
                          setActiveChannel(ch);
                          setActiveDirectMessage(null);
                          setIsChannelDetailsOpen(
                            isActive ? !isChannelDetailsOpen : true,
                          );
                        }}
                        className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ide-muted transition hover:bg-ide-surface hover:text-ide-text-strong"
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${isActive && isChannelDetailsOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                    </div>
                    {isActive && isChannelDetailsOpen && (
                      <div className="mx-1 mt-2 space-y-4 rounded-lg border border-ide-border-strong bg-ide-panel p-3 text-[11px]">
                        <section>
                          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ide-muted">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3 w-3" /> Team · {chatService.listPeople().length}
                            </span>
                            <span className="text-ide-success">{chatService.listPeople().filter((person) => person.status === "online").length} active</span>
                          </div>
                          <div className="space-y-2">
                            {chatService.listPeople().map((member) => (
                              <div
                                key={member.name}
                                className="flex min-w-0 items-center justify-between gap-2"
                              >
                                <span className="flex min-w-0 items-center gap-2 font-medium text-ide-text-strong">
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${member.status === "online" ? "bg-ide-success" : member.status === "bot" ? "bg-ide-info" : "bg-ide-warning"}`}
                                  />
                                  <span className="truncate">
                                    {member.name}
                                  </span>
                                </span>
                                <span className="shrink-0 text-right text-[9px] text-ide-muted">
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                        <section className="border-t border-ide-border-strong pt-3">
                          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ide-muted">
                            Pinned · {pinnedMessages.length}
                          </div>
                          <div className="space-y-2">
                            {pinnedMessages.length ? pinnedMessages.map((message) => (
                              <div key={message.id} className="rounded-md border border-ide-border-strong bg-ide-panel p-2">
                                <div className="mb-1 text-[10px] text-ide-muted">{message.sender} · {message.time}</div>
                                <div className="leading-relaxed text-ide-text-secondary">{message.text}</div>
                              </div>
                            )) : <p className="text-[10px] text-ide-muted">No pinned messages yet.</p>}
                          </div>
                        </section>
                        <section className="border-t border-ide-border-strong pt-3">
                          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ide-muted">
                            Shared files · 18
                          </div>
                          <div className="space-y-2 text-ide-text-tertiary">
                            {[
                              {
                                name: "edge-benchmarks-v2.4.json",
                                size: "142 KB",
                                color: "text-ide-warning",
                              },
                              {
                                name: "ui-layout-specs-v3.png",
                                size: "1.4 MB",
                                color: "text-ide-success",
                              },
                              {
                                name: "tailwind-tokens.json",
                                size: "26 KB",
                                color: "text-ide-info",
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
                                <span className="shrink-0 text-[9px] text-ide-muted">
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
          <div className="block">
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-mono uppercase tracking-wider text-ide-muted">
              <span>Direct messages</span>
              <button
                type="button"
                aria-label="Add direct message"
                onClick={() => setIsDmPickerOpen(true)}
                title="New direct message"
                className="rounded p-1 text-ide-text-soft transition hover:bg-ide-surface-toolbar hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {directMessagePeople.map((dm) => (
                <button
                  type="button"
                  key={dm.name}
                  onClick={() => selectDirectMessage(dm.name)}
                  aria-current={activeDirectMessage === dm.name ? "page" : undefined}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-ide-text-soft transition-colors hover:bg-ide-panel hover:text-ide-text ${
                    activeDirectMessage === dm.name
                      ? "bg-ide-surface-toolbar font-medium text-ide-text-strong ring-1 ring-inset ring-ide-focus-ring"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {dm.isBot ? (
                      <Bot className="h-3.5 w-3.5 text-ide-info" />
                    ) : (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dm.status === "online" ? "bg-ide-success" : "bg-ide-warning"}`} />
                    )}
                    {dm.avatar ? (
                      <Image src={dm.avatar} alt="" width={20} height={20} unoptimized className="h-5 w-5 rounded-full object-cover" />
                    ) : null}
                    <span className="truncate">{dm.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="relative mt-3 border-t border-ide-border-control pt-3">
              <button
                type="button"
                onClick={() => setIsTodosOpen((open) => !open)}
                aria-expanded={isTodosOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-ide-text-soft hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <span>Saved items / To-do</span>
                <span className="rounded-full border border-ide-border-strong bg-ide-panel px-2 py-0.5 font-mono text-[10px] text-ide-text-secondary">
                  {todos.length}
                </span>
              </button>
              {isTodosOpen && (
                <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-ide-border-strong bg-ide-panel p-2">
                  {todos.length ? todos.map((todo, index) => (
                    <p key={`${todo.messageId}-${index}`} className="rounded-md px-2 py-1.5 text-[11px] leading-5 text-ide-text-secondary">
                      {todo.text}
                    </p>
                  )) : (
                    <p className="px-2 py-3 text-center text-[11px] text-ide-muted">No saved to-dos yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </aside>

      <main ref={chatAreaRef} className="relative order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-ide-app-content-bg md:order-1">
        {/* Chat Header */}
        <div className="flex min-h-[4.25rem] shrink-0 items-center justify-between border-b border-ide-border-strong bg-ide-workbench-bg px-4 sm:px-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {activeDirectMessage ? (
                <UserRound className="h-4 w-4 shrink-0 text-ide-info" />
              ) : (
                <Hash className="h-4 w-4 shrink-0 text-ide-success" />
              )}
              <h1 className="truncate text-base font-semibold text-ide-text-strong">
                {activeDirectMessage ?? activeChannel}
              </h1>
            </div>
            <div className="mt-1 truncate pl-6 text-xs text-ide-text-soft">
              {activeDirectMessage
                ? "Direct message"
                : channels.find((channel) => channel.name === activeChannel)?.description ||
                  channelDescriptions[activeChannel] ||
                  "Team conversation"}
            </div>
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            {!activeDirectMessage && (
              <>
                {pinnedMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPinnedOpen((open) => !open)}
                    aria-expanded={pinnedOpen}
                    aria-label={`${pinnedMessages.length} pinned messages`}
                    title="View pinned messages"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ide-border-strong bg-ide-panel px-2.5 py-2 text-xs text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
                  >
                    <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                    Pinned · {pinnedMessages.length}
                  </button>
                )}
                <div className="hidden items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-panel px-3 py-2 text-xs text-ide-text-tertiary sm:flex">
                  <Users className="h-3.5 w-3.5 text-ide-text-soft" />
                  <span>14</span>
                  <span className="hidden text-ide-muted sm:inline">members</span>
                </div>
              </>
            )}
            {!huddle.active ? (
              <button
                type="button"
                onClick={() => {
                  huddle.start();
                  setIsHuddlePanelOpen(true);
                }}
                aria-label="Start huddle"
                title="Start huddle"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ide-accent/30 bg-ide-accent/10 px-3 py-2 text-xs font-medium text-ide-accent transition hover:bg-ide-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                Start huddle
              </button>
            ) : huddle.participants.some((participant) => participant.isLocal) ? (
              <button
                type="button"
                onClick={() => setIsHuddlePanelOpen(true)}
                aria-label={`In huddle · ${formatHuddleDuration(huddleElapsed)}`}
                title="Show huddle"
                className="inline-flex items-center gap-2 rounded-lg border border-ide-success/30 bg-ide-success/10 px-3 py-2 text-xs font-medium text-ide-success transition hover:bg-ide-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ide-success motion-reduce:animate-none" />
                In huddle · {formatHuddleDuration(huddleElapsed)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  huddle.start();
                  setIsHuddlePanelOpen(true);
                }}
                aria-label="Join huddle"
                title="Join huddle"
                className="inline-flex items-center gap-1.5 rounded-lg border border-ide-success/30 bg-ide-success/10 px-3 py-2 text-xs font-medium text-ide-success transition hover:bg-ide-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"
              >
                <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                Join huddle
              </button>
            )}
          </div>
        </div>

        {pinnedOpen && (
          <section
            aria-label="Pinned messages"
            className="absolute right-3 top-[4.75rem] z-40 max-h-[min(55vh,24rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-ide-border-strong bg-ide-panel p-3 shadow-[0_16px_40px_var(--ide-color-shadow-strong)]"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-ide-text-strong">Pinned messages</h2>
              <button type="button" onClick={() => setPinnedOpen(false)} aria-label="Close pinned messages" className="flex h-7 w-7 items-center justify-center rounded-md text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {pinnedMessages.map((message) => (
                <button key={message.id} type="button" onClick={() => { setPinnedOpen(false); document.getElementById(`chat-message-${message.id}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true" ? "auto" : "smooth", block: "center" }); }} className="block w-full rounded-lg border border-ide-border-subtle p-2 text-left hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
                  <span className="mb-1 block text-[10px] text-ide-muted">{message.sender} · {message.time}</span>
                  <span className="line-clamp-2 text-xs text-ide-text-secondary">{message.text}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {huddle.active && (
          <HuddlePanel
            minimized={!isHuddlePanelOpen}
            onMinimize={() => setIsHuddlePanelOpen(false)}
            onExpand={() => setIsHuddlePanelOpen(true)}
            containerRef={chatAreaRef}
          />
        )}

        {/* Messages List */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-center gap-3" aria-label="Today">
            <span className="h-px flex-1 bg-ide-surface-toolbar" />
            <span className="rounded-full border border-ide-border-strong bg-ide-panel px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-ide-text-soft">
              Today
            </span>
            <span className="h-px flex-1 bg-ide-surface-toolbar" />
          </div>

          {isChatLoading ? (
            <ChatListSkeleton />
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-ide-text-soft">
              No messages yet. Start the conversation.
            </div>
          ) : (
            messages.map((msg) => renderMessageRow(msg))
          )}
        </div>

        {/* Chat Input */}
        <div className="shrink-0 border-t border-ide-border-control bg-ide-workbench-bg px-3 py-3 sm:px-6 sm:py-4">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-5xl">
            <div className="rounded-lg border border-ide-border-strong bg-ide-panel transition-colors focus-within:border-ide-success/70 focus-within:shadow-[0_0_0_3px_var(--ide-color-accent-soft)]">
              <div className="flex items-center gap-1 border-b border-ide-border-strong px-2 py-1.5">
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
                    className="flex h-8 w-8 items-center justify-center rounded text-ide-text-soft transition hover:bg-ide-surface hover:text-ide-text-strong"
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
                  aria-label={
                    activeDirectMessage
                      ? `Message ${activeDirectMessage}`
                      : `Message #${activeChannel}`
                  }
                  data-placeholder={
                    activeDirectMessage
                      ? `Message ${activeDirectMessage}...`
                      : `Message #${activeChannel}...`
                  }
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
                  className="max-h-36 min-h-10 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-sm leading-6 text-ide-text-strong outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-ide-muted"
                />
              <button
                type="submit"
                disabled={isMessageEmpty}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold text-ide-accent-fg transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 sm:px-4"
                style={{ backgroundColor: theme.primary }}
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
              </div>
            </div>
          </form>
        </div>
        {threadParent && (
          <>
            <button
              type="button"
              aria-label="Close thread panel"
              onClick={closeThread}
              className="absolute inset-0 z-30 bg-ide-overlay/40 md:hidden"
            />
            <aside className="absolute inset-y-0 right-0 z-40 w-full max-w-[28rem] md:hidden">
              {renderThreadPanel(threadMobileInputRef, "h-full border-l")}
            </aside>
          </>
        )}
      </main>
    </div>
    {typeof document !== "undefined" && createPortal(
      <>
        {isCreateChannelOpen && (
          <ChatModal
            labelledBy="create-channel-title"
            onClose={closeCreateChannel}
            className="w-full max-w-lg p-5"
          >
              <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="create-channel-title" className="text-base font-semibold">Create a channel</h2>
                  <p className="mt-1 text-xs text-ide-text-soft">Bring the right people together around a topic.</p>
                </div>
                <button type="button" onClick={closeCreateChannel} aria-label="Close create channel" title="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-channel-name" className="mb-1.5 block text-xs font-medium text-ide-text-secondary">Channel name</label>
                  <div className="flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-input-bg px-3 focus-within:ring-2 focus-within:ring-ide-focus-ring">
                    <Hash className="h-4 w-4 shrink-0 text-ide-muted" />
                    <input
                      data-autofocus
                      id="new-channel-name"
                      value={channelName}
                      maxLength={80}
                      onChange={(event) => setChannelName(event.target.value.toLocaleLowerCase().replace(/\s+/g, "-"))}
                      aria-invalid={Boolean(channelNameError)}
                      aria-describedby="channel-name-preview channel-name-error"
                      placeholder="e.g. design-reviews"
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ide-text-strong outline-none placeholder:text-ide-text-muted"
                    />
                  </div>
                  <p id="channel-name-preview" className="mt-1.5 text-[11px] text-ide-text-soft">Preview: <span className="font-medium text-ide-text-strong">#{normalizedChannelName || "channel-name"}</span></p>
                  {channelNameError && <p id="channel-name-error" role="alert" className="mt-1 text-[11px] text-ide-danger-readable">{channelNameError}</p>}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="new-channel-description" className="text-xs font-medium text-ide-text-secondary">Description <span className="font-normal text-ide-muted">optional</span></label>
                    <span className="text-[10px] text-ide-muted">{channelDescription.length}/250</span>
                  </div>
                  <textarea id="new-channel-description" value={channelDescription} maxLength={250} onChange={(event) => setChannelDescription(event.target.value)} rows={2} placeholder="What will this channel be used for?" className="w-full resize-none rounded-lg border border-ide-border-strong bg-ide-input-bg p-2.5 text-xs text-ide-text-strong placeholder:text-ide-text-muted focus:outline-none focus:ring-2 focus:ring-ide-focus-ring" />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-xs font-medium text-ide-text-secondary">Visibility</legend>
                  <div className="grid grid-cols-2 rounded-lg border border-ide-border-strong bg-ide-workbench-bg p-1" role="radiogroup" aria-label="Channel visibility">
                    {([
                      ["public", "Public", "Anyone on the team can join."],
                      ["private", "Private", "Only invited members can join."],
                    ] as const).map(([visibility, title, detail]) => (
                      <button key={visibility} type="button" role="radio" aria-checked={channelVisibility === visibility} onClick={() => setChannelVisibility(visibility)} className={`rounded-md px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${channelVisibility === visibility ? "bg-ide-surface-raised text-ide-text-strong" : "text-ide-text-soft hover:bg-ide-surface-hover"}`}>
                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                          {visibility === "private" && <LockKeyhole className="h-3.5 w-3.5" />}
                          {title}
                        </span>
                        <span className="mt-1 block text-[10px] font-normal text-ide-text-soft">{detail}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {channelVisibility === "private" && (
                  <div>
                    <label htmlFor="channel-member-search" className="mb-1.5 block text-xs font-medium text-ide-text-secondary">Add members <span className="font-normal text-ide-muted">optional</span></label>
                    {channelMembers.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {channelMembers.map((name) => {
                          const person = chatService.listPeople().find((item) => item.name === name);
                          return <button key={name} type="button" onClick={() => setChannelMembers((members) => members.filter((member) => member !== name))} className="flex items-center gap-1 rounded-full border border-ide-border-strong bg-ide-surface px-2 py-1 text-[10px] text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
                            {person?.avatar ? <Image src={person.avatar} alt="" width={16} height={16} unoptimized className="h-4 w-4 rounded-full" /> : null}
                            {name}<X className="h-3 w-3" />
                          </button>;
                        })}
                      </div>
                    )}
                    <input id="channel-member-search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search teammates" className="w-full rounded-lg border border-ide-border-strong bg-ide-input-bg px-3 py-2 text-xs text-ide-text-strong placeholder:text-ide-text-muted focus:outline-none focus:ring-2 focus:ring-ide-focus-ring" />
                    <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-ide-border-subtle bg-ide-workbench-bg">
                      {chatService.searchPeople(memberSearch).map((person) => (
                        <button key={person.name} type="button" onClick={() => setChannelMembers((members) => members.includes(person.name) ? members.filter((name) => name !== person.name) : [...members, person.name])} className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ide-focus-ring">
                          {person.avatar ? <Image src={person.avatar} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded-full object-cover" /> : <span className="h-6 w-6 rounded-full bg-ide-surface-raised" />}
                          <span className="min-w-0 flex-1"><span className="block truncate text-ide-text-strong">{person.name}</span><span className="block truncate text-[10px] text-ide-muted">{person.role}</span></span>
                          {channelMembers.includes(person.name) && <Check className="h-4 w-4 text-ide-accent" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <footer className="mt-6 flex justify-end gap-2 border-t border-ide-border-subtle pt-4">
                <button type="button" onClick={closeCreateChannel} className="rounded-lg border border-ide-border-strong px-4 py-2 text-xs font-medium text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Cancel</button>
                <button type="button" onClick={createChannel} disabled={Boolean(channelNameError)} className="rounded-lg bg-ide-accent px-4 py-2 text-xs font-semibold text-ide-accent-fg hover:bg-ide-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:cursor-not-allowed disabled:opacity-50">Create</button>
              </footer>
          </ChatModal>
        )}

        {isDmPickerOpen && (
          <ChatModal labelledBy="new-dm-title" onClose={() => { setIsDmPickerOpen(false); setDmQuery(""); }} className="w-full max-w-md overflow-hidden max-h-[min(32rem,calc(100dvh-2rem))]">
              <div className="border-b border-ide-border-strong p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="new-dm-title" className="text-sm font-semibold text-ide-text-strong">New direct message</h2>
                  <button type="button" onClick={() => setIsDmPickerOpen(false)} aria-label="Close new direct message" className="flex h-7 w-7 items-center justify-center rounded-md text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-ide-border-strong bg-ide-input-bg px-3 focus-within:ring-2 focus-within:ring-ide-focus-ring">
                  <Search className="h-4 w-4 text-ide-muted" />
                  <input
                    data-autofocus
                    role="combobox"
                    aria-label="Search people"
                    aria-expanded="true"
                    aria-controls="dm-people-list"
                    aria-autocomplete="list"
                    aria-activedescendant={dmPeople[dmHighlight] ? `dm-option-${dmHighlight}` : undefined}
                    value={dmQuery}
                    onChange={(event) => { setDmQuery(event.target.value); setDmHighlight(0); }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") { event.preventDefault(); setDmHighlight((index) => Math.min(index + 1, dmPeople.length - 1)); }
                      else if (event.key === "ArrowUp") { event.preventDefault(); setDmHighlight((index) => Math.max(0, index - 1)); }
                      else if (event.key === "Enter" && dmPeople[dmHighlight]) { event.preventDefault(); choosePerson(dmPeople[dmHighlight]!); }
                    }}
                    placeholder="Search by name..."
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ide-text-strong outline-none placeholder:text-ide-text-muted"
                  />
                </div>
              </div>
              <div id="dm-people-list" role="listbox" aria-label="People" className="max-h-72 overflow-y-auto p-2">
                {!dmQuery && <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ide-muted">Suggested</p>}
                {dmPeople.length ? dmPeople.map((person, index) => {
                  const lower = person.name.toLocaleLowerCase();
                  const query = dmQuery.toLocaleLowerCase();
                  const match = query ? lower.indexOf(query) : -1;
                  return (
                    <button key={person.name} id={`dm-option-${index}`} type="button" role="option" aria-selected={index === dmHighlight} onMouseEnter={() => setDmHighlight(index)} onClick={() => choosePerson(person)} className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring ${index === dmHighlight ? "bg-ide-surface-hover" : "hover:bg-ide-surface-hover"}`}>
                      <span className="relative shrink-0">
                        {person.avatar ? <Image src={person.avatar} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ide-surface-raised text-xs text-ide-text-secondary">{person.name.slice(0, 1)}</span>}
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ide-panel ${person.status === "online" ? "bg-ide-success" : person.status === "idle" ? "bg-ide-warning" : "bg-ide-muted"}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ide-text-strong">
                          {match < 0 ? person.name : <>{person.name.slice(0, match)}<mark className="rounded bg-ide-accent-soft text-ide-text-strong">{person.name.slice(match, match + dmQuery.length)}</mark>{person.name.slice(match + dmQuery.length)}</>}
                        </span>
                        <span className="block truncate text-[11px] text-ide-text-soft">{person.role}</span>
                      </span>
                    </button>
                  );
                }) : <p className="px-3 py-8 text-center text-xs text-ide-text-soft">No people found</p>}
              </div>
          </ChatModal>
        )}

        {menuMessage && (
          <div className="fixed inset-0 z-[130]" onMouseDown={(event) => event.target === event.currentTarget && setMenuMessage(null)}>
            <div
              ref={menuRef}
              role="menu"
              aria-label="Message actions"
              style={{ left: menuPosition.x, top: menuPosition.y }}
              onContextMenu={(event) => event.preventDefault()}
              className="fixed z-[131] max-h-[calc(100dvh-1rem)] w-64 overflow-y-auto rounded-xl border border-ide-border-strong bg-ide-panel p-1.5 text-xs text-ide-text-strong shadow-[0_18px_48px_var(--ide-color-shadow-strong)]"
            >
              <button type="button" role="menuitem" onClick={() => handleMenuAction("reaction")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><SmilePlus className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Add reaction…</span><kbd className="text-[10px] text-ide-muted">R</kbd></button>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("thread")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><MessageSquare className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Reply to thread</span><kbd className="text-[10px] text-ide-muted">T</kbd></button>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("forward")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Forward className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Forward message…</span><kbd className="text-[10px] text-ide-muted">F</kbd></button>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("todo")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Check className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Add to-do</span></button>
              <div className="my-1 border-t border-ide-border-subtle" />
              {menuMessage.sender === user.name && (
                <button type="button" role="menuitem" onClick={() => handleMenuAction("edit")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">
                  <Pencil className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Edit message</span><kbd className="text-[10px] text-ide-muted">E</kbd>
                </button>
              )}
              <div className="my-1 border-t border-ide-border-subtle" />
              <button type="button" role="menuitem" onClick={() => handleMenuAction("unread")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><span className="flex-1">Mark unread</span><kbd className="text-[10px] text-ide-muted">U</kbd></button>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("saved")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Bookmark className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">{menuMessage.saved ? "Remove from saved" : "Add to saved"}</span><kbd className="text-[10px] text-ide-muted">A</kbd></button>
              <div className="relative">
                <button type="button" role="menuitem" onClick={() => setReminderMenuOpen((open) => !open)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><CalendarClock className="h-4 w-4 text-ide-text-soft" /><span className="flex-1">Add a reminder</span><ChevronRight className="h-3.5 w-3.5" /></button>
                {reminderMenuOpen && (
                  <div className={`absolute top-0 z-[132] max-h-[calc(100dvh-1rem)] w-52 overflow-y-auto rounded-xl border border-ide-border-strong bg-ide-panel p-1.5 shadow-[0_16px_40px_var(--ide-color-shadow-strong)] ${menuPosition.x > window.innerWidth - 520 ? "right-full mr-1" : "left-full ml-1"}`}>
                    {[
                      ["30 minutes", 30 * 60 * 1000],
                      ["1 hour", 60 * 60 * 1000],
                      ["3 hours", 3 * 60 * 60 * 1000],
                      ["Tomorrow at 9:00 AM", "tomorrow"],
                      ["Monday at 9:00 AM", "monday"],
                    ].map(([label, duration]) => (
                      <button key={String(label)} type="button" role="menuitem" onClick={() => setReminder(menuMessage, duration as number | "tomorrow" | "monday")} className="block w-full rounded-md px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover hover:text-ide-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">{label}</button>
                    ))}
                    <button type="button" role="menuitem" onClick={() => handleMenuAction("reminder-custom")} className="block w-full rounded-md px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Custom…</button>
                  </div>
                )}
              </div>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("notifications")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">{menuMessage.notificationsOff ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}<span>{menuMessage.notificationsOff ? "Turn on" : "Turn off"} notifications for replies</span></button>
              <div className="my-1 border-t border-ide-border-subtle" />
              <button type="button" role="menuitem" onClick={() => handleMenuAction("copy-link")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Link2 className="h-4 w-4" /><span className="flex-1">Copy link</span><kbd className="text-[10px] text-ide-muted">L</kbd></button>
              <button type="button" role="menuitem" onClick={() => handleMenuAction("copy")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Copy className="h-4 w-4" /><span className="flex-1">Copy message</span><kbd className="text-[10px] text-ide-muted">Ctrl+C</kbd></button>
              <div className="my-1 border-t border-ide-border-subtle" />
              <button type="button" role="menuitem" onClick={() => handleMenuAction("pin")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Pin className="h-4 w-4" /><span className="flex-1">{menuMessage.pinned ? "Unpin message" : "Pin to this conversation"}</span><kbd className="text-[10px] text-ide-muted">P</kbd></button>
              {menuMessage.sender === user.name && (
                <>
                  <div className="my-1 border-t border-ide-border-subtle" />
                  <button type="button" role="menuitem" onClick={() => handleMenuAction("delete")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-ide-danger-readable hover:bg-ide-surface-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><Trash2 className="h-4 w-4" /><span className="flex-1">Delete message…</span></button>
                </>
              )}
            </div>
          </div>
        )}

        {emojiMessage && (
          <div className="fixed inset-0 z-[140]" onMouseDown={(event) => event.target === event.currentTarget && setEmojiMessage(null)}>
            <div className="fixed z-[141]" style={{ left: emojiPosition.x, top: emojiPosition.y }}>
              <EmojiPicker onClose={() => setEmojiMessage(null)} onSelect={(emoji) => toggleMessageReaction(emojiMessage, emoji)} />
            </div>
          </div>
        )}

        {forwardMessage && (
          <ChatModal labelledBy="forward-message-title" onClose={() => setForwardMessage(null)} className="w-full max-w-md p-5">
              <div className="mb-4 flex items-center justify-between"><h2 id="forward-message-title" className="text-sm font-semibold text-ide-text-strong">Forward message</h2><button type="button" onClick={() => setForwardMessage(null)} aria-label="Close forward dialog" className="flex h-7 w-7 items-center justify-center rounded-md text-ide-text-soft hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring"><X className="h-4 w-4" /></button></div>
              <label htmlFor="forward-target" className="mb-1.5 block text-xs text-ide-text-secondary">Send to</label>
              <select id="forward-target" value={forwardTarget} onChange={(event) => setForwardTarget(event.target.value)} className="mb-3 w-full rounded-lg border border-ide-border-strong bg-ide-input-bg px-3 py-2 text-xs text-ide-text-strong focus:outline-none focus:ring-2 focus:ring-ide-focus-ring">
                <option value="">Choose a channel or person</option>
                {channels.map((channel) => <option key={channel.id} value={`channel:${channel.id}`}># {channel.name}</option>)}
                {directMessagePeople.map((person) => <option key={person.name} value={`dm:${person.name}`}>{person.name}</option>)}
              </select>
              <label htmlFor="forward-note" className="mb-1.5 block text-xs text-ide-text-secondary">Add a note <span className="text-ide-muted">optional</span></label>
              <textarea id="forward-note" value={forwardNote} onChange={(event) => setForwardNote(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-ide-border-strong bg-ide-input-bg p-2.5 text-xs text-ide-text-strong focus:outline-none focus:ring-2 focus:ring-ide-focus-ring" />
              <div className="mt-3 rounded-lg border border-ide-border-subtle bg-ide-workbench-bg p-2.5 text-xs text-ide-text-soft">{forwardMessage.text}</div>
              <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setForwardMessage(null)} className="rounded-lg px-3 py-2 text-xs text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Cancel</button><button type="button" disabled={!forwardTarget} onClick={sendForward} className="rounded-lg bg-ide-accent px-3.5 py-2 text-xs font-semibold text-ide-accent-fg hover:bg-ide-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:opacity-50">Forward</button></div>
          </ChatModal>
        )}

        {reminderMessage && (
          <ChatModal labelledBy="custom-reminder-title" onClose={() => setReminderMessage(null)} className="w-full max-w-sm p-5">
              <h2 id="custom-reminder-title" className="mb-4 text-sm font-semibold text-ide-text-strong">Set a reminder</h2>
              <label htmlFor="reminder-date" className="mb-1.5 block text-xs text-ide-text-secondary">Date and time</label>
              <input id="reminder-date" type="datetime-local" value={reminderDueAt} onChange={(event) => setReminderDueAt(event.target.value)} className="w-full rounded-lg border border-ide-border-strong bg-ide-input-bg px-3 py-2 text-xs text-ide-text-strong focus:outline-none focus:ring-2 focus:ring-ide-focus-ring" />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setReminderMessage(null)} className="rounded-lg px-3 py-2 text-xs text-ide-text-secondary hover:bg-ide-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Cancel</button>
                <button type="button" disabled={!reminderDueAt || new Date(reminderDueAt).getTime() <= Date.now()} onClick={() => { setReminder(reminderMessage, new Date(reminderDueAt).getTime() - Date.now()); setReminderMessage(null); }} className="rounded-lg bg-ide-accent px-3.5 py-2 text-xs font-semibold text-ide-accent-fg hover:bg-ide-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring disabled:opacity-50">Save reminder</button>
              </div>
          </ChatModal>
        )}

        {undoMessage && (
          <div role="status" className="fixed bottom-5 left-1/2 z-[150] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-ide-border-strong bg-ide-panel px-4 py-3 text-xs text-ide-text-strong shadow-[0_16px_40px_var(--ide-color-shadow-strong)]">
            <span>Message deleted</span>
            <button type="button" onClick={restoreDeletedMessage} className="font-semibold text-ide-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ide-focus-ring">Undo</button>
          </div>
        )}
      </>,
      document.body,
    )}
    </>
  );
};
