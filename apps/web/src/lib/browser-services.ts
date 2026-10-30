import { seedIfEmpty, getDB } from "./db";
import { BrowserFileStorage } from "./file-storage";
import { BrowserStateStore } from "./state-store";
import { AuthService } from "../services/auth.service";
import { FileService } from "../services/file.service";
import { MessageService } from "../services/message.service";
import { RealtimeService } from "./realtime";
import { AIService } from "../services/ai.service";
import { getAccessToken } from "./auth-store";

export class BrowserServices {
  readonly store = new BrowserStateStore();
  readonly storage = new BrowserFileStorage();
  readonly auth: AuthService;
  readonly files: FileService;
  readonly ai: AIService;

  private static instancePromise: Promise<BrowserServices> | undefined;
  private initialized = false;
  realtime: RealtimeService | null = null;
  messages: MessageService | null = null;

  private constructor() {
    this.auth = new AuthService((userId) => this.realtime?.setUserId(userId));
    this.files = new FileService(this.storage);
    this.ai = new AIService(
      process.env.NEXT_PUBLIC_AI_PROXY_URL ?? "",
      getAccessToken,
      () => this.auth.getCurrentUserId(),
    );
  }

  static getInstance(): Promise<BrowserServices> {
    if (!this.instancePromise) {
      const instance = new BrowserServices();
      this.instancePromise = instance.initialize().then(() => instance).catch((error: unknown) => {
        instance.close();
        this.instancePromise = undefined;
        throw error;
      });
    }
    return this.instancePromise;
  }

  get isReady(): boolean {
    return this.initialized;
  }

  close(): void {
    this.initialized = false;
    this.realtime?.destroy();
    this.realtime = null;
    this.messages = null;
    this.store.close();
    this.storage.close();
  }

  private async initialize(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("BrowserServices can only be initialized in a browser.");
    }

    await Promise.all([this.store.init(), this.storage.init()]);
    await getDB();
    await seedIfEmpty();
    this.realtime = new RealtimeService(this.auth.getCurrentUserId() ?? undefined);
    this.files.setOnChanged((fileId, projectId) => {
      this.realtime?.emit("file:changed", { fileId, projectId });
    });
    this.messages = new MessageService(this.realtime);
    this.initialized = true;
  }
}

export const getServices = (): Promise<BrowserServices> => BrowserServices.getInstance();
