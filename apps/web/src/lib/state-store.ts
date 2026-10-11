interface StateRecord {
  key: string;
  value: string;
  expiresAt: number | null;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: number;
}

interface PresenceRecord {
  status: "online" | "away";
  at: number;
}

const DB_NAME = "devpulse-state";
const STORE_NAME = "state";

function validateKey(key: string): void {
  if (!key.trim()) throw new Error("State keys must not be empty.");
}

function validateTTL(ttl: number | undefined): void {
  if (ttl !== undefined && (!Number.isFinite(ttl) || ttl <= 0)) {
    throw new Error("TTL must be a positive finite number of seconds.");
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

export class BrowserStateStore {
  private readonly memory = new Map<string, StateRecord>();
  private database: IDBDatabase | null = null;
  private initPromise: Promise<void> | undefined;
  private broadcast: BroadcastChannel | null = null;

  init(): Promise<void> {
    if (this.database) return Promise.resolve();
    if (this.initPromise) return this.initPromise;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB is not available in this browser."));
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          if (this.database === database) {
            this.database = null;
            this.initPromise = undefined;
          }
        };
        this.database = database;
        if (typeof BroadcastChannel !== "undefined") {
          this.broadcast = new BroadcastChannel("devpulse-state");
          this.broadcast.onmessage = (event: MessageEvent<{ key?: string; clear?: boolean }>) => {
            if (event.data?.clear) this.memory.clear();
            else if (event.data?.key) this.memory.delete(event.data.key);
          };
        }
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to open browser state storage."));
      request.onblocked = () => reject(new Error("Browser state storage upgrade is blocked by another tab."));
    }).catch((error: unknown) => {
      this.initPromise = undefined;
      throw error;
    });

    return this.initPromise;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    validateKey(key);
    validateTTL(ttl);
    if (typeof value !== "string") throw new TypeError("Browser state values must be strings.");
    const record: StateRecord = {
      key,
      value,
      expiresAt: ttl === undefined ? null : Date.now() + ttl * 1000,
    };
    const database = this.requireDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    await transactionDone(transaction);
    this.memory.set(key, record);
    this.broadcast?.postMessage({ key });
  }

  async get(key: string): Promise<string | null> {
    validateKey(key);
    const cached = this.memory.get(key);
    if (cached) {
      if (this.isExpired(cached)) {
        this.memory.delete(key);
        await this.deletePersisted(key);
        return null;
      }
      return cached.value;
    }

    const database = this.requireDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionDone(transaction);
    const record = await requestResult(
      transaction.objectStore(STORE_NAME).get(key) as IDBRequest<StateRecord | undefined>,
    );
    await done;
    if (!record) return null;
    if (this.isExpired(record)) {
      await this.delete(key);
      return null;
    }
    this.memory.set(key, record);
    return record.value;
  }

  async delete(key: string): Promise<void> {
    validateKey(key);
    this.memory.delete(key);
    await this.deletePersisted(key);
    this.broadcast?.postMessage({ key });
  }

  async incr(key: string): Promise<number> {
    validateKey(key);
    const database = this.requireDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const done = transactionDone(transaction);
    const currentResultPromise = new Promise<{ count: number; record: StateRecord }>((resolve, reject) => {
      const request = store.get(key) as IDBRequest<StateRecord | undefined>;
      request.onsuccess = () => {
        try {
          const previous = request.result;
          const current = previous && !this.isExpired(previous)
            ? this.parseCounter(previous.value, key)
            : 0;
          const updated: StateRecord = {
            key,
            value: String(current + 1),
            expiresAt: previous && !this.isExpired(previous) ? previous.expiresAt : null,
          };
          store.put(updated);
          resolve({ count: current + 1, record: updated });
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB counter read failed."));
    });
    const [currentResult] = await Promise.all([currentResultPromise, done]);
    const { count, record } = currentResult;
    this.memory.set(key, record);
    this.broadcast?.postMessage({ key });
    return count;
  }

  async checkRateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
    validateKey(key);
    if (!Number.isInteger(max) || max < 1) throw new Error("Rate limit max must be a positive integer.");
    validateTTL(windowSeconds);

    const database = this.requireDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const done = transactionDone(transaction);
    const resultPromise = new Promise<{ record: StateRecord; count: number; resetAt: number }>((resolve, reject) => {
      const request = store.get(key) as IDBRequest<StateRecord | undefined>;
      request.onsuccess = () => {
        try {
          const existing = request.result;
          const now = Date.now();
          const active = existing && !this.isExpired(existing);
          const current = active ? this.parseCounter(existing.value, key) : 0;
          const resetAt = active && existing.expiresAt !== null
            ? existing.expiresAt
            : now + windowSeconds * 1000;
          const count = current + 1;
          const record: StateRecord = { key, value: String(count), expiresAt: resetAt };
          store.put(record);
          resolve({ record, count, resetAt });
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB rate-limit read failed."));
    });
    const [result] = await Promise.all([resultPromise, done]);
    const { record, count, resetAt } = result;
    this.memory.set(key, record);
    this.broadcast?.postMessage({ key });
    return { allowed: count <= max, count, resetAt };
  }

  async setPresence(
    userId: string,
    status: "online" | "away" | "offline",
  ): Promise<void> {
    validateKey(userId);
    const key = `presence:${userId}`;
    if (status === "offline") {
      await this.delete(key);
      return;
    }
    const presence: PresenceRecord = { status, at: Date.now() };
    await this.set(key, JSON.stringify(presence), 300);
  }

  async getPresence(userId: string): Promise<PresenceRecord | null> {
    const value = await this.get(`presence:${userId}`);
    if (value === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      await this.delete(`presence:${userId}`);
      throw new Error("Stored presence data is invalid JSON.", { cause: error });
    }
    if (
      typeof parsed !== "object"
      || parsed === null
      || !("status" in parsed)
      || (parsed.status !== "online" && parsed.status !== "away")
      || !("at" in parsed)
      || typeof parsed.at !== "number"
    ) {
      await this.delete(`presence:${userId}`);
      throw new Error("Stored presence data has an invalid format.");
    }
    return { status: parsed.status, at: parsed.at };
  }

  async clear(): Promise<void> {
    const database = this.requireDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
    this.memory.clear();
    this.broadcast?.postMessage({ clear: true });
  }

  close(): void {
    this.database?.close();
    this.database = null;
    this.broadcast?.close();
    this.broadcast = null;
    this.initPromise = undefined;
    this.memory.clear();
  }

  private requireDatabase(): IDBDatabase {
    if (!this.database) throw new Error("Call BrowserStateStore.init() before using the state store.");
    return this.database;
  }

  private isExpired(record: StateRecord): boolean {
    return record.expiresAt !== null && Date.now() >= record.expiresAt;
  }

  private parseCounter(value: string, key: string): number {
    if (!/^(0|[1-9]\d*)$/.test(value)) {
      throw new Error(`Stored counter for "${key}" is not a non-negative integer.`);
    }
    const count = Number(value);
    if (!Number.isSafeInteger(count)) throw new Error(`Stored counter for "${key}" exceeds the safe integer range.`);
    return count;
  }

  private async deletePersisted(key: string): Promise<void> {
    if (!this.database) return;
    const transaction = this.database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    await transactionDone(transaction);
  }
}
