import { and, asc, eq } from "drizzle-orm";
import { getDB } from "../lib/db";
import { fileRevisions, files, type ProjectFile } from "../lib/db/schema";
import { BrowserFileStorage } from "../lib/file-storage";

export interface FileTreeNode extends ProjectFile {
  name: string;
  type: "file" | "directory";
  children: FileTreeNode[];
}

export interface CreateFileInput {
  name?: string;
  path: string;
  content: string;
  language?: string | null;
  projectId: string;
}

function normalizePath(path: string): string {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!segments.length || segments.some((part) => part === "." || part === "..")) {
    throw new Error("File path must contain valid path segments.");
  }
  return segments.join("/");
}

export class FileService {
  private onChanged: ((fileId: string, projectId: string) => void) | undefined;

  constructor(private readonly storage: BrowserFileStorage) {}

  setOnChanged(handler: (fileId: string, projectId: string) => void): void {
    this.onChanged = handler;
  }

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const db = await getDB();
    return db.select().from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(asc(files.path));
  }

  async getFile(fileId: string): Promise<ProjectFile | null> {
    const db = await getDB();
    const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    return file ?? null;
  }

  async createFile(data: CreateFileInput): Promise<ProjectFile> {
    const path = normalizePath(data.path);
    const db = await getDB();
    const id = crypto.randomUUID();
    const storagePath = `projects/${data.projectId}/${path}`;
    await this.storage.writeFile(storagePath, data.content);
    let file: ProjectFile;
    try {
      const [created] = await db.insert(files).values({
        id,
        projectId: data.projectId,
        path,
        content: data.content,
        language: data.language ?? null,
        sizeBytes: new TextEncoder().encode(data.content).byteLength,
        version: 1,
        lastEditedAt: new Date(),
      }).returning();
      if (!created) throw new Error("File insert returned no row.");
      file = created;
    } catch (error) {
      try {
        await this.storage.deleteFile(storagePath);
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "File creation failed and its OPFS data could not be removed.");
      }
      throw error;
    }
    this.onChanged?.(file.id, file.projectId);
    return file;
  }

  async createBinaryFile(data: Omit<CreateFileInput, "content"> & { content: Uint8Array }): Promise<ProjectFile> {
    const path = normalizePath(data.path);
    const db = await getDB();
    const id = crypto.randomUUID();
    const storagePath = `projects/${data.projectId}/${path}`;
    await this.storage.writeFile(storagePath, data.content);
    let file: ProjectFile;
    try {
      const [created] = await db.insert(files).values({
        id,
        projectId: data.projectId,
        path,
        content: "",
        language: data.language ?? null,
        sizeBytes: data.content.byteLength,
        version: 1,
        lastEditedAt: new Date(),
      }).returning();
      if (!created) throw new Error("Binary file insert returned no row.");
      file = created;
    } catch (error) {
      try {
        await this.storage.deleteFile(storagePath);
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Binary file creation failed and its OPFS data could not be removed.");
      }
      throw error;
    }
    this.onChanged?.(file.id, file.projectId);
    return file;
  }

  async readFile(fileId: string): Promise<string> {
    const file = await this.getFile(fileId);
    if (!file) throw new Error(`File not found: ${fileId}`);
    return this.storage.readFile(`projects/${file.projectId}/${normalizePath(file.path)}`);
  }

  async readFileBytes(fileId: string): Promise<Uint8Array> {
    const file = await this.getFile(fileId);
    if (!file) throw new Error(`File not found: ${fileId}`);
    return this.storage.readFileBytes(`projects/${file.projectId}/${normalizePath(file.path)}`);
  }

  async saveFile(fileId: string, content: string, message?: string): Promise<ProjectFile> {
    const db = await getDB();
    const file = await this.getFile(fileId);
    if (!file) throw new Error(`File not found: ${fileId}`);

    const newVersion = file.version + 1;
    const now = new Date();
    const storagePath = `projects/${file.projectId}/${normalizePath(file.path)}`;
    const previousStoredContent = await this.readOptionalBytes(storagePath);
    await this.storage.writeFile(storagePath, content);
    try {
      const updated = await db.transaction(async (tx) => {
        const [updated] = await tx.update(files).set({
          content,
          version: newVersion,
          sizeBytes: new TextEncoder().encode(content).byteLength,
          lastEditedAt: now,
          updatedAt: now,
        }).where(and(eq(files.id, fileId), eq(files.version, file.version))).returning();
        if (!updated) throw new Error("File changed in another operation; reload it before saving.");

        await tx.insert(fileRevisions).values({
          id: crypto.randomUUID(),
          fileId,
          content: file.content,
          version: file.version,
          diffPatch: message ?? null,
        });
        return updated;
      });
    } catch (error) {
      try {
        await this.restoreStoragePath(storagePath, previousStoredContent);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "File save failed and the previous OPFS content could not be restored.");
      }
      throw error;
    }
    this.onChanged?.(updated.id, updated.projectId);
    return updated;
  }

  async saveBinaryFile(fileId: string, content: Uint8Array): Promise<ProjectFile> {
    const db = await getDB();
    const file = await this.getFile(fileId);
    if (!file) throw new Error(`File not found: ${fileId}`);

    const now = new Date();
    const storagePath = `projects/${file.projectId}/${normalizePath(file.path)}`;
    const previousStoredContent = await this.readOptionalBytes(storagePath);
    await this.storage.writeFile(storagePath, content);
    let updated: ProjectFile;
    try {
      updated = await db.transaction(async (tx) => {
        const [result] = await tx.update(files).set({
          content: "",
          version: file.version + 1,
          sizeBytes: content.byteLength,
          lastEditedAt: now,
          updatedAt: now,
        }).where(and(eq(files.id, fileId), eq(files.version, file.version))).returning();
        if (!result) throw new Error("File changed in another operation; reload it before saving.");
        await tx.insert(fileRevisions).values({
          id: crypto.randomUUID(),
          fileId,
          content: file.content,
          version: file.version,
        });
        return result;
      });
    } catch (error) {
      try {
        await this.restoreStoragePath(storagePath, previousStoredContent);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "Binary save failed and the previous OPFS content could not be restored.");
      }
      throw error;
    }
    this.onChanged?.(updated.id, updated.projectId);
    return updated;
  }

  async deleteFile(fileId: string): Promise<void> {
    const db = await getDB();
    const file = await this.getFile(fileId);
    if (!file) return;

    const storagePath = `projects/${file.projectId}/${normalizePath(file.path)}`;
    const previousContent = await this.readOptionalBytes(storagePath);

    if (previousContent !== null) await this.storage.deleteFile(storagePath);
    try {
      await db.delete(files).where(eq(files.id, fileId));
    } catch (error) {
      if (previousContent !== null) {
        try {
          await this.restoreStoragePath(storagePath, previousContent);
        } catch (restoreError) {
          throw new AggregateError([error, restoreError], "File deletion failed and the stored content could not be restored.");
        }
      }
      throw error;
    }
    this.onChanged?.(file.id, file.projectId);
  }

  async getFileTree(projectId: string): Promise<FileTreeNode[]> {
    const fileRecords = await this.getProjectFiles(projectId);
    const root: FileTreeNode[] = [];
    const directories = new Map<string, FileTreeNode>();

    for (const file of fileRecords) {
      const segments = normalizePath(file.path).split("/");
      let parentPath = "";
      let parent: FileTreeNode | undefined;
      for (const segment of segments.slice(0, -1)) {
        parentPath = parentPath ? `${parentPath}/${segment}` : segment;
        let directory = directories.get(parentPath);
        if (!directory) {
          directory = {
            ...file,
            id: `${projectId}:${parentPath}`,
            path: parentPath,
            name: segment,
            type: "directory",
            children: [],
          };
          directories.set(parentPath, directory);
          if (parent) parent.children.push(directory);
          else root.push(directory);
        }
        parent = directory;
      }

      const node: FileTreeNode = {
        ...file,
        name: segments.at(-1)!,
        type: "file",
        children: [],
      };
      if (parent) parent.children.push(node);
      else root.push(node);
    }
    return root;
  }

  private async readOptionalBytes(path: string): Promise<Uint8Array | null> {
    try {
      return await this.storage.readFileBytes(path);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return null;
      throw error;
    }
  }

  private async restoreStoragePath(path: string, content: Uint8Array | null): Promise<void> {
    if (content !== null) {
      await this.storage.writeFile(path, content);
    } else if (await this.storage.fileExists(path)) {
      await this.storage.deleteFile(path);
    }
  }
}
