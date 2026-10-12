import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { BrowserStateStore } from "./state-store";
import { BrowserFileStorage } from "./file-storage";
import { RealtimeService } from "./realtime";
import * as schema from "./db/schema";
import { seedIfEmpty } from "./db";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

export class DevpulseServices {
  private static _instance: DevpulseServices | null = null;
  private _ready = false;

  db!: DrizzleDB;
  store!: BrowserStateStore;
  storage!: BrowserFileStorage;
  realtime!: RealtimeService;

  static async getInstance(): Promise<DevpulseServices> {
    if (!DevpulseServices._instance) {
      DevpulseServices._instance = new DevpulseServices();
      await DevpulseServices._instance.init();
    }
    return DevpulseServices._instance;
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

    const client = new PGlite("idb://devpulse-v1", { relaxedDurability: true });
    await client.waitReady;
    this.db = drizzle(client, { schema });
    await this.runMigrations(client);

    this.store = new BrowserStateStore();
    await this.store.init();

    this.storage = new BrowserFileStorage();
    await this.storage.init();

    const userId = sessionStorage.getItem("dp_user_id") ?? "anonymous";
    this.realtime = new RealtimeService(userId);

    await seedIfEmpty();
    this._ready = true;
  }

  private async runMigrations(client: PGlite): Promise<void> {
    await client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        avatar_url TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS workspace_memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        UNIQUE(user_id, workspace_id)
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        language TEXT DEFAULT 'typescript',
        is_private BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT DEFAULT '',
        language TEXT,
        project_id TEXT NOT NULL,
        size_bytes INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, path)
      );
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        type TEXT DEFAULT 'PUBLIC',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(workspace_id, name)
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'TEXT',
        channel_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT 'New conversation',
        user_id TEXT NOT NULL,
        file_id TEXT,
        project_id TEXT,
        model TEXT DEFAULT 'claude-sonnet-4-6',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens_used INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  }
}
