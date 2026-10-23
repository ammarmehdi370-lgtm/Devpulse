import { and, eq } from "drizzle-orm";
import { getDB } from "../../src/lib/db";
import * as schema from "../../src/lib/db/schema";
import { getServices } from "../../src/lib/services";

export type EditorRunRequest = {
  language: string;
  code: string;
  path: string;
};

export type EditorRunResult = {
  ok: boolean;
  exitCode: number;
  output: string;
};

export type EditorPreviewSaveRequest = {
  path: string;
  content: string;
  projectId?: string;
};

export type TerminalReconnectResult = {
  connected: boolean;
  message: string;
};

export type AssistantPreviewRequest = {
  prompt: string;
  activePath?: string;
  projectName?: string;
  code?: string;
};

export type AssistantPreviewReply = {
  text: string;
  code?: string;
};

export type InlineCompletionRequest = {
  path?: string;
  language?: string;
  prefix: string;
  suffix?: string;
};

function normalizePreviewPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

async function resolvePreviewProjectId(projectId?: string): Promise<string | null> {
  const db = await getDB();
  if (projectId) {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
    if (project) return project.id;
  }

  const [project] = await db.select().from(schema.projects).limit(1);
  return project?.id ?? null;
}

export async function createEditorFile(input: { projectId?: string; path: string; content?: string; language?: string }) {
  const db = await getDB();
  const services = await getServices();
  const targetProjectId = await resolvePreviewProjectId(input.projectId);
  if (!targetProjectId) {
    throw new Error("No local editor project exists yet.");
  }

  const normalizedPath = normalizePreviewPath(input.path);
  const existing = await db.select().from(schema.files)
    .where(eq(schema.files.projectId, targetProjectId))
    .then((rows) => rows.find((row) => row.path === normalizedPath));

  if (existing) {
    return {
      id: existing.id,
      path: existing.path,
      version: existing.version,
      created: false,
    };
  }

  const [created] = await db.insert(schema.files).values({
    id: crypto.randomUUID(),
    projectId: targetProjectId,
    path: normalizedPath,
    content: input.content ?? "",
    language: input.language ?? "plaintext",
    sizeBytes: new TextEncoder().encode(input.content ?? "").byteLength,
    version: 1,
    updatedAt: new Date(),
  }).returning();

  await services.storage.writeFile(`projects/${targetProjectId}/${normalizedPath}`, input.content ?? "");

  return {
    id: created!.id,
    path: created!.path,
    version: created!.version,
    created: true,
  };
}

export async function deleteEditorFile(projectId: string, path: string) {
  const db = await getDB();
  const services = await getServices();
  const normalizedPath = normalizePreviewPath(path);
  const existing = await db.select().from(schema.files)
    .where(eq(schema.files.projectId, projectId))
    .then((rows) => rows.find((row) => row.path === normalizedPath));

  if (!existing) {
    return { deleted: false };
  }

  await db.delete(schema.files).where(eq(schema.files.id, existing.id));
  try {
    await services.storage.deleteFile(`projects/${projectId}/${normalizedPath}`);
  } catch {
    // Ignore missing OPFS entries; database state is authoritative.
  }

  return { deleted: true };
}

export async function loadEditorProject(projectId?: string) {
  const services = await getServices();
  const db = await getDB();

  const targetProjectId = await resolvePreviewProjectId(projectId);
  if (!targetProjectId) {
    return { projectId: null, name: "Local workspace", files: [] as Array<{ id: string; name: string; path: string; content: string; language: string; version: number }> };
  }

  const projectRow = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, targetProjectId))
    .limit(1);

  const fileRows = await db
    .select()
    .from(schema.files)
    .where(eq(schema.files.projectId, targetProjectId));

  return {
    projectId: targetProjectId,
    name: projectRow[0]?.name ?? "Local workspace",
    files: await Promise.all(fileRows.map(async (file) => {
      let content = file.content;
      try {
        content = await services.storage.readFile(`projects/${file.projectId}/${file.path}`);
      } catch {
        // Fall back to the database row when the OPFS record is not present yet.
      }

      return {
        id: file.id,
        name: file.path.split("/").pop() ?? file.path,
        path: file.path,
        content,
        language: file.language ?? "plaintext",
        version: file.version,
      };
    })),
  };
}

export async function runEditorPreview(request: EditorRunRequest): Promise<EditorRunResult> {
  const { language, code, path } = request;

  if (language === "javascript" || language === "typescript") {
    try {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map((value) => String(value)).join(" "));
      };

      try {
        const fn = new Function(code);
        fn();
      } finally {
        console.log = originalLog;
      }

      return {
        ok: true,
        exitCode: 0,
        output: logs.length ? logs.join("\n") : "(no output)",
      };
    } catch (error: unknown) {
      return {
        ok: false,
        exitCode: 1,
        output: `Error: ${error instanceof Error ? error.message : "Unknown browser execution error"}`,
      };
    }
  }

  return {
    ok: false,
    exitCode: 0,
    output: `Browser preview for ${language} is unavailable in local mode. (${path})`,
  };
}

export async function saveEditorPreview(
  request: EditorPreviewSaveRequest,
): Promise<{
  saved: boolean;
  error?: string;
  version?: number;
  revisionId?: string;
}> {
  const { content, projectId } = request;
  const path = normalizePreviewPath(request.path);

  try {
    if (!path || path.split("/").some((segment) => segment === "." || segment === "..")) {
      throw new Error("File path must contain valid path segments.");
    }

    const services = await getServices();
    const db = await getDB();
    let targetProjectId: string | null;
    if (projectId) {
      const [project] = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.id, projectId))
        .limit(1);
      if (!project) throw new Error("The editor project could not be found.");
      targetProjectId = project.id;
    } else {
      targetProjectId = await resolvePreviewProjectId();
    }

    if (!targetProjectId) {
      await services.storage.writeFile(`local/${path}`, content);
      return { saved: true };
    }

    const [file] = await db
      .select()
      .from(schema.files)
      .where(eq(schema.files.projectId, targetProjectId))
      .then((rows) => rows.filter((row) => row.path === path));

    if (!file) {
      const storagePath = `projects/${targetProjectId}/${path}`;
      let previousContent: string | undefined;
      try {
        previousContent = await services.storage.readFile(storagePath);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "NotFoundError")) {
          throw error;
        }
      }
      await services.storage.writeFile(storagePath, content);
      try {
        const [inserted] = await db.transaction((tx) =>
          tx.insert(schema.files).values({
            id: crypto.randomUUID(),
            projectId: targetProjectId,
            path,
            content,
            language: path.split(".").pop() ?? "plaintext",
            sizeBytes: new TextEncoder().encode(content).byteLength,
            version: 1,
            updatedAt: new Date(),
          }).returning(),
        );
        if (!inserted) throw new Error("File save did not create a database record.");
        return { saved: true, version: inserted.version };
      } catch (error) {
        try {
          if (previousContent === undefined) {
            await services.storage.deleteFile(storagePath);
          } else {
            await services.storage.writeFile(storagePath, previousContent);
          }
        } catch (restoreError) {
          throw new AggregateError(
            [error, restoreError],
            "File creation failed and its stored content could not be restored.",
          );
        }
        throw error;
      }
    }

    const storagePath = `projects/${file.projectId}/${path}`;
    let previousContent = file.content;
    try {
      previousContent = await services.storage.readFile(storagePath);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) {
        throw error;
      }
    }
    await services.storage.writeFile(storagePath, content);
    try {
      const nextVersion = (file.version ?? 1) + 1;
      const [updated, revision] = await db.transaction(async (tx) => {
        const [updatedFile] = await tx.update(schema.files)
          .set({
            content,
            version: nextVersion,
            sizeBytes: new TextEncoder().encode(content).byteLength,
            lastEditedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            eq(schema.files.id, file.id),
            eq(schema.files.version, file.version),
          ))
          .returning();
        if (!updatedFile) throw new Error("File changed before it could be saved.");

        const [newRevision] = await tx.insert(schema.fileRevisions).values({
          id: crypto.randomUUID(),
          fileId: file.id,
          version: file.version,
          content: file.content,
          diffPatch: "Autosave",
          appliedFromAI: false,
        }).returning();
        if (!newRevision) throw new Error("File revision was not recorded.");
        return [updatedFile, newRevision] as const;
      });
      return {
        saved: true,
        version: updated.version,
        revisionId: revision.id,
      };
    } catch (error) {
      try {
        await services.storage.writeFile(storagePath, previousContent);
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          "File save failed and its previous stored content could not be restored.",
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Save failed";
    console.error("[Save] Failed:", error);
    return { saved: false, error: message };
  }
}

export async function reconnectTerminalPreview(): Promise<TerminalReconnectResult> {
  return {
    connected: false,
    message: "Shell service is not connected.",
  };
}

export async function sendAssistantPreview(
  request: AssistantPreviewRequest,
): Promise<AssistantPreviewReply> {
  const token = sessionStorage.getItem("dp_access_token") ?? "dev-bypass";

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: request.prompt }],
        context: {
          fileName: request.activePath,
          language: request.activePath?.split(".").pop(),
          projectName: request.projectName,
          selectedCode: request.code,
        },
      }),
    });

    if (!response.ok) {
      return {
        text: "AI service is not currently configured. Add the environment variables required by the Edge AI runtime.",
      };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { text: "Could not read AI response stream." };
    }

    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as { type?: string; delta?: { text?: string } };
          if (event.type === "content_block_delta") {
            fullText += event.delta?.text ?? "";
          }
        } catch {
          // Ignore malformed stream data and keep the preview resilient.
        }
      }
    }

    const codeMatch = fullText.match(/```[\w]*\n([\s\S]+?)```/);
    return {
      text: fullText,
      code: codeMatch?.[1],
    };
  } catch {
    return {
      text: "Unable to reach the local AI preview runtime.",
    };
  }
}

export async function getAIInlineCompletion(
  request: InlineCompletionRequest,
): Promise<{ text: string; stopReason?: string }> {
  const prefix = request.prefix.trim();
  if (!prefix) {
    return { text: "" };
  }

  const suggestion = prefix
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");

  return {
    text: `${suggestion}${request.suffix ? `\n${request.suffix}` : ""}`,
    stopReason: "stop",
  };
}
