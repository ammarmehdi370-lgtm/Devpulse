import { asc, eq } from "drizzle-orm";
import { BrowserStateStore } from "./state-store";
import { BrowserFileStorage } from "./file-storage";
import { RealtimeService } from "./realtime";
import * as schema from "./db/schema";
import { getDB, seedIfEmpty, type BrowserDatabase } from "./db";

type DrizzleDB = BrowserDatabase;

class LocalFileService {
  constructor(
    private readonly db: () => Promise<DrizzleDB>,
    private readonly onFileChanged: (fileId: string, projectId: string) => void,
  ) {}

  async getProjectFiles(projectId: string) {
    const db = await this.db();
    return db.select().from(schema.files)
      .where(eq(schema.files.projectId, projectId))
      .orderBy(asc(schema.files.path));
  }

  async createFile(input: { projectId: string; path: string; content: string; language?: string | null }) {
    const path = input.path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/^\./, "");
    const db = await this.db();
    const [created] = await db.insert(schema.files).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      path,
      content: input.content,
      language: input.language ?? null,
      sizeBytes: new TextEncoder().encode(input.content).byteLength,
      version: 1,
      lastEditedAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (!created) {
      throw new Error("File creation returned no row.");
    }

    this.onFileChanged(created.id, created.projectId);
    return created;
  }

  async saveFile(fileId: string, content: string, _message?: string) {
    const db = await this.db();
    const [existing] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
    if (!existing) {
      throw new Error(`File not found: ${fileId}`);
    }

    const [updated] = await db.update(schema.files)
      .set({
        content,
        sizeBytes: new TextEncoder().encode(content).byteLength,
        version: (existing.version ?? 1) + 1,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.files.id, fileId))
      .returning();

    if (!updated) {
      throw new Error(`Could not save file: ${fileId}`);
    }

    this.onFileChanged(updated.id, updated.projectId);
    return updated;
  }

  async renameFile(fileId: string, path: string): Promise<void> {
    const db = await this.db();
    const [existing] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
    if (!existing) {
      throw new Error(`File not found: ${fileId}`);
    }

    const [updated] = await db.update(schema.files)
      .set({
        path: path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/^\./, ""),
        updatedAt: new Date(),
      })
      .where(eq(schema.files.id, fileId))
      .returning();
    if (!updated) {
      throw new Error(`Could not rename file: ${fileId}`);
    }
    this.onFileChanged(updated.id, updated.projectId);
  }

  async deleteFile(fileId: string): Promise<void> {
    const db = await this.db();
    const [existing] = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
    if (!existing) return;
    await db.delete(schema.files).where(eq(schema.files.id, fileId));
    this.onFileChanged(existing.id, existing.projectId);
  }
}

export class DevpulseServices {
  private static _instance: DevpulseServices | null = null;
  private static _instancePromise: Promise<DevpulseServices> | undefined;
  private _ready = false;

  db!: DrizzleDB;
  store!: BrowserStateStore;
  storage!: BrowserFileStorage;
  realtime!: RealtimeService;
  files: LocalFileService;

  constructor() {
    this.files = new LocalFileService(
      async () => {
        if (!this.db) {
          throw new Error("Devpulse database is not initialized.");
        }
        return this.db;
      },
      (fileId, projectId) => {
        this.realtime?.emit("file:changed", { fileId, projectId });
      },
    );
  }

  static getInstance(): Promise<DevpulseServices> {
    if (!this._instancePromise) {
      const instance = new DevpulseServices();
      this._instance = instance;
      this._instancePromise = instance.init().then(() => instance).catch((error: unknown) => {
        instance.close();
        if (this._instance === instance) this._instance = null;
        this._instancePromise = undefined;
        throw error;
      });
    }
    return this._instancePromise;
  }

  get isReady(): boolean {
    return this._ready;
  }

  close(): void {
    this.realtime?.destroy();
    this.store?.close();
    this.storage?.close();
    this._ready = false;
  }

  private async init(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("DevpulseServices can only be initialized in a browser.");
    }

    this.db = await getDB();

    this.store = new BrowserStateStore();
    await this.store.init();

    this.storage = new BrowserFileStorage();
    await this.storage.init();

    const userId = sessionStorage.getItem("dp_user_id") ?? "anonymous";
    this.realtime = new RealtimeService(userId);

    await seedIfEmpty();
    this._ready = true;
  }
}

export type BrowserServices = DevpulseServices;
export const getServices = async (): Promise<BrowserServices> =>
  DevpulseServices.getInstance();
