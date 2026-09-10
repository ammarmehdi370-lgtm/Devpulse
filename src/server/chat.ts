import type { Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Server } from "socket.io";
import type {
  Ack,
  ChatChannel,
  ChatClientToServerEvents,
  ChatInterServerEvents,
  ChatMessage,
  ChatServerToClientEvents,
  ChatSocketData,
  ChatUser,
  SendMessagePayload,
} from "../../packages/shared-types/src";

const demoUsers: ChatUser[] = [
  { id: "user-you", displayName: "Alex Kim", handle: "alex", status: "online" },
  { id: "user-maya", displayName: "Maya Singh", handle: "maya", status: "away" },
  { id: "user-jon", displayName: "Jon Bell", handle: "jon", status: "offline" },
  { id: "user-riley", displayName: "Riley Chen", handle: "riley", status: "online" },
];

const generalChannel: ChatChannel = {
  id: "channel-general",
  name: "general",
  type: "public",
  description: "Company-wide conversation",
  unreadCount: 0,
  memberIds: demoUsers.map((user) => user.id),
};

const channels = new Map<string, ChatChannel>([[generalChannel.id, generalChannel]]);
const messages = new Map<string, ChatMessage[]>();
const socketsByUser = new Map<string, Set<string>>();

function getUser(userId: string) {
  return demoUsers.find((user) => user.id === userId) ?? demoUsers[0];
}

function ackError<T>(ack: Ack<T> | undefined, error: string) {
  ack?.({ ok: false, error });
}

function ackSuccess<T>(ack: Ack<T> | undefined, data: T) {
  ack?.({ ok: true, data });
}

function channelMessages(channelId: string) {
  return messages.get(channelId) ?? [];
}

function mentions(body: string) {
  return demoUsers.filter((user) => body.includes(`@${user.handle}`)).map((user) => user.id);
}

function makeMessage(user: ChatUser, payload: SendMessagePayload): ChatMessage {
  return {
    id: randomUUID(),
    channelId: payload.channelId,
    author: user,
    body: payload.body.trim(),
    createdAt: new Date().toISOString(),
    threadRootId: payload.threadRootId,
    replyCount: 0,
    attachments: payload.attachments ?? [],
    reactions: [],
    mentionUserIds: mentions(payload.body),
    readByUserIds: [user.id],
    codeLanguage: payload.codeLanguage,
  };
}

export function createChatServer(httpServer: HttpServer, options: { anthropic?: Anthropic } = {}) {
  const io = new Server<ChatClientToServerEvents, ChatServerToClientEvents, ChatInterServerEvents, ChatSocketData>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
  });

  io.use((socket, next) => {
    const requestedUserId = typeof socket.handshake.auth?.userId === "string" ? socket.handshake.auth.userId : "user-you";
    socket.data.user = getUser(requestedUserId);
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const userSockets = socketsByUser.get(user.id) ?? new Set<string>();
    userSockets.add(socket.id);
    socketsByUser.set(user.id, userSockets);

    socket.emit("chat:channel-list", [...channels.values()]);
    socket.emit("chat:presence", demoUsers.map((member) => ({ ...member, status: socketsByUser.has(member.id) ? "online" : member.status })));
    socket.join(generalChannel.id);

    socket.on("chat:subscribe", ({ channelId }) => {
      if (!channels.has(channelId)) return;
      socket.join(channelId);
      socket.emit("chat:history", { channelId, messages: channelMessages(channelId).slice(-100) });
    });

    socket.on("chat:unsubscribe", ({ channelId }) => socket.leave(channelId));

    socket.on("chat:create-channel", ({ name, description, isPrivate }, ack) => {
      const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
      if (!normalizedName) return ackError(ack, "Channel name is required");
      if ([...channels.values()].some((channel) => channel.name === normalizedName)) return ackError(ack, "Channel already exists");
      const channel: ChatChannel = { id: `channel-${randomUUID()}`, name: normalizedName, type: isPrivate ? "private" : "public", description, unreadCount: 0, memberIds: [user.id] };
      channels.set(channel.id, channel);
      socket.join(channel.id);
      io.emit("chat:channel-created", channel);
      ackSuccess(ack, channel);
    });

    socket.on("chat:join-channel", ({ channelId }, ack) => {
      const channel = channels.get(channelId);
      if (!channel) return ackError(ack, "Channel not found");
      if (!channel.memberIds.includes(user.id)) channel.memberIds.push(user.id);
      socket.join(channelId);
      socket.emit("chat:history", { channelId, messages: channelMessages(channelId).slice(-100) });
      ackSuccess(ack, channel);
    });

    socket.on("chat:leave-channel", ({ channelId }, ack) => {
      const channel = channels.get(channelId);
      if (!channel || channelId === generalChannel.id) return ackError(ack, "The general channel cannot be left");
      channel.memberIds = channel.memberIds.filter((memberId) => memberId !== user.id);
      socket.leave(channelId);
      ackSuccess(ack, undefined);
    });

    socket.on("chat:send-message", (payload, ack) => {
      const channel = channels.get(payload.channelId);
      if (!channel || !channel.memberIds.includes(user.id)) return ackError(ack, "Join this channel before sending messages");
      if (!payload.body.trim() && !payload.attachments?.length) return ackError(ack, "Message cannot be empty");
      const message = makeMessage(user, payload);
      const list = channelMessages(payload.channelId);
      if (payload.threadRootId) {
        const root = list.find((item) => item.id === payload.threadRootId);
        if (root) root.replyCount += 1;
      }
      list.push(message);
      messages.set(payload.channelId, list);
      io.to(payload.channelId).emit("chat:message-created", message);
      for (const mentionedUserId of message.mentionUserIds) {
        for (const socketId of socketsByUser.get(mentionedUserId) ?? []) {
          io.to(socketId).emit("chat:notification", { message: `${user.displayName} mentioned you`, channelId: payload.channelId, messageId: message.id });
        }
      }
      if (payload.body.trim().toLowerCase().startsWith("@ai")) {
        void createAiThreadReply(io, options.anthropic, payload.channelId, message);
      }
      ackSuccess(ack, message);
    });

    socket.on("chat:edit-message", ({ messageId, body }, ack) => {
      const list = [...messages.values()].find((items) => items.some((message) => message.id === messageId));
      const message = list?.find((item) => item.id === messageId);
      if (!list || !message) return ackError(ack, "Message not found");
      if (message.author.id !== user.id) return ackError(ack, "You can only edit your own messages");
      message.body = body.trim();
      message.editedAt = new Date().toISOString();
      io.to(message.channelId).emit("chat:message-updated", message);
      ackSuccess(ack, message);
    });

    socket.on("chat:delete-message", ({ messageId }, ack) => {
      const list = [...messages.values()].find((items) => items.some((message) => message.id === messageId));
      const message = list?.find((item) => item.id === messageId);
      if (!list || !message) return ackError(ack, "Message not found");
      if (message.author.id !== user.id) return ackError(ack, "You can only delete your own messages");
      message.deletedAt = new Date().toISOString();
      message.body = "This message was deleted.";
      io.to(message.channelId).emit("chat:message-deleted", { channelId: message.channelId, messageId });
      ackSuccess(ack, undefined);
    });

    socket.on("chat:toggle-reaction", ({ messageId, emoji }) => {
      const message = [...messages.values()].flat().find((item) => item.id === messageId);
      if (!message) return;
      const reaction = message.reactions.find((item) => item.emoji === emoji);
      if (!reaction) message.reactions.push({ emoji, count: 1, userIds: [user.id] });
      else if (reaction.userIds.includes(user.id)) {
        reaction.userIds = reaction.userIds.filter((id) => id !== user.id);
        reaction.count = reaction.userIds.length;
        message.reactions = message.reactions.filter((item) => item.count > 0);
      } else {
        reaction.userIds.push(user.id);
        reaction.count = reaction.userIds.length;
      }
      io.to(message.channelId).emit("chat:reaction-updated", message);
    });

    socket.on("chat:typing", ({ channelId, isTyping }) => socket.to(channelId).emit("chat:typing", { channelId, user, isTyping }));

    socket.on("chat:mark-read", ({ channelId, messageId }) => {
      const message = channelMessages(channelId).find((item) => item.id === messageId);
      if (!message || message.readByUserIds.includes(user.id)) return;
      message.readByUserIds.push(user.id);
      io.to(channelId).emit("chat:read-receipt", { channelId, messageId, userId: user.id });
    });

    socket.on("chat:search", ({ query, channelId }, ack) => {
      const normalizedQuery = query.trim().toLowerCase();
      const source = channelId ? channelMessages(channelId) : [...messages.values()].flat();
      ackSuccess(ack, source.filter((message) => message.body.toLowerCase().includes(normalizedQuery)).slice(-50));
    });

    socket.on("chat:start-dm", ({ userId }, ack) => {
      const target = getUser(userId);
      const id = `dm-${[user.id, target.id].sort().join("-")}`;
      const channel = channels.get(id) ?? { id, name: target.displayName, type: "direct" as const, unreadCount: 0, memberIds: [user.id, target.id], dmUserId: target.id };
      channels.set(id, channel);
      socket.join(id);
      socket.emit("chat:history", { channelId: id, messages: channelMessages(id).slice(-100) });
      ackSuccess(ack, channel);
    });

    socket.on("disconnect", () => {
      const currentSockets = socketsByUser.get(user.id);
      currentSockets?.delete(socket.id);
      if (currentSockets?.size === 0) socketsByUser.delete(user.id);
      io.emit("chat:presence", demoUsers.map((member) => ({ ...member, status: socketsByUser.has(member.id) ? "online" : member.status })));
    });
  });

  return io;
}

async function createAiThreadReply(
  io: Server<ChatClientToServerEvents, ChatServerToClientEvents, ChatInterServerEvents, ChatSocketData>,
  providedAnthropic: Anthropic | undefined,
  channelId: string,
  rootMessage: ChatMessage,
) {
  let body = "";
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    const anthropic = providedAnthropic ?? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(process.env.ANTHROPIC_WORKSPACE_ID
        ? { defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } }
        : {}),
    });
    const stream = anthropic.messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 2_000,
      system: "You are Codeplane AI in a team chat. Reply concisely and use fenced code blocks when sharing code.",
      messages: [{ role: "user", content: rootMessage.body.replace(/^@ai\s*/i, "") }],
    });
    stream.on("text", (text) => { body += text; });
    await stream.finalMessage();
  } catch (error) {
    body = `AI request failed: ${error instanceof Error ? error.message : "unknown provider error"}`;
  }

  const aiMessage: ChatMessage = {
    ...makeMessage(getUser("user-riley"), { channelId, body, threadRootId: rootMessage.id }),
    id: randomUUID(),
    threadRootId: rootMessage.id,
  };
  const list = channelMessages(channelId);
  const root = list.find((message) => message.id === rootMessage.id);
  if (root) root.replyCount += 1;
  list.push(aiMessage);
  messages.set(channelId, list);
  io.to(channelId).emit("chat:ai-thread-reply", aiMessage);
}
