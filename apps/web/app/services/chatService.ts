export type ChatVisibility = "public" | "private";

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  visibility: ChatVisibility;
  members: string[];
  unread: boolean;
}

export interface ChatPerson {
  name: string;
  role: string;
  avatar: string;
  status: "online" | "idle" | "offline" | "bot";
  isBot?: boolean;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessage {
  id: string;
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
  attachment?: { name: string; size: string; sub: string };
  reactions: ChatReaction[];
  edited?: boolean;
  saved?: boolean;
  pinned?: boolean;
  unread?: boolean;
  notificationsOff?: boolean;
  forwardedFrom?: { sender: string; text: string };
}

export interface ChatReminder {
  id: string;
  threadId: string;
  messageId: string;
  dueAt: number;
  fired: boolean;
}

export interface ChatMessageInput {
  sender: string;
  role: string;
  roleColor: string;
  avatar: string;
  text: string;
  richTextHtml?: string;
}

export interface CreateChannelInput {
  name: string;
  description: string;
  visibility: ChatVisibility;
  members: string[];
}

export interface ChatService {
  setStorageScope(scope: string): void;
  listChannels(): ChatChannel[];
  createChannel(input: CreateChannelInput): ChatChannel;
  searchPeople(query: string): ChatPerson[];
  listPeople(): ChatPerson[];
  listDirectMessages(): ChatPerson[];
  startDirectMessage(person: ChatPerson): ChatPerson;
  listMessages(threadId: string): ChatMessage[];
  listPinnedMessages(threadId: string): ChatMessage[];
  sendMessage(threadId: string, message: ChatMessageInput): ChatMessage;
  editMessage(threadId: string, messageId: string, text: string): ChatMessage;
  deleteMessage(threadId: string, messageId: string): ChatMessage | undefined;
  restoreMessage(threadId: string, message: ChatMessage, replyToId?: string): void;
  toggleReaction(
    threadId: string,
    messageId: string,
    emoji: string,
    userName: string,
  ): ChatMessage;
  setReplyThread(messageId: string | null): void;
  replyToThread(
    threadId: string,
    messageId: string,
    message: ChatMessageInput,
  ): ChatMessage;
  getThreadReplies(messageId: string): ChatMessage[];
  markUnread(threadId: string, messageId: string): void;
  markRead(threadId: string): void;
  toggleSaved(threadId: string, messageId: string): boolean;
  setReminder(threadId: string, messageId: string, dueAt: number): ChatReminder;
  listReminders(): ChatReminder[];
  markReminderFired(reminderId: string): void;
  toggleThreadNotifications(threadId: string, messageId: string): boolean;
  togglePin(threadId: string, messageId: string): boolean;
  forwardMessage(
    targetThreadId: string,
    message: ChatMessage,
    note: string,
    sender: Omit<ChatMessageInput, "text">,
  ): ChatMessage;
  addTodo(threadId: string, message: ChatMessage): void;
  listTodos(): { threadId: string; messageId: string; text: string }[];
}

const people: ChatPerson[] = [
  {
    name: "Sarah Lin",
    role: "Staff Frontend",
    status: "online",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
  },
  {
    name: "Marcus Vance",
    role: "Infrastructure",
    status: "online",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
  },
  {
    name: "Elena Rostova",
    role: "Systems & Kernels",
    status: "idle",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
  },
  {
    name: "DevAIX",
    role: "Platform Copilot",
    status: "bot",
    isBot: true,
    avatar: "",
  },
  {
    name: "Devpulse Bot",
    role: "Automation CI",
    status: "bot",
    isBot: true,
    avatar: "",
  },
  {
    name: "Alex Chen",
    role: "Product Designer",
    status: "online",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
  },
];

const initialChannels: ChatChannel[] = [
  { id: "general", name: "general", description: "Team updates and announcements", visibility: "public", members: [], unread: false },
  { id: "frontend", name: "frontend", description: "Client-side architecture & review", visibility: "public", members: [], unread: false },
  { id: "bugs", name: "bugs", description: "Bug triage and fixes", visibility: "public", members: [], unread: false },
  { id: "random", name: "random", description: "Off-topic team conversation", visibility: "public", members: [], unread: false },
];

const initialMessages: Record<string, ChatMessage[]> = {
  "channel:frontend": [
    {
      id: "1",
      sender: "Sarah Lin",
      role: "Staff UI Engineer",
      roleColor: "bg-ide-info/15 text-[var(--ide-color-info-readable)] border-ide-info/30",
      avatar: people[0]!.avatar,
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
        { emoji: "🔥", count: 3, users: ["Marcus Vance", "Elena Rostova", "Alex Chen"] },
        { emoji: "❤️", count: 2, users: ["Marcus Vance", "Alex Chen"] },
      ],
    },
    {
      id: "2",
      sender: "Marcus Vance",
      role: "DevOps",
      roleColor: "bg-ide-success/15 text-[var(--ide-color-success-readable)] border-ide-success/30",
      avatar: people[1]!.avatar,
      time: "10:31 AM",
      text: "Looks super clean @Sarah! Verified the edge cache invalidation latency. Also attaching the benchmark profile from the us-east cluster run:",
      attachment: {
        name: "edge-benchmarks-v2.4.json",
        size: "142 KB",
        sub: "p99 latency: 14.2ms",
      },
      reactions: [{ emoji: "🙌", count: 1, users: ["Sarah Lin"] }],
    },
  ],
};

interface ChatState {
  channels: ChatChannel[];
  directMessages: ChatPerson[];
  messages: Record<string, ChatMessage[]>;
  replies: Record<string, ChatMessage[]>;
  reminders: ChatReminder[];
  todos: { threadId: string; messageId: string; text: string }[];
}

const createInitialState = (): ChatState => ({
  channels: initialChannels.map((channel) => ({ ...channel })),
  directMessages: [people[0]!, people[1]!, people[2]!, people[4]!],
  messages: JSON.parse(JSON.stringify(initialMessages)) as Record<string, ChatMessage[]>,
  replies: {},
  reminders: [],
  todos: [],
});

const validState = (value: unknown): value is ChatState =>
  typeof value === "object" &&
  value !== null &&
  "channels" in value &&
  Array.isArray(value.channels) &&
  "directMessages" in value &&
  Array.isArray(value.directMessages) &&
  "messages" in value &&
  typeof value.messages === "object" &&
  value.messages !== null &&
  "replies" in value &&
  typeof value.replies === "object" &&
  value.replies !== null &&
  "reminders" in value &&
  Array.isArray(value.reminders) &&
  "todos" in value &&
  Array.isArray(value.todos);

const createLocalChatService = (): ChatService => {
  let storageKey = "devpulse-chat-service:anonymous";
  let state = createInitialState();
  let activeReplyThreadId: string | null = null;

  const persist = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("Unable to save Team Chat data.", error);
    }
  };
  const findMessage = (threadId: string, messageId: string) => {
    const message =
      state.messages[threadId]?.find((item) => item.id === messageId) ??
      Object.values(state.replies)
        .flat()
        .find((item) => item.id === messageId);
    if (!message) throw new Error(`Message "${messageId}" was not found.`);
    return message;
  };

  return {
    setStorageScope(scope) {
      storageKey = `devpulse-chat-service:${scope.toLowerCase()}`;
      state = createInitialState();
      activeReplyThreadId = null;
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) {
          const parsed: unknown = JSON.parse(saved);
          if (!validState(parsed)) throw new Error("Saved Team Chat data is invalid.");
          state = parsed;
        } else {
          const legacy = window.localStorage.getItem(
            `devpulse-chat-messages:${scope.toLowerCase()}`,
          );
          if (legacy !== null) {
            const parsedLegacy: unknown = JSON.parse(legacy);
            if (typeof parsedLegacy !== "object" || parsedLegacy === null) {
              throw new Error("Saved legacy chat messages are invalid.");
            }
            for (const [threadId, messages] of Object.entries(parsedLegacy)) {
              if (!Array.isArray(messages)) continue;
              state.messages[threadId] = messages.map((entry) => {
                if (!entry || typeof entry !== "object") {
                  throw new Error("A saved legacy message is invalid.");
                }
                const old = entry as Partial<ChatMessage>;
                if (
                  typeof old.sender !== "string" ||
                  typeof old.text !== "string" ||
                  typeof old.role !== "string" ||
                  typeof old.avatar !== "string"
                ) {
                  throw new Error("A saved legacy message is missing required fields.");
                }
                return {
                  ...old,
                  id: String(old.id ?? Date.now()),
                  roleColor: old.roleColor ?? "text-ide-text-secondary",
                  time: old.time ?? "Earlier",
                  reactions: (old.reactions ?? []).map((reaction) => ({
                    emoji: reaction.emoji,
                    count: reaction.count,
                    users: [],
                  })),
                } as ChatMessage;
              });
            }
            persist();
          }
        }
      } catch (error) {
        console.error("Unable to restore Team Chat data.", error);
      }
    },
    listChannels: () => state.channels.map((channel) => ({ ...channel })),
    createChannel(input) {
      const name = input.name.trim().toLowerCase();
      if (!name || state.channels.some((channel) => channel.name === name)) {
        throw new Error("Channel name is empty or already in use.");
      }
      const channel = {
        id: name,
        name,
        description: input.description.trim(),
        visibility: input.visibility,
        members: [...input.members],
        unread: false,
      };
      state.channels.push(channel);
      persist();
      return { ...channel };
    },
    searchPeople(query) {
      const normalized = query.trim().toLocaleLowerCase();
      return people.filter((person) =>
        person.name.toLocaleLowerCase().includes(normalized),
      );
    },
    listPeople: () => people.map((person) => ({ ...person })),
    listDirectMessages: () => state.directMessages.map((person) => ({ ...person })),
    startDirectMessage(person) {
      const existing = state.directMessages.find((item) => item.name === person.name);
      if (existing) return { ...existing };
      state.directMessages.unshift({ ...person });
      persist();
      return { ...person };
    },
    listMessages: (threadId) => (state.messages[threadId] ?? []).map((message) => ({ ...message })),
    listPinnedMessages(threadId) {
      const replies = Object.entries(state.replies).flatMap(([parentId, items]) => {
        const parentThreadId = Object.entries(state.messages).find(([, items]) =>
          items.some((message) => message.id === parentId),
        )?.[0];
        return parentThreadId === threadId ? items : [];
      });
      return [
        ...(state.messages[threadId] ?? []).filter((message) => message.pinned),
        ...replies.filter((message) => message.pinned),
      ].map((message) => ({
        ...message,
        reactions: message.reactions.map((reaction) => ({
          ...reaction,
          users: [...reaction.users],
        })),
      }));
    },
    sendMessage(threadId, input) {
      const message: ChatMessage = {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: "Just now",
        reactions: [],
      };
      state.messages[threadId] = [...(state.messages[threadId] ?? []), message];
      persist();
      return { ...message };
    },
    editMessage(threadId, messageId, text) {
      const message = findMessage(threadId, messageId);
      message.text = text;
      message.richTextHtml = undefined;
      message.edited = true;
      persist();
      return { ...message };
    },
    deleteMessage(threadId, messageId) {
      const messages = state.messages[threadId] ?? [];
      let deleted = messages.find((message) => message.id === messageId);
      if (deleted) {
        state.messages[threadId] = messages.filter((message) => message.id !== messageId);
      } else {
        for (const [parentId, replies] of Object.entries(state.replies)) {
          const reply = replies.find((message) => message.id === messageId);
          if (reply) {
            deleted = reply;
            state.replies[parentId] = replies.filter((message) => message.id !== messageId);
            break;
          }
        }
      }
      persist();
      return deleted ? { ...deleted } : undefined;
    },
    restoreMessage(threadId, message, replyToId) {
      if (replyToId) {
        state.replies[replyToId] = [
          ...(state.replies[replyToId] ?? []),
          { ...message },
        ];
        persist();
        return;
      }
      const messages = state.messages[threadId] ?? [];
      if (messages.some((item) => item.id === message.id)) return;
      state.messages[threadId] = [...messages, { ...message }];
      persist();
    },
    toggleReaction(threadId, messageId, emoji, userName) {
      const message = findMessage(threadId, messageId);
      const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
      if (existing) {
        const reacted = existing.users.includes(userName);
        existing.users = reacted
          ? existing.users.filter((name) => name !== userName)
          : [...existing.users, userName];
        existing.count = existing.users.length;
        if (!existing.count) message.reactions = message.reactions.filter((item) => item !== existing);
      } else {
        message.reactions.push({ emoji, count: 1, users: [userName] });
      }
      persist();
      return { ...message, reactions: message.reactions.map((reaction) => ({ ...reaction, users: [...reaction.users] })) };
    },
    setReplyThread(messageId) {
      activeReplyThreadId = messageId;
    },
    replyToThread(threadId, messageId, input) {
      if (
        !state.messages[threadId]?.some((message) => message.id === messageId) &&
        !state.replies[messageId]
      ) {
        throw new Error(`Thread parent "${messageId}" was not found.`);
      }
      const reply: ChatMessage = {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: "Just now",
        reactions: [],
      };
      const replyToId = activeReplyThreadId ?? messageId;
      state.replies[replyToId] = [...(state.replies[replyToId] ?? []), reply];
      activeReplyThreadId = replyToId;
      persist();
      return { ...reply };
    },
    getThreadReplies: (messageId) => (state.replies[messageId] ?? []).map((message) => ({ ...message })),
    markUnread(threadId, messageId) {
      findMessage(threadId, messageId).unread = true;
      const channel = state.channels.find((item) => `channel:${item.id}` === threadId);
      if (channel) channel.unread = true;
      persist();
    },
    markRead(threadId) {
      const channel = state.channels.find((item) => `channel:${item.id}` === threadId);
      if (channel) channel.unread = false;
      state.messages[threadId]?.forEach((message) => {
        message.unread = false;
      });
      persist();
    },
    toggleSaved(threadId, messageId) {
      const message = findMessage(threadId, messageId);
      message.saved = !message.saved;
      persist();
      return message.saved;
    },
    setReminder(threadId, messageId, dueAt) {
      const reminder: ChatReminder = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        threadId,
        messageId,
        dueAt,
        fired: false,
      };
      state.reminders.push(reminder);
      persist();
      return { ...reminder };
    },
    listReminders: () => state.reminders.map((reminder) => ({ ...reminder })),
    markReminderFired(reminderId) {
      const reminder = state.reminders.find((item) => item.id === reminderId);
      if (!reminder) return;
      reminder.fired = true;
      persist();
    },
    toggleThreadNotifications(threadId, messageId) {
      const message = findMessage(threadId, messageId);
      message.notificationsOff = !message.notificationsOff;
      persist();
      return message.notificationsOff;
    },
    togglePin(threadId, messageId) {
      const message = findMessage(threadId, messageId);
      message.pinned = !message.pinned;
      persist();
      return message.pinned;
    },
    forwardMessage(targetThreadId, message, note, sender) {
      const forwarded: ChatMessage = {
        ...sender,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: "Just now",
        text: note ? `${note}\n\n${message.sender}: ${message.text}` : `${message.sender}: ${message.text}`,
        reactions: [],
        forwardedFrom: { sender: message.sender, text: message.text },
      };
      state.messages[targetThreadId] = [
        ...(state.messages[targetThreadId] ?? []),
        forwarded,
      ];
      persist();
      return { ...forwarded };
    },
    addTodo(threadId, message) {
      state.todos.push({ threadId, messageId: message.id, text: message.text });
      persist();
    },
    listTodos: () => state.todos.map((todo) => ({ ...todo })),
  };
};

// TODO(backend): replace the local mock with API-backed channel, DM, and message operations.
// TODO(backend): synchronize reactions, threads, reminders, pins, saved items, and unread state in realtime.
export const chatService = createLocalChatService();
