"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatChannel,
  ChatClientToServerEvents,
  ChatMessage,
  ChatServerToClientEvents,
  ChatUser,
} from "../../../packages/shared-types/src/chat";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type ChatSocket = Socket<ChatServerToClientEvents, ChatClientToServerEvents>;

const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";
const reactions = ["👍", "🎉", "❤️", "👀"];

function detectCode(body: string) {
  if (body.includes("```")) return body.match(/```([\w-]*)\n([\s\S]*?)```/)?.[1] || "text";
  if (/^(const|let|function|import|export|SELECT|<\w+)/m.test(body)) return "typescript";
  return undefined;
}

function formatMessageBody(message: ChatMessage) {
  const codeMatch = message.body.match(/```[\w-]*\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1] : message.body;
}

export function ChatWorkspace() {
  const socketRef = useRef<ChatSocket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeChannelId, setActiveChannelId] = useState("channel-general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [notice, setNotice] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? channels[0];
  const threadMessages = threadRoot ? messages.filter((message) => message.threadRootId === threadRoot.id) : [];
  const visibleMessages = useMemo(() => messages.filter((message) => !message.threadRootId), [messages]);

  useEffect(() => {
    const socket = io(apiUrl, { auth: { userId: "user-you" }, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("chat:channel-list", setChannels);
    socket.on("chat:presence", setUsers);
    socket.on("chat:history", ({ channelId, messages: history }) => {
      if (channelId === activeChannelId) setMessages(history);
    });
    socket.on("chat:message-created", (message) => {
      if (message.channelId === activeChannelId) setMessages((current) => [...current.filter((item) => item.id !== message.id), message]);
    });
    socket.on("chat:ai-thread-reply", (message) => {
      if (message.channelId === activeChannelId) {
        setMessages((current) => {
          const nextMessages = [...current.filter((item) => item.id !== message.id), message];
          const root = nextMessages.find((item) => item.id === message.threadRootId);
          if (root) setThreadRoot(root);
          return nextMessages;
        });
      }
    });
    socket.on("chat:message-updated", (message) => setMessages((current) => current.map((item) => item.id === message.id ? message : item)));
    socket.on("chat:message-deleted", ({ messageId }) => setMessages((current) => current.map((item) => item.id === messageId ? { ...item, body: "This message was deleted.", deletedAt: new Date().toISOString() } : item)));
    socket.on("chat:reaction-updated", (message) => setMessages((current) => current.map((item) => item.id === message.id ? message : item)));
    socket.on("chat:typing", ({ channelId, user, isTyping }) => {
      if (channelId !== activeChannelId || user.id === "user-you") return;
      setTypingUsers((current) => isTyping ? [...new Set([...current, user.displayName])] : current.filter((name) => name !== user.displayName));
    });
    socket.on("chat:notification", ({ message }) => { setNotice(message); setTimeout(() => setNotice(""), 3000); });
    socket.on("chat:error", ({ message }) => setNotice(message));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [activeChannelId]);

  useEffect(() => {
    if (!socketRef.current || !activeChannelId) return;
    setMessages([]);
    socketRef.current.emit("chat:subscribe", { channelId: activeChannelId });
  }, [activeChannelId]);

  function selectChannel(channelId: string) {
    setThreadRoot(null);
    setSearchResults([]);
    setActiveChannelId(channelId);
  }

  function sendMessage() {
    const body = draft.trim();
    if (!body && !attachment) return;
    const codeLanguage = detectCode(body);
    socketRef.current?.emit("chat:send-message", {
      channelId: activeChannelId,
      body,
      codeLanguage,
      attachments: attachment ? [{ id: crypto.randomUUID(), name: attachment.name, mimeType: attachment.type, size: attachment.size, url: URL.createObjectURL(attachment) }] : [],
      threadRootId: threadRoot?.id,
    }, (result) => {
      if (!result.ok) setNotice(result.error);
    });
    setDraft("");
    setAttachment(null);
    socketRef.current?.emit("chat:typing", { channelId: activeChannelId, isTyping: false });
  }

  function updateDraft(value: string) {
    setDraft(value);
    socketRef.current?.emit("chat:typing", { channelId: activeChannelId, isTyping: value.length > 0 });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit("chat:typing", { channelId: activeChannelId, isTyping: false }), 1200);
  }

  function createChannel() {
    const name = newChannelName.trim();
    if (!name) return;
    socketRef.current?.emit("chat:create-channel", { name }, (result) => {
      if (result.ok) selectChannel(result.data.id);
      else setNotice(result.error);
      setChannelDialogOpen(false);
      setNewChannelName("");
    });
  }

  function startDm(user: ChatUser) {
    socketRef.current?.emit("chat:start-dm", { userId: user.id }, (result) => {
      if (result.ok) {
        setChannels((current) => current.some((item) => item.id === result.data.id) ? current : [...current, result.data]);
        selectChannel(result.data.id);
      }
    });
  }

  function searchMessages() {
    if (!searchQuery.trim()) return setSearchResults([]);
    socketRef.current?.emit("chat:search", { query: searchQuery, channelId: activeChannelId }, (result) => {
      if (result.ok) setSearchResults(result.data);
    });
  }

  const onlineUsers = users.filter((user) => user.id !== "user-you");

  return (
    <main className="chat-shell">
      <header className="chat-topbar"><a href="/" className="chat-brand"><span>CP</span><strong>Codeplane</strong></a><div className="chat-search"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchMessages()} placeholder="Search messages" /><button type="button" onClick={searchMessages}>Search</button></div><span className="chat-connection"><i /> Realtime</span></header>
      <section className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar__title"><span>CHANNELS</span><button type="button" onClick={() => setChannelDialogOpen(true)} aria-label="Create channel">+</button></div>
          <div className="chat-channel-list">{channels.filter((channel) => channel.type !== "direct").map((channel) => <button key={channel.id} type="button" className={activeChannelId === channel.id ? "is-active" : ""} onClick={() => selectChannel(channel.id)}><span>#</span>{channel.name}{channel.unreadCount > 0 && <b>{channel.unreadCount}</b>}</button>)}</div>
          <div className="chat-sidebar__title"><span>DIRECT MESSAGES</span></div>
          <div className="chat-user-list">{onlineUsers.map((user) => <button key={user.id} type="button" onClick={() => startDm(user)}><i className={`presence presence--${user.status}`} />{user.displayName}<small>{user.status}</small></button>)}</div>
          <div className="chat-sidebar__footer"><span className="presence presence--online" /> Alex Kim <small>online</small></div>
        </aside>
        <section className="chat-main">
          <header className="chat-channel-header"><div><h1>{activeChannel?.type === "direct" ? activeChannel.name : `# ${activeChannel?.name ?? "general"}`}</h1><p>{activeChannel?.description ?? "Direct conversation"}</p></div><div className="chat-channel-actions"><span>{activeChannel?.memberIds.length ?? 0} members</span><button type="button" onClick={() => activeChannel && socketRef.current?.emit("chat:leave-channel", { channelId: activeChannel.id })}>Leave</button></div></header>
          {notice && <div className="chat-notice" role="status">{notice}</div>}
          {channelDialogOpen && <div className="chat-channel-dialog" role="dialog" aria-label="Create channel"><strong>Create channel</strong><input autoFocus value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createChannel(); }} placeholder="channel-name" /><div><button type="button" onClick={() => setChannelDialogOpen(false)}>Cancel</button><button type="button" onClick={createChannel} disabled={!newChannelName.trim()}>Create</button></div></div>}
          {searchResults.length > 0 && <div className="chat-search-results"><strong>Search results</strong>{searchResults.map((message) => <button type="button" key={message.id} onClick={() => setSearchResults([])}>{message.author.displayName}: {message.body}</button>)}</div>}
          <div className="chat-messages">{visibleMessages.map((message) => <ChatMessageRow key={message.id} message={message} isEditing={editingId === message.id} editingText={editingText} onEditStart={() => { setEditingId(message.id); setEditingText(message.body); }} onEditChange={setEditingText} onEditSave={() => { socketRef.current?.emit("chat:edit-message", { messageId: message.id, body: editingText }); setEditingId(null); }} onDelete={() => socketRef.current?.emit("chat:delete-message", { messageId: message.id })} onReply={() => setThreadRoot(message)} onReact={(emoji) => socketRef.current?.emit("chat:toggle-reaction", { messageId: message.id, emoji })} onRead={() => socketRef.current?.emit("chat:mark-read", { channelId: message.channelId, messageId: message.id })} />)}</div>
          {typingUsers.length > 0 && <div className="chat-typing">{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</div>}
          <Composer channelName={activeChannel?.name ?? "general"} value={draft} onChange={updateDraft} onSend={sendMessage} onAttach={setAttachment} attachment={attachment} />
        </section>
        {threadRoot && <aside className="chat-thread"><header><div><small>THREAD</small><h2>Reply to {threadRoot.author.displayName}</h2></div><button type="button" onClick={() => setThreadRoot(null)}>×</button></header><ChatMessageRow message={threadRoot} compact onReact={(emoji) => socketRef.current?.emit("chat:toggle-reaction", { messageId: threadRoot.id, emoji })} /><div className="chat-thread__replies">{threadMessages.map((message) => <ChatMessageRow key={message.id} message={message} compact onReact={(emoji) => socketRef.current?.emit("chat:toggle-reaction", { messageId: message.id, emoji })} />)}</div><Composer channelName={activeChannel?.name ?? "general"} value={draft} onChange={setDraft} onSend={sendMessage} onAttach={setAttachment} attachment={attachment} /></aside>}
      </section>
    </main>
  );
}

function ChatMessageRow({ message, compact = false, isEditing = false, editingText, onEditStart, onEditChange, onEditSave, onDelete, onReply, onReact, onRead }: { message: ChatMessage; compact?: boolean; isEditing?: boolean; editingText?: string; onEditStart?: () => void; onEditChange?: (value: string) => void; onEditSave?: () => void; onDelete?: () => void; onReply?: () => void; onReact: (emoji: string) => void; onRead?: () => void }) {
  const isOwn = message.author.id === "user-you";
  const codeLanguage = message.codeLanguage ?? detectCode(message.body);
  useEffect(() => { onRead?.(); }, [message.id, onRead]);
  return <article className={`chat-message ${compact ? "chat-message--compact" : ""}`}><div className="chat-avatar">{message.author.displayName.split(" ").map((part) => part[0]).join("")}</div><div className="chat-message__content"><div className="chat-message__meta"><strong>{message.author.displayName}</strong><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>{message.editedAt && <small>(edited)</small>}</div>{isEditing ? <div className="chat-edit"><textarea value={editingText} onChange={(event) => onEditChange?.(event.target.value)} /><button type="button" onClick={onEditSave}>Save</button></div> : codeLanguage && message.body.includes("```") ? <SyntaxHighlighter language={codeLanguage} style={vscDarkPlus} customStyle={{ margin: "8px 0", borderRadius: "6px", fontSize: "12px" }}>{formatMessageBody(message)}</SyntaxHighlighter> : <p>{message.body}</p>}{message.attachments.map((file) => <a className="chat-attachment" href={file.url} target="_blank" rel="noreferrer" key={file.id}>📎 {file.name}</a>)}<div className="chat-message__toolbar">{reactions.map((emoji) => <button type="button" key={emoji} onClick={() => onReact(emoji)}>{emoji}</button>)}{onReply && <button type="button" onClick={onReply}>Reply</button>}{isOwn && onEditStart && <button type="button" onClick={onEditStart}>Edit</button>}{isOwn && onDelete && <button type="button" onClick={onDelete}>Delete</button>}</div>{message.reactions.length > 0 && <div className="chat-reactions">{message.reactions.map((reaction) => <button type="button" key={reaction.emoji} onClick={() => onReact(reaction.emoji)}>{reaction.emoji} {reaction.count}</button>)}</div>}{!compact && message.replyCount > 0 && <button className="chat-reply-count" type="button" onClick={onReply}>{message.replyCount} replies</button>}</div></article>;
}

function Composer({ channelName, value, onChange, onSend, onAttach, attachment }: { channelName: string; value: string; onChange: (value: string) => void; onSend: () => void; onAttach: (file: File | null) => void; attachment: File | null }) {
  return <div className="chat-composer"><div className="chat-composer__tools"><label title="Attach image or PDF">📎<input type="file" accept="image/*,.pdf" hidden onChange={(event) => onAttach(event.target.files?.[0] ?? null)} /></label><span>Paste code with ``` fences or mention @AI for a thread reply</span></div>{attachment && <div className="chat-file-chip">{attachment.name} <button type="button" onClick={() => onAttach(null)}>×</button></div>}<textarea value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} placeholder={`Message #${channelName}`} rows={3} /><button className="chat-send" type="button" onClick={onSend} disabled={!value.trim() && !attachment}>Send</button></div>;
}
