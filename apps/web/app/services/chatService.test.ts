import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chatService, type ChatMessageInput } from "./chatService";

const storage = new Map<string, string>();
const testScope = "chat-service-test@example.com";
const messageInput: ChatMessageInput = {
  sender: "Test User",
  role: "Engineer",
  roleColor: "text-ide-text-secondary",
  avatar: "",
  text: "A test message",
};
let previousWindow: PropertyDescriptor | undefined;

beforeEach(() => {
  storage.clear();
  previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  chatService.setStorageScope(testScope);
});

afterEach(() => {
  if (previousWindow) {
    Object.defineProperty(globalThis, "window", previousWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
});

describe("local chat service", () => {
  it("persists created channels and avoids duplicate direct messages", () => {
    const channel = chatService.createChannel({
      name: "design-system",
      description: "Design reviews",
      visibility: "private",
      members: ["Sarah Lin"],
    });

    expect(chatService.listChannels()).toContainEqual(channel);
    chatService.setStorageScope(testScope);
    expect(chatService.listChannels()).toContainEqual(channel);

    const person = chatService.searchPeople("sArAh")[0]!;
    chatService.startDirectMessage(person);
    chatService.startDirectMessage(person);
    expect(chatService.listDirectMessages().filter((dm) => dm.name === person.name))
      .toHaveLength(1);
  });

  it("supports message, reaction, thread, reminder, pin, and saved actions", () => {
    const parent = chatService.sendMessage("channel:frontend", messageInput);
    chatService.editMessage("channel:frontend", parent.id, "Updated message");
    expect(chatService.listMessages("channel:frontend").at(-1)?.edited).toBe(true);

    chatService.toggleReaction("channel:frontend", parent.id, "👀", "Sarah Lin");
    expect(chatService.listMessages("channel:frontend").at(-1)?.reactions[0]?.users)
      .toContain("Sarah Lin");

    chatService.setReplyThread(parent.id);
    chatService.replyToThread("channel:frontend", parent.id, messageInput);
    expect(chatService.getThreadReplies(parent.id)).toHaveLength(1);

    expect(chatService.toggleSaved("channel:frontend", parent.id)).toBe(true);
    expect(chatService.togglePin("channel:frontend", parent.id)).toBe(true);
    expect(chatService.listPinnedMessages("channel:frontend").map((message) => message.id))
      .toContain(parent.id);
    expect(chatService.toggleThreadNotifications("channel:frontend", parent.id)).toBe(true);

    const reminder = chatService.setReminder(
      "channel:frontend",
      parent.id,
      Date.now() + 60_000,
    );
    expect(chatService.listReminders()).toContainEqual(reminder);
    chatService.markReminderFired(reminder.id);
    expect(chatService.listReminders().find((item) => item.id === reminder.id)?.fired)
      .toBe(true);

    chatService.addTodo("channel:frontend", parent);
    expect(chatService.listTodos()).toHaveLength(1);
    chatService.markUnread("channel:frontend", parent.id);
    expect(chatService.listChannels().find((channel) => channel.name === "frontend")?.unread)
      .toBe(true);

    expect(chatService.deleteMessage("channel:frontend", parent.id)?.id).toBe(parent.id);
    chatService.restoreMessage("channel:frontend", parent);
    expect(chatService.listMessages("channel:frontend").some((item) => item.id === parent.id))
      .toBe(true);
  });
});
