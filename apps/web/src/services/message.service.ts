import { and, asc, eq, isNull } from "drizzle-orm";
import { getDB } from "../lib/db";
import { messages, type Message } from "../lib/db/schema";
import { RealtimeService } from "../lib/realtime";

export class MessageService {
  constructor(private readonly realtime: RealtimeService) {}

  async list(channelId: string): Promise<Message[]> {
    const db = await getDB();
    return db.select().from(messages)
      .where(and(eq(messages.channelId, channelId), isNull(messages.deletedAt)))
      .orderBy(asc(messages.createdAt));
  }

  async send(channelId: string, authorId: string, body: string): Promise<Message> {
    const text = body.trim();
    if (!text) throw new Error("Message cannot be empty.");
    const db = await getDB();
    const [message] = await db.insert(messages).values({
      id: crypto.randomUUID(),
      channelId,
      authorId,
      body: text,
    }).returning();
    if (!message) throw new Error("Message insert returned no row.");
    this.realtime.sendMessage(channelId, message);
    return message;
  }

  async edit(messageId: string, authorId: string, body: string): Promise<Message> {
    const text = body.trim();
    if (!text) throw new Error("Message cannot be empty.");
    const db = await getDB();
    const [message] = await db.update(messages)
      .set({ body: text, editedAt: new Date() })
      .where(and(eq(messages.id, messageId), eq(messages.authorId, authorId)))
      .returning();
    if (!message) throw new Error(`Message not found or not editable: ${messageId}`);
    this.realtime.sendMessage(message.channelId, message);
    return message;
  }

  async delete(messageId: string, authorId: string): Promise<void> {
    const db = await getDB();
    const [existing] = await db.select().from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!existing) return;
    if (existing.authorId !== authorId) {
      throw new Error("A local message can only be deleted by its author.");
    }
    const [message] = await db.update(messages)
      .set({ deletedAt: new Date() })
      .where(and(eq(messages.id, messageId), eq(messages.authorId, authorId)))
      .returning();
    if (!message) return;
    this.realtime.emit("message:deleted", {
      channelId: message.channelId,
      messageId,
    });
  }

}
