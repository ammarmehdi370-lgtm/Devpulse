import { eq } from "drizzle-orm";
import { files, fileRevisions, messages, projects, users } from "./schema";
import type { BrowserDatabase } from "../db";

export async function getUserByEmail(db: BrowserDatabase, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function getProjectWithFiles(db: BrowserDatabase, projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return undefined;

  const projectFiles = await db.select().from(files).where(eq(files.projectId, projectId));
  return { ...project, files: projectFiles };
}

export async function insertMessage(
  db: BrowserDatabase,
  input: { channelId: string; authorId: string; body: string },
) {
  const [message] = await db.insert(messages).values(input).returning();
  if (!message) throw new Error("Message insert returned no row.");
  return message;
}

export async function updateFileContent(
  db: BrowserDatabase,
  input: { fileId: string; content: string; authorId?: string },
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(files)
      .where(eq(files.id, input.fileId))
      .limit(1);
    if (!current) throw new Error(`File not found: ${input.fileId}`);

    const now = new Date();
    const [updated] = await tx.update(files).set({
      content: input.content,
      sizeBytes: new TextEncoder().encode(input.content).byteLength,
      version: current.version + 1,
      lastEditedById: input.authorId,
      lastEditedAt: now,
      updatedAt: now,
    }).where(eq(files.id, current.id)).returning();
    if (!updated) throw new Error(`File disappeared while saving: ${current.id}`);

    await tx.insert(fileRevisions).values({
      fileId: current.id,
      version: current.version,
      content: current.content,
      authorId: input.authorId,
    });
    return updated;
  });
}
