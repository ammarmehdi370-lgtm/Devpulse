import { and, eq, sql } from "drizzle-orm";
import * as Y from "yjs";
import {
  clearDatabase,
  initDatabase,
  type BrowserDatabase,
  type BrowserTransaction,
} from "../lib/db";
import {
  aiConversations,
  aiMessages,
  aiUsage,
  channels,
  fileRevisions,
  files,
  messages,
  projects,
  users,
  workspaces,
  workspaceMembers,
  type AIUsage,
  type AIConversation,
  type AIMessage,
  type Channel,
  type FileRevision,
  type Message,
  type Project,
  type ProjectFile,
  type User,
  type Workspace,
  type WorkspaceMember,
} from "../lib/db/schema";
import { RealtimeService } from "../lib/realtime";
import { BrowserFileStorage } from "../lib/storage";

function createId(): string {
  return crypto.randomUUID();
}

function trackStreamUsage(
  stream: ReadableStream<Uint8Array>,
  recordUsage: (tokens: number) => Promise<AIUsage>,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let outputTokens = 0;

  const inspectEvent = (rawEvent: string): void => {
    for (const line of rawEvent.split(/\r?\n/)) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      const event = JSON.parse(data) as {
        type?: string;
        usage?: { output_tokens?: number };
      };
      const reportedTokens = event.usage?.output_tokens;
      if (event.type === "message_delta" && Number.isInteger(reportedTokens)) {
        outputTokens = reportedTokens ?? outputTokens;
      }
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          if (buffer.trim()) inspectEvent(buffer);
          await recordUsage(outputTokens);
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";
        for (const event of events) inspectEvent(event);
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export class DatabaseService {
  constructor(private readonly db: BrowserDatabase) {}

  transaction<T>(operation: (tx: BrowserTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(operation);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? undefined;
  }

  async updateUser(id: string, input: Partial<Pick<User, "email" | "name" | "avatarUrl">>): Promise<User | undefined> {
    const [row] = await this.db.update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async createUser(input: Pick<User, "email"> & Partial<Pick<User, "name" | "avatarUrl">>): Promise<User> {
    const [row] = await this.db.insert(users).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("User insert returned no row.");
    return row;
  }

  async listWorkspaces(ownerId: string): Promise<Workspace[]> {
    return this.db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId));
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [row] = await this.db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return row ?? undefined;
  }

  async createWorkspace(input: Pick<Workspace, "name" | "slug" | "ownerId">): Promise<Workspace> {
    const [row] = await this.db.insert(workspaces).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("Workspace insert returned no row.");
    return row;
  }

  async addWorkspaceMember(
    input: Pick<WorkspaceMember, "workspaceId" | "userId"> & Partial<Pick<WorkspaceMember, "role">>,
  ): Promise<WorkspaceMember> {
    const [row] = await this.db.insert(workspaceMembers).values(input).returning();
    if (!row) throw new Error("Workspace member insert returned no row.");
    return row;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.db.delete(workspaceMembers).where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ));
  }

  async updateWorkspace(id: string, input: Partial<Pick<Workspace, "name" | "slug" | "plan">>): Promise<Workspace | undefined> {
    const [row] = await this.db.update(workspaces)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return row ?? undefined;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.db.delete(workspaces).where(eq(workspaces.id, id));
  }

  async listProjects(workspaceId: string): Promise<Project[]> {
    return this.db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [row] = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return row ?? undefined;
  }

  async createProject(
    input: Pick<Project, "workspaceId" | "name"> & Partial<Pick<Project, "description" | "language" | "template">>,
  ): Promise<Project> {
    const [row] = await this.db.insert(projects).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("Project insert returned no row.");
    return row;
  }

  async updateProject(id: string, input: Partial<Pick<Project, "name" | "description" | "language" | "template" | "defaultBranch" | "isPrivate">>): Promise<Project | undefined> {
    const [row] = await this.db.update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return row ?? undefined;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async getFile(projectId: string, path: string): Promise<ProjectFile | undefined> {
    const [row] = await this.db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, path)))
      .limit(1);
    return row ?? undefined;
  }

  async listFiles(projectId: string): Promise<ProjectFile[]> {
    return this.db.select().from(files).where(eq(files.projectId, projectId));
  }

  async saveFile(input: Pick<ProjectFile, "projectId" | "path" | "content"> & Partial<Pick<ProjectFile, "language" | "lastEditedById" | "sizeBytes">>): Promise<ProjectFile> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select()
        .from(files)
        .where(and(eq(files.projectId, input.projectId), eq(files.path, input.path)))
        .limit(1);
      const now = new Date();
      const sizeBytes = input.sizeBytes ?? new TextEncoder().encode(input.content).byteLength;
      if (!existing) {
        const [row] = await tx.insert(files).values({
          id: createId(),
          ...input,
          sizeBytes,
          lastEditedAt: now,
        }).returning();
        if (!row) throw new Error("Inserted file row disappeared.");
        return row;
      }

      const [updated] = await tx.update(files)
        .set({
          ...input,
          sizeBytes,
          version: existing.version + 1,
          lastEditedAt: now,
          updatedAt: now,
        })
        .where(eq(files.id, existing.id))
        .returning();
      if (!updated) throw new Error(`File disappeared while saving: ${existing.id}`);
      await tx.insert(fileRevisions).values({
        id: createId(),
        fileId: existing.id,
        version: existing.version,
        content: existing.content,
        authorId: input.lastEditedById,
      });
      return updated;
    });
  }

  async createRevision(input: Pick<FileRevision, "fileId" | "version" | "content"> & Partial<Pick<FileRevision, "authorId" | "appliedFromAI" | "aiMessageId" | "diffPatch">>): Promise<FileRevision> {
    const [row] = await this.db.insert(fileRevisions)
      .values({ id: createId(), ...input })
      .returning();
    if (!row) throw new Error("File revision insert returned no row.");
    return row;
  }

  async deleteRevision(id: string): Promise<void> {
    await this.db.delete(fileRevisions).where(eq(fileRevisions.id, id));
  }

  async listRevisions(fileId: string): Promise<FileRevision[]> {
    return this.db.select().from(fileRevisions).where(eq(fileRevisions.fileId, fileId));
  }

  async listChannels(workspaceId: string): Promise<Channel[]> {
    return this.db.select().from(channels).where(eq(channels.workspaceId, workspaceId));
  }

  async createChannel(input: Pick<Channel, "workspaceId" | "name"> & Partial<Pick<Channel, "type">>): Promise<Channel> {
    const [row] = await this.db.insert(channels).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("Channel insert returned no row.");
    return row;
  }

  async updateChannel(id: string, input: Partial<Pick<Channel, "name" | "type">>): Promise<Channel | undefined> {
    const [row] = await this.db.update(channels).set(input).where(eq(channels.id, id)).returning();
    return row ?? undefined;
  }

  async deleteChannel(id: string): Promise<void> {
    await this.db.delete(channels).where(eq(channels.id, id));
  }

  async listMessages(channelId: string): Promise<Message[]> {
    return this.db.select().from(messages).where(eq(messages.channelId, channelId));
  }

  async createMessage(input: Pick<Message, "channelId" | "authorId" | "body">): Promise<Message> {
    const [row] = await this.db.insert(messages).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("Message insert returned no row.");
    return row;
  }

  async updateMessage(id: string, body: string): Promise<Message | undefined> {
    const [row] = await this.db.update(messages)
      .set({ body, editedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return row ?? undefined;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.id, id));
  }

  async deleteFile(id: string): Promise<void> {
    await this.db.delete(files).where(eq(files.id, id));
  }

  async createAIConversation(
    input: Pick<AIConversation, "userId"> &
      Partial<Pick<AIConversation, "title" | "projectId" | "fileId" | "model">>,
  ): Promise<AIConversation> {
    const [row] = await this.db.insert(aiConversations).values({ id: createId(), ...input }).returning();
    if (!row) throw new Error("AI conversation insert returned no row.");
    return row;
  }

  async listAIMessages(conversationId: string): Promise<AIMessage[]> {
    return this.db.select().from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);
  }

  async createAIMessage(
    input: Pick<AIMessage, "conversationId" | "role" | "content"> &
      Partial<Pick<AIMessage, "command" | "tokensUsed" | "responseTimeMs" | "hasCode" | "codeLanguage">>,
  ): Promise<AIMessage> {
    return this.db.transaction(async (tx) => {
      const [message] = await tx.insert(aiMessages)
        .values({ id: createId(), ...input })
        .returning();
      if (!message) throw new Error("AI message insert returned no row.");
      await tx.update(aiConversations)
        .set({ messageCount: sql`${aiConversations.messageCount} + 1`, updatedAt: new Date() })
        .where(eq(aiConversations.id, input.conversationId));
      return message;
    });
  }

  async recordAIUsage(userId: string, tokenCount: number): Promise<AIUsage> {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();
    const [row] = await this.db.insert(aiUsage).values({
      id: createId(),
      userId,
      month,
      year,
      requestCount: 1,
      tokenCount,
    }).onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.month, aiUsage.year],
      set: {
        requestCount: sql`${aiUsage.requestCount} + 1`,
        tokenCount: sql`${aiUsage.tokenCount} + ${tokenCount}`,
        updatedAt: now,
      },
    }).returning();
    if (!row) throw new Error("AI usage record insert returned no row.");
    return row;
  }
}

export class FileService {
  constructor(
    private readonly storage: BrowserFileStorage,
    private readonly database: DatabaseService,
  ) {}

  async init(): Promise<void> {
    await this.storage.init();
  }

  async save(projectId: string, path: string, content: string, userId?: string): Promise<ProjectFile> {
    await this.storage.writeFile(`${projectId}/${path}`, content);
    return this.database.saveFile({
      projectId,
      path,
      content,
      lastEditedById: userId,
    });
  }

  async read(projectId: string, path: string): Promise<string> {
    return this.storage.readFile(`${projectId}/${path}`);
  }

  async saveBinary(projectId: string, path: string, content: Uint8Array, userId?: string): Promise<ProjectFile> {
    await this.storage.writeFile(`${projectId}/${path}`, content);
    const saved = await this.database.saveFile({
      projectId,
      path,
      content: "",
      sizeBytes: content.byteLength,
      lastEditedById: userId,
    });
    return saved;
  }

  readBinary(projectId: string, path: string): Promise<Uint8Array> {
    return this.storage.readFileBytes(`${projectId}/${path}`);
  }

  async delete(projectId: string, path: string): Promise<void> {
    const record = await this.database.getFile(projectId, path);
    if (!record) return;
    await this.storage.deleteFile(`${projectId}/${path}`);
    await this.database.deleteFile(record.id);
  }

  clear(): Promise<void> {
    return this.storage.clear();
  }
}

export class AuthService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      if (token) sessionStorage.setItem("devpulse.accessToken", token);
      else sessionStorage.removeItem("devpulse.accessToken");
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window === "undefined") return null;
    this.accessToken = sessionStorage.getItem("devpulse.accessToken");
    return this.accessToken;
  }

  async requestMagicLink(endpoint: string, email: string): Promise<void> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(`Magic link request failed (${response.status}).`);
  }

  async refreshAccessToken(endpoint: string): Promise<string> {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Session refresh failed (${response.status}).`);
    const body = await response.json() as { accessToken?: string };
    if (!body.accessToken) throw new Error("Session refresh response did not include an access token.");
    this.setAccessToken(body.accessToken);
    return body.accessToken;
  }

  startOAuth(provider: "github" | "google", endpoint: string): void {
    if (typeof window === "undefined") throw new Error("OAuth redirects require a browser.");
    const url = new URL(endpoint, window.location.href);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("OAuth endpoint must use HTTPS.");
    }
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${provider}/start`;
    window.location.assign(url);
  }

  async signOut(endpoint: string): Promise<void> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.getAccessToken()
        ? { authorization: `Bearer ${this.getAccessToken()}` }
        : undefined,
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Sign out failed (${response.status}).`);
    this.setAccessToken(null);
  }
}

export class AIService {
  constructor(
    private readonly auth: AuthService,
    private readonly database: DatabaseService,
    private readonly endpoint: string,
  ) {}

  async chat(
    userId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.endpoint) {
      throw new Error("NEXT_PUBLIC_AI_PROXY_URL must point to the deployed AI Worker.");
    }
    const token = this.auth.getAccessToken();
    if (!token) throw new Error("An authenticated session is required to use AI.");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify({ messages }),
      signal,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`AI request failed (${response.status}): ${message}`);
    }
    if (!response.body) throw new Error("AI proxy returned no response stream.");
    return trackStreamUsage(response.body, (tokens) =>
      this.database.recordAIUsage(userId, tokens),
    );
  }
}

export class CollabService {
  readonly realtime = new RealtimeService();
  private readonly documents = new Map<string, Y.Doc>();
  private readonly documentChannels = new Map<string, BroadcastChannel>();

  openDocument(documentId: string): Y.Doc {
    const existing = this.documents.get(documentId);
    if (existing) return existing;

    const document = new Y.Doc();
    const channel = new BroadcastChannel(`devpulse:yjs:${documentId}`);
    channel.onmessage = (event: MessageEvent<Uint8Array>) => {
      if (!(event.data instanceof Uint8Array)) return;
      Y.applyUpdate(document, event.data, channel);
    };
    document.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin !== channel) channel.postMessage(update);
    });
    this.documents.set(documentId, document);
    this.documentChannels.set(documentId, channel);
    return document;
  }

  close(): void {
    for (const document of this.documents.values()) document.destroy();
    for (const channel of this.documentChannels.values()) channel.close();
    this.documents.clear();
    this.documentChannels.clear();
    this.realtime.close();
  }
}

export class DevpulseServices {
  private static instancePromise: Promise<DevpulseServices> | undefined;
  readonly database: DatabaseService;
  readonly files: FileService;
  readonly auth = new AuthService();
  readonly ai: AIService;
  readonly collab: CollabService;

  private constructor(db: BrowserDatabase) {
    this.database = new DatabaseService(db);
    const storage = new BrowserFileStorage();
    this.files = new FileService(storage, this.database);
    this.ai = new AIService(
      this.auth,
      this.database,
      process.env.NEXT_PUBLIC_AI_PROXY_URL ?? "",
    );
    this.collab = new CollabService();
  }

  static async getInstance(): Promise<DevpulseServices> {
    if (!this.instancePromise) {
      this.instancePromise = (async () => {
        const services = new DevpulseServices(await initDatabase());
        await services.files.init();
        return services;
      })();
      this.instancePromise.catch(() => {
        this.instancePromise = undefined;
      });
    }
    return this.instancePromise;
  }

  static async clearLocalData(): Promise<void> {
    const current = this.instancePromise ? await this.instancePromise : undefined;
    current?.auth.setAccessToken(null);
    current?.collab.close();
    await current?.files.clear();
    await clearDatabase();
    this.instancePromise = undefined;
  }
}
