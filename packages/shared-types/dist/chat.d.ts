export type PresenceStatus = "online" | "away" | "offline";
export type ChannelType = "public" | "private" | "direct";
export interface ChatUser {
    id: string;
    displayName: string;
    handle: string;
    avatar?: string;
    status: PresenceStatus;
    lastSeenAt?: string;
}
export interface ChatChannel {
    id: string;
    name: string;
    type: ChannelType;
    description?: string;
    unreadCount: number;
    memberIds: string[];
    dmUserId?: string;
}
export interface ChatAttachment {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
}
export interface ChatReaction {
    emoji: string;
    count: number;
    userIds: string[];
}
export interface ChatMessage {
    id: string;
    channelId: string;
    author: ChatUser;
    body: string;
    createdAt: string;
    editedAt?: string;
    deletedAt?: string;
    threadRootId?: string;
    replyCount: number;
    attachments: ChatAttachment[];
    reactions: ChatReaction[];
    mentionUserIds: string[];
    readByUserIds: string[];
    codeLanguage?: string;
}
export interface ChatEventMap {
    "chat:channel-list": (channels: ChatChannel[]) => void;
    "chat:channel-created": (channel: ChatChannel) => void;
    "chat:channel-joined": (channel: ChatChannel) => void;
    "chat:channel-left": (channelId: string) => void;
    "chat:history": (payload: {
        channelId: string;
        messages: ChatMessage[];
    }) => void;
    "chat:message-created": (message: ChatMessage) => void;
    "chat:message-updated": (message: ChatMessage) => void;
    "chat:message-deleted": (payload: {
        channelId: string;
        messageId: string;
    }) => void;
    "chat:reaction-updated": (message: ChatMessage) => void;
    "chat:typing": (payload: {
        channelId: string;
        user: ChatUser;
        isTyping: boolean;
    }) => void;
    "chat:presence": (users: ChatUser[]) => void;
    "chat:read-receipt": (payload: {
        channelId: string;
        messageId: string;
        userId: string;
    }) => void;
    "chat:notification": (payload: {
        message: string;
        channelId: string;
        messageId: string;
    }) => void;
    "chat:ai-thread-reply": (message: ChatMessage) => void;
    "chat:error": (payload: {
        code: string;
        message: string;
    }) => void;
}
export interface ChatClientToServerEvents {
    "chat:subscribe": (payload: {
        channelId: string;
    }) => void;
    "chat:unsubscribe": (payload: {
        channelId: string;
    }) => void;
    "chat:create-channel": (payload: {
        name: string;
        description?: string;
        isPrivate?: boolean;
    }, ack?: Ack<ChatChannel>) => void;
    "chat:join-channel": (payload: {
        channelId: string;
    }, ack?: Ack<ChatChannel>) => void;
    "chat:leave-channel": (payload: {
        channelId: string;
    }, ack?: Ack<void>) => void;
    "chat:send-message": (payload: SendMessagePayload, ack?: Ack<ChatMessage>) => void;
    "chat:edit-message": (payload: {
        messageId: string;
        body: string;
    }, ack?: Ack<ChatMessage>) => void;
    "chat:delete-message": (payload: {
        messageId: string;
    }, ack?: Ack<void>) => void;
    "chat:toggle-reaction": (payload: {
        messageId: string;
        emoji: string;
    }) => void;
    "chat:typing": (payload: {
        channelId: string;
        isTyping: boolean;
    }) => void;
    "chat:mark-read": (payload: {
        channelId: string;
        messageId: string;
    }) => void;
    "chat:search": (payload: {
        query: string;
        channelId?: string;
    }, ack?: Ack<ChatMessage[]>) => void;
    "chat:start-dm": (payload: {
        userId: string;
    }, ack?: Ack<ChatChannel>) => void;
}
export interface ChatServerToClientEvents extends ChatEventMap {
}
export interface ChatInterServerEvents {
}
export interface ChatSocketData {
    user: ChatUser;
}
export interface SendMessagePayload {
    channelId: string;
    body: string;
    threadRootId?: string;
    attachments?: ChatAttachment[];
    codeLanguage?: string;
}
export type Ack<T> = (result: {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
}) => void;
