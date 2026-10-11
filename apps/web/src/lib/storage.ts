const FALLBACK_DB = "devpulse-file-storage";
const FALLBACK_STORE = "files";

function normalizePath(path: string): string[] {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("File paths cannot contain '.' or '..' segments.");
  }
  if (segments.length === 0) throw new Error("A file path is required.");
  return segments;
}

function storageKey(path: string): string {
  return normalizePath(path).join("/");
}

function openFallbackDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FALLBACK_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FALLBACK_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

export class BrowserFileStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private fallbackDatabase: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Browser file storage can only be initialized in a browser.");
    }

    if (navigator.storage?.getDirectory) {
      try {
        this.root = await navigator.storage.getDirectory();
        return;
      } catch (error) {
        console.warn("OPFS is unavailable; using IndexedDB file storage.", error);
      }
    }

    this.fallbackDatabase = await openFallbackDatabase();
  }

  async writeFile(path: string, content: string | ArrayBuffer | Uint8Array): Promise<void> {
    this.assertInitialized();
    const key = storageKey(path);
    const bytes = typeof content === "string"
      ? new TextEncoder().encode(content)
      : content instanceof Uint8Array
        ? content
        : new Uint8Array(content);

    if (this.root) {
      const { directory, name } = await this.resolveParent(path, true);
      const file = await directory.getFileHandle(name, { create: true });
      const writable = await file.createWritable();
      const writeBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(writeBuffer).set(bytes);
      try {
        await writable.write(writeBuffer);
        await writable.close();
      } catch (error) {
        await writable.abort();
        throw error;
      }
      return;
    }

    await this.fallbackRequest("readwrite", (store) => store.put(bytes, key));
  }

  async readFile(path: string): Promise<string> {
    return new TextDecoder().decode(await this.readFileBytes(path));
  }

  async readFileBytes(path: string): Promise<Uint8Array> {
    this.assertInitialized();
    const key = storageKey(path);
    if (this.root) {
      const { directory, name } = await this.resolveParent(key, false);
      const file = await directory.getFileHandle(name);
      return new Uint8Array(await (await file.getFile()).arrayBuffer());
    }

    const value = await this.fallbackRequest<Uint8Array | undefined>(
      "readonly",
      (store) => store.get(key),
    );
    if (!value) throw new DOMException(`File not found: ${path}`, "NotFoundError");
    return new Uint8Array(value);
  }

  async deleteFile(path: string): Promise<void> {
    this.assertInitialized();
    const key = storageKey(path);
    if (this.root) {
      const { directory, name } = await this.resolveParent(key, false);
      await directory.removeEntry(name);
      return;
    }
    await this.fallbackRequest("readwrite", (store) => store.delete(key));
  }

  async listDirectory(path = ""): Promise<string[]> {
    this.assertInitialized();
    const segments = path ? normalizePath(path) : [];
    if (this.root) {
      let directory = this.root;
      for (const segment of segments) directory = await directory.getDirectoryHandle(segment);
      const names: string[] = [];
      for await (const [name] of directory.entries()) names.push(name);
      return names.sort();
    }

    const keys = await this.fallbackRequest<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
    const prefix = segments.length ? `${segments.join("/")}/` : "";
    return keys
      .map(String)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length).split("/")[0])
      .filter((name): name is string => name !== undefined)
      .filter((name, index, names) => names.indexOf(name) === index)
      .sort();
  }

  async fileExists(path: string): Promise<boolean> {
    this.assertInitialized();
    const key = storageKey(path);
    try {
      if (this.root) {
        const { directory, name } = await this.resolveParent(key, false);
        await directory.getFileHandle(name);
      } else {
        const result = await this.fallbackRequest<Uint8Array | undefined>(
          "readonly",
          (store) => store.get(key),
        );
        return result !== undefined;
      }
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return false;
      throw error;
    }
  }

  async clear(): Promise<void> {
    this.assertInitialized();
    if (!this.root) {
      await this.fallbackRequest("readwrite", (store) => store.clear());
      this.fallbackDatabase?.close();
      this.fallbackDatabase = null;
      return;
    }
    for await (const [name] of this.root.entries()) {
      await this.root.removeEntry(name, { recursive: true });
    }
    this.root = null;
  }

  close(): void {
    this.fallbackDatabase?.close();
    this.fallbackDatabase = null;
    this.root = null;
  }

  private assertInitialized(): void {
    if (!this.root && !this.fallbackDatabase) {
      throw new Error("BrowserFileStorage.init() must be called before use.");
    }
  }

  private async resolveParent(
    path: string,
    create: boolean,
  ): Promise<{ directory: FileSystemDirectoryHandle; name: string }> {
    if (!this.root) throw new Error("OPFS is not active.");
    const segments = normalizePath(path);
    const name = segments.pop();
    if (!name) throw new Error("A file name is required.");
    let directory = this.root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return { directory, name };
  }

  private async fallbackRequest<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = this.fallbackDatabase;
    if (!database) throw new Error("IndexedDB fallback is not initialized.");
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(FALLBACK_STORE, mode);
      const request = action(transaction.objectStore(FALLBACK_STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
      transaction.oncomplete = () => resolve(result);
    });
  }
}
