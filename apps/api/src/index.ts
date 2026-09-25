import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { extname } from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createClient } from "redis";
import * as Minio from "minio";
import jwt, { type SignOptions } from "jsonwebtoken";
import pinoHttp from "pino-http";
import { z } from "zod";
import { db } from "@devpulse/database";

const app: express.Express = express();
const port = Number(process.env.PORT ?? 4000);
const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  socket: { reconnectStrategy: false },
});
redis.on("error", (error) => console.error("Redis error", error));
const redisConnection =
  process.env.NODE_ENV === "test"
    ? Promise.resolve()
    : redis.connect().catch(() => undefined);
const objectStoreEndpoint = new URL(
  process.env.AWS_S3_ENDPOINT ?? "http://localhost:9000",
);
const minio = new Minio.Client({
  endPoint: objectStoreEndpoint.hostname,
  port: Number(
    objectStoreEndpoint.port ||
      (objectStoreEndpoint.protocol === "https:" ? 443 : 80),
  ),
  useSSL: objectStoreEndpoint.protocol === "https:",
  accessKey:
    process.env.AWS_ACCESS_KEY_ID ??
    process.env.S3_MINIO_ROOT_USER ??
    "devpulse",
  secretKey:
    process.env.AWS_SECRET_ACCESS_KEY ??
    process.env.S3_MINIO_ROOT_PASSWORD ??
    "devpulse-local-password",
});
const objectBucket = process.env.AWS_S3_BUCKET ?? "devpulse-local";
const jwtSecret = process.env.JWT_SECRET ?? "devpulse-development-secret";
const filePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine(
    (value) =>
      !value.includes("..") && !value.startsWith("/") && !value.includes("\\"),
    "path must be project-relative",
  );
const fileLanguageSchema = z.string().trim().min(1).max(32).optional();
const fileContentSchema = z.string().max(2_000_000);

app.use(helmet());
app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(pinoHttp());
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "api" }),
);
app.get("/ready", (_request, response) => response.json({ status: "ready" }));

function sessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret, {
    expiresIn: (process.env.JWT_EXPIRES_IN ??
      "15m") as SignOptions["expiresIn"],
  });
}

function setSessionCookie(response: express.Response, token: string): void {
  response.setHeader(
    "Set-Cookie",
    `devpulse_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=900`,
  );
}

app.post("/v1/auth/logout", (_request, response) => {
  response.setHeader(
    "Set-Cookie",
    "devpulse_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
  return response.status(204).send();
});

app.get("/v1/me", async (request, response, next) => {
  try {
    const cookie = request.headers.cookie?.match(
      /(?:^|; )devpulse_session=([^;]+)/,
    )?.[1];
    if (!cookie)
      return response.status(401).json({ error: "Authentication required" });
    const payload = jwt.verify(cookie, jwtSecret) as { sub: string };
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { workspace: { include: { projects: true } } },
        },
      },
    });
    if (!user)
      return response.status(401).json({ error: "Session user not found" });
    return response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaces: user.memberships.map(
        (membership: (typeof user.memberships)[number]) => membership.workspace,
      ),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/v1/auth/magic-link", async (request, response) => {
  const parsed = z
    .object({ email: z.string().email() })
    .safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  await redisConnection;
  const token = randomBytes(32).toString("hex");
  if (redis.isReady)
    await redis.set(
      `magic:${createHash("sha256").update(token).digest("hex")}`,
      parsed.data.email,
      { EX: 600 },
    );
  return response.json({
    message: "Magic link requested",
    ...(process.env.NODE_ENV === "development"
      ? { verificationToken: token }
      : {}),
  });
});

app.post("/v1/auth/magic-link/verify", async (request, response, next) => {
  const parsed = z
    .object({ token: z.string().min(32) })
    .safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    await redisConnection;
    const key = `magic:${createHash("sha256").update(parsed.data.token).digest("hex")}`;
    const email = redis.isReady ? await redis.get(key) : null;
    if (!email)
      return response
        .status(401)
        .json({ error: "Magic link is invalid or expired" });
    await redis.del(key);
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0] },
    });
    const token = sessionToken(user.id);
    setSessionCookie(response, token);
    return response.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/v1/auth/:provider/start", async (request, response, next) => {
  const provider = request.params.provider;
  const callback = `${process.env.API_URL ?? `http://localhost:${port}`}/v1/auth/${provider}/callback`;
  if (provider === "github" && process.env.GITHUB_CLIENT_ID)
    return response.redirect(
      `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(process.env.GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(callback)}&scope=user:email`,
    );
  if (provider === "gitlab" && process.env.GITLAB_CLIENT_ID)
    return response.redirect(
      `https://gitlab.com/oauth/authorize?client_id=${encodeURIComponent(process.env.GITLAB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(callback)}&response_type=code&scope=read_user`,
    );
  if (provider === "sso" && process.env.SAML_ENTRYPOINT)
    return response.redirect(process.env.SAML_ENTRYPOINT);

  // ── DEV BYPASS ────────────────────────────────────────────────────────────
  // In development mode, when no OAuth credentials are configured, create a
  // mock session so you can test the full app flow without a real OAuth app.
  if (process.env.NODE_ENV === "development") {
    try {
      const devEmail = `dev-${provider}@localhost.dev`;
      const devName = `Dev User (${provider})`;
      const user = await db.user.upsert({
        where: { email: devEmail },
        update: { name: devName },
        create: { email: devEmail, name: devName },
      });
      const token = sessionToken(user.id);
      setSessionCookie(response, token);
      console.log(`[DEV BYPASS] Auto-logged in as ${devEmail} via ${provider}`);
      return response.redirect(
        `${process.env.APP_URL ?? "http://localhost:3000"}?authenticated=1`,
      );
    } catch (error) {
      return next(error);
    }
  }
  // ── END DEV BYPASS ────────────────────────────────────────────────────────

  const error = encodeURIComponent(
    `${provider} OAuth is not configured. Add provider credentials to .env.`,
  );
  return response.redirect(
    `${process.env.APP_URL ?? "http://localhost:3000"}?auth_error=${error}`,
  );
});

app.get("/v1/auth/:provider/callback", async (request, response, next) => {
  const provider = request.params.provider;
  const code = typeof request.query.code === "string" ? request.query.code : "";
  if (!code)
    return response.status(400).json({ error: "OAuth code is required" });
  try {
    let email = "";
    let name = "";
    let avatarUrl: string | undefined;
    if (provider === "github") {
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
          }),
        },
      );
      const access = (await tokenResponse.json()) as { access_token?: string };
      const profile = (await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access.access_token}`,
          Accept: "application/vnd.github+json",
        },
      }).then((result) => result.json())) as {
        email?: string;
        login?: string;
        name?: string;
        avatar_url?: string;
      };
      email = profile.email || `${profile.login}@users.noreply.github.com`;
      name = profile.name || profile.login || "Devpulse User";
      avatarUrl = profile.avatar_url;
    } else if (provider === "gitlab") {
      const tokenResponse = await fetch("https://gitlab.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.GITLAB_CLIENT_ID,
          client_secret: process.env.GITLAB_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.API_URL ?? `http://localhost:${port}`}/v1/auth/gitlab/callback`,
        }),
      });
      const access = (await tokenResponse.json()) as { access_token?: string };
      const profile = (await fetch("https://gitlab.com/api/v4/user", {
        headers: { Authorization: `Bearer ${access.access_token}` },
      }).then((result) => result.json())) as {
        email?: string;
        username?: string;
        name?: string;
        avatar_url?: string;
      };
      email = profile.email || `${profile.username}@gitlab.local`;
      name = profile.name || profile.username || "Devpulse User";
      avatarUrl = profile.avatar_url;
    } else {
      return response.status(400).json({ error: "Unsupported OAuth provider" });
    }
    const user = await db.user.upsert({
      where: { email },
      update: { name, avatarUrl },
      create: { email, name, avatarUrl },
    });
    setSessionCookie(response, sessionToken(user.id));
    return response.redirect(
      `${process.env.APP_URL ?? "http://localhost:3000"}?authenticated=1`,
    );
  } catch (error) {
    return next(error);
  }
});

function sendValidationError(
  response: express.Response,
  error: z.ZodError,
): void {
  response
    .status(400)
    .json({ error: "Invalid request", details: error.flatten() });
}

async function findProjectFile(fileId: string) {
  return db.file.findUnique({
    where: { id: fileId },
    include: { project: true, lastEditedBy: { select: { id: true, name: true } } },
  });
}

type AuthenticatedRequest = express.Request & { userId?: string; fileRecord?: Awaited<ReturnType<typeof findProjectFile>>; aiUsage?: { id: string; requestCount: number; tokenCount: number; limit: number; plan: string } };

function getRequestUserId(request: express.Request): string | null {
  const cookie = request.headers.cookie?.match(/(?:^|; )devpulse_session=([^;]+)/)?.[1];
  const authorization = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = cookie ?? authorization;
  if (!token) return null;
  try {
    return String((jwt.verify(token, jwtSecret) as { sub: string }).sub);
  } catch {
    return null;
  }
}

function requireUser(request: express.Request, response: express.Response): string | null {
  const userId = getRequestUserId(request);
  if (!userId) {
    response.status(401).json({ error: "Authentication required" });
    return null;
  }
  (request as AuthenticatedRequest).userId = userId;
  return userId;
}

async function checkFileAccess(request: express.Request, response: express.Response, next: express.NextFunction): Promise<void> {
  const userId = requireUser(request, response);
  if (!userId) return;
  const file = await findProjectFile(String(request.params.fileId));
  if (!file) {
    response.status(404).json({ error: "File not found" });
    return;
  }
  const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: file.project.workspaceId, userId } } });
  if (!membership) {
    response.status(403).json({ error: "You do not have access to this file" });
    return;
  }
  (request as AuthenticatedRequest).fileRecord = file;
  next();
}

function languageFromPath(filePath: string): string | undefined {
  const languages: Record<string, string> = { ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript", ".py": "python", ".rs": "rust", ".go": "go", ".json": "json", ".css": "css", ".html": "html", ".md": "markdown" };
  return languages[extname(filePath).toLowerCase()];
}

function fileSummary(file: { id: string; path: string; language: string | null; sizeBytes: number | null; updatedAt: Date; version: number; content?: string }) {
  return { id: file.id, name: file.path.split("/").pop() ?? file.path, path: file.path, language: file.language, sizeBytes: file.sizeBytes, version: file.version, modified: file.updatedAt };
}

function buildFileTree(files: Array<{ id: string; path: string; language: string | null; sizeBytes: number | null; updatedAt: Date; version: number }>) {
  const root: Array<Record<string, unknown>> = [];
  for (const file of files) {
    let current = root;
    const parts = file.path.split("/").filter(Boolean);
    parts.forEach((name, index) => {
      const pathValue = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      let node = current.find((item) => item.path === pathValue);
      if (!node) {
        node = isFile
          ? { ...fileSummary(file), type: "file", name, path: pathValue }
          : { id: `folder:${pathValue}`, name, path: pathValue, type: "folder", children: [] };
        current.push(node);
      }
      if (!isFile) current = node.children as Array<Record<string, unknown>>;
    });
  }
  return root;
}

function lineCount(content: string): number { return content.length === 0 ? 0 : content.split("\n").length; }

async function saveFileRevision(fileId: string, userId: string, content: string, expectedVersion: number, language?: string, appliedFromAI = false, aiMessageId?: string, path?: string, note?: string) {
  return db.$transaction(async (transaction) => {
    const updated = await transaction.file.updateMany({
      where: { id: fileId, version: expectedVersion },
      data: { content, ...(language ? { language } : {}), ...(path ? { path } : {}), sizeBytes: Buffer.byteLength(content, "utf8"), lastEditedById: userId, lastEditedAt: new Date(), version: { increment: 1 } },
    });
    if (updated.count !== 1) return null;
    const file = await transaction.file.findUniqueOrThrow({ where: { id: fileId } });
    const revision = await transaction.fileRevision.create({ data: { fileId, version: file.version, content, authorId: userId, appliedFromAI, aiMessageId, lineCount: lineCount(content), charCount: content.length, ...(note ? { diffPatch: note } : {}) } });
    return { file, revision };
  });
}

app.get("/v1/projects", async (_request, response, next) => {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        defaultBranch: true,
        workspaceId: true,
        updatedAt: true,
      },
    });
    return response.json({ projects });
  } catch (error) {
    return next(error);
  }
});

app.post("/v1/projects", async (request, response, next) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      workspaceId: z.string().cuid().optional(),
      defaultBranch: z.string().trim().min(1).max(120).default("main"),
    })
    .safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const workspace = parsed.data.workspaceId
      ? await db.workspace.findUnique({
          where: { id: parsed.data.workspaceId },
        })
      : await db.workspace.findFirst({ orderBy: { createdAt: "asc" } });
    if (!workspace)
      return response.status(404).json({ error: "Workspace not found" });
    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        defaultBranch: parsed.data.defaultBranch,
        workspaceId: workspace.id,
      },
    });
    return response.status(201).json(project);
  } catch (error) {
    return next(error);
  }
});

app.get("/v1/projects/:projectId/files", async (request, response, next) => {
  try {
    const project = await db.project.findUnique({
      where: { id: request.params.projectId },
    });
    if (!project)
      return response.status(404).json({ error: "Project not found" });
    const files = await db.file.findMany({
      where: { projectId: project.id },
      orderBy: { path: "asc" },
      select: {
        id: true,
        path: true,
        language: true,
        version: true,
        updatedAt: true,
      },
    });
    return response.json({ project, files });
  } catch (error) {
    return next(error);
  }
});

app.get(
  "/v1/projects/:projectId/files/:fileId",
  async (request, response, next) => {
    try {
      const file = await findProjectFile(request.params.fileId);
      if (!file || file.projectId !== request.params.projectId)
        return response.status(404).json({ error: "File not found" });
      return response.json(file);
    } catch (error) {
      return next(error);
    }
  },
);

app.post("/v1/projects/:projectId/files", async (request, response, next) => {
  const parsed = z
    .object({
      path: filePathSchema,
      content: fileContentSchema.default(""),
      language: fileLanguageSchema,
    })
    .safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const project = await db.project.findUnique({
      where: { id: request.params.projectId },
    });
    if (!project)
      return response.status(404).json({ error: "Project not found" });
    const file = await db.file.create({
      data: {
        projectId: project.id,
        path: parsed.data.path,
        content: parsed.data.content,
        language: parsed.data.language,
        revisions: { create: { version: 1, content: parsed.data.content } },
      },
    });
    return response.status(201).json(file);
  } catch (error) {
    return next(error);
  }
});

app.post(
  "/v1/projects/:projectId/artifacts",
  async (request, response, next) => {
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(255),
        contentBase64: z.string().min(1).max(30_000_000),
        contentType: z
          .string()
          .trim()
          .max(120)
          .default("application/octet-stream"),
      })
      .safeParse(request.body);
    if (!parsed.success) return sendValidationError(response, parsed.error);
    try {
      const project = await db.project.findUnique({
        where: { id: request.params.projectId },
      });
      if (!project)
        return response.status(404).json({ error: "Project not found" });
      const safeName = parsed.data.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectKey = `projects/${project.id}/${Date.now()}-${safeName}`;
      const content = Buffer.from(parsed.data.contentBase64, "base64");
      const exists = await minio.bucketExists(objectBucket);
      if (!exists)
        await minio.makeBucket(
          objectBucket,
          process.env.AWS_REGION ?? "us-east-1",
        );
      await minio.putObject(objectBucket, objectKey, content, content.length, {
        "Content-Type": parsed.data.contentType,
      });
      return response
        .status(201)
        .json({ bucket: objectBucket, key: objectKey, size: content.length });
    } catch (error) {
      return next(error);
    }
  },
);

const updateFileSchema = z
  .object({
    path: filePathSchema.optional(),
    content: z.string().max(5_000_000).optional(),
    language: fileLanguageSchema,
    expectedVersion: z.number().int().positive(),
    forceOverride: z.boolean().optional().default(false),
  })
  .refine((value) => value.path !== undefined || value.content !== undefined || value.language !== undefined, "at least one field is required");

app.patch("/v1/files/:fileId", checkFileAccess, async (request, response, next) => {
  const parsed = updateFileSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const authenticated = request as AuthenticatedRequest;
    const existing = authenticated.fileRecord;
    if (!existing)
      return response.status(404).json({ error: "File not found" });
    const nextContent = parsed.data.content ?? existing.content;
    const contentChanged =
      parsed.data.content !== undefined &&
      parsed.data.content !== existing.content;
    const expectedVersion = parsed.data.forceOverride ? existing.version : parsed.data.expectedVersion;
    const nextPath = parsed.data.path ?? existing.path;
    const nextLanguage = parsed.data.language ?? existing.language ?? languageFromPath(nextPath);
    const metadataChanged = nextPath !== existing.path || nextLanguage !== existing.language;
    if (!contentChanged && !metadataChanged) return response.json({ ...existing, file: existing, revisionId: null, version: existing.version });
    if (!contentChanged) {
      const updated = await db.file.updateMany({ where: { id: existing.id, version: expectedVersion }, data: { path: nextPath, language: nextLanguage } });
      if (!updated.count) {
        const current = await db.file.findUnique({ where: { id: existing.id }, select: { version: true } });
        return response.status(409).json({ error: "CONFLICT", message: "This file was modified by someone else.", currentVersion: current?.version ?? existing.version, yourVersion: parsed.data.expectedVersion, lastEditedBy: existing.lastEditedBy?.name ?? null, lastEditedAt: existing.lastEditedAt ?? null });
      }
      const file = await db.file.findUniqueOrThrow({ where: { id: existing.id } });
      return response.json({ ...file, file, revisionId: null, version: file.version });
    }
    const saved = await saveFileRevision(existing.id, authenticated.userId!, nextContent, expectedVersion, nextLanguage, false, undefined, nextPath);
    if (!saved) {
      const current = await db.file.findUnique({ where: { id: existing.id }, select: { version: true } });
      return response.status(409).json({ error: "CONFLICT", message: "This file was modified by someone else.", currentVersion: current?.version ?? existing.version, yourVersion: parsed.data.expectedVersion, lastEditedBy: existing.lastEditedBy?.name ?? null, lastEditedAt: existing.lastEditedAt ?? null });
    }
    return response.json({ ...saved.file, file: saved.file, revisionId: saved.revision.id, version: saved.file.version });
  } catch (error) {
    return next(error);
  }
});

app.get("/v1/files/:fileId/revisions", checkFileAccess, async (request, response, next) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const fileId = String(request.params.fileId);
    const cursor = typeof request.query.cursor === "string" ? request.query.cursor : undefined;
    const [total, revisions] = await Promise.all([
      db.fileRevision.count({ where: { fileId } }),
      db.fileRevision.findMany({
        where: { fileId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
    ]);
    const hasNext = revisions.length > limit;
    const page = revisions.slice(0, limit);
    const authors = await db.user.findMany({ where: { id: { in: page.flatMap((revision) => revision.authorId ? [revision.authorId] : []) } }, select: { id: true, name: true, avatarUrl: true } });
    const authorMap = new Map(authors.map((author) => [author.id, author]));
    return response.json({
      revisions: page.map((revision) => ({
        id: revision.id,
        version: revision.version,
        createdAt: revision.createdAt,
        lineCount: revision.lineCount,
        charCount: revision.charCount,
        appliedFromAI: revision.appliedFromAI,
        author: revision.authorId ? authorMap.get(revision.authorId) ?? null : null,
      })),
      nextCursor: hasNext ? page[page.length - 1]?.id ?? null : null,
      total,
    });
  } catch (error) { return next(error); }
});

app.get("/v1/files/:fileId/revisions/:revisionId", checkFileAccess, async (request, response, next) => {
  try {
    const revision = await db.fileRevision.findFirst({
      where: { id: String(request.params.revisionId), fileId: String(request.params.fileId) },
    });
    if (!revision) return response.status(404).json({ error: "Revision not found" });
    const author = revision.authorId ? await db.user.findUnique({ where: { id: revision.authorId }, select: { id: true, name: true, avatarUrl: true } }) : null;
    return response.json({ revision: { id: revision.id, version: revision.version, content: revision.content, lineCount: revision.lineCount, charCount: revision.charCount, appliedFromAI: revision.appliedFromAI, createdAt: revision.createdAt, author } });
  } catch (error) { return next(error); }
});

const restoreSchema = z.object({ revisionId: z.string().cuid(), expectedVersion: z.number().int().positive() });
app.post("/v1/files/:fileId/restore", checkFileAccess, async (request, response, next) => {
  const parsed = restoreSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const authenticated = request as AuthenticatedRequest;
    const revision = await db.fileRevision.findFirst({ where: { id: parsed.data.revisionId, fileId: String(request.params.fileId) } });
    if (!revision) return response.status(404).json({ error: "Revision not found" });
    const file = authenticated.fileRecord!;
    const saved = await saveFileRevision(file.id, authenticated.userId!, revision.content, parsed.data.expectedVersion, file.language ?? languageFromPath(file.path), false, undefined, undefined, `Restored from v${revision.version}`);
    if (!saved) return response.status(409).json({ error: "File was modified elsewhere", currentVersion: (await db.file.findUniqueOrThrow({ where: { id: file.id }, select: { version: true } })).version });
    return response.json({ file: saved.file, newRevisionId: saved.revision.id, revisionId: saved.revision.id, version: saved.file.version });
  } catch (error) { return next(error); }
});

app.get("/v1/projects/:projectId/tree", async (request, response, next) => {
  try {
    const project = await db.project.findUnique({ where: { id: request.params.projectId } });
    if (!project) return response.status(404).json({ error: "Project not found" });
    const files = await db.file.findMany({ where: { projectId: project.id }, orderBy: { path: "asc" }, select: { id: true, path: true, language: true, sizeBytes: true, updatedAt: true, version: true } });
    return response.json({ tree: buildFileTree(files) });
  } catch (error) { return next(error); }
});

app.delete("/v1/files/:fileId", checkFileAccess, async (request, response, next) => {
  try {
    const file = await findProjectFile(String(request.params.fileId));
    if (!file) return response.status(404).json({ error: "File not found" });
    await db.file.delete({ where: { id: file.id } });
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

const aiMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(200_000) });
const aiChatSchema = z.object({
  messages: z.array(aiMessageSchema).min(1).max(100),
  model: z.string().trim().min(1).max(120).default("claude-sonnet-4-6"),
  command: z.enum(["/fix", "/explain", "/test", "/comment", "/refactor", "/optimize"]).optional(),
  context: z.object({ fileName: z.string().max(512).optional(), language: z.string().max(40).optional(), selectedCode: z.string().max(200_000).optional(), surroundingCode: z.string().max(200_000).optional(), projectName: z.string().max(120).optional(), recentErrors: z.array(z.string().max(4_000)).max(20).optional() }).optional(),
  fileId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  conversationId: z.string().cuid().optional(),
});
const AI_APPLY_LIMIT_BYTES = 512_000;
const aiApplySchema = z.object({
  fileId: z.string().cuid(),
  code: z.string().max(5_000_000),
  language: z.string().trim().min(1).max(64),
  range: z.object({ startLine: z.number().int().positive(), endLine: z.number().int().positive() }).refine((value) => value.endLine >= value.startLine, "endLine must be greater than or equal to startLine").optional(),
  aiMessageId: z.string().cuid().optional(),
  expectedVersion: z.number().int().positive(),
  skipCheck: z.boolean().optional().default(false),
});

type AiApplyRequest = z.infer<typeof aiApplySchema>;
type AiApplySafetyError = { status: 400 | 422; error: string; message: string; openBraces?: number; closeBraces?: number };

function validateAIApplyContent(code: string, language: string, skipCheck: boolean): AiApplySafetyError | null {
  if (skipCheck) return null;
  if (!code.trim()) return { status: 400, error: "EMPTY_CONTENT", message: "AI returned empty code — not applied" };
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces > 0 && openBraces - closeBraces > 2) return { status: 422, error: "TRUNCATED_CONTENT", message: "AI response appears incomplete — missing closing braces", openBraces, closeBraces };
  if (language.toLowerCase() === "json") {
    try { JSON.parse(code); } catch { return { status: 422, error: "INVALID_JSON", message: "AI returned invalid JSON" }; }
  }
  return null;
}

async function getOrCreateAIUsage(userId: string, projectId?: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const workspaceId = projectId
    ? (await db.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } }))?.workspaceId
    : (await db.workspaceMember.findFirst({ where: { userId }, orderBy: { joinedAt: "asc" }, select: { workspaceId: true } }))?.workspaceId;
  const usage = await db.aIUsage.upsert({ where: { userId_month_year: { userId, month, year } }, create: { userId, month, year, workspaceId }, update: workspaceId ? { workspaceId } : {} });
  const plan = workspaceId ? (await db.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } }))?.plan ?? "FREE" : "FREE";
  return { ...usage, plan: plan.toLowerCase(), limit: plan === "FREE" ? 100 : 10_000 };
}

async function userCanAccessProject(userId: string, projectId: string): Promise<boolean> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
  if (!project) return false;
  return Boolean(await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } }, select: { userId: true } }));
}

async function checkAIUsage(request: express.Request, response: express.Response, next: express.NextFunction): Promise<void> {
  const userId = requireUser(request, response);
  if (!userId) return;
  const parsedProjectId = typeof request.body?.projectId === "string" ? request.body.projectId : undefined;
  const usage = await getOrCreateAIUsage(userId, parsedProjectId);
  if (usage.requestCount >= usage.limit) {
    response.status(429).json({ error: "Monthly limit reached", used: usage.requestCount, limit: usage.limit });
    return;
  }
  (request as AuthenticatedRequest).aiUsage = usage;
  next();
}

function setSSEHeaders(response: express.Response): void {
  response.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  response.flushHeaders();
}

app.post("/v1/ai/chat", checkAIUsage, async (request, response, next) => {
  const parsed = aiChatSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  const authenticated = request as AuthenticatedRequest;
  let conversationId: string | undefined;
  try {
    if (parsed.data.fileId) {
      const file = await db.file.findUnique({ where: { id: parsed.data.fileId }, select: { projectId: true } });
      if (!file) return response.status(404).json({ error: "File not found" });
      if (!(await userCanAccessProject(authenticated.userId!, file.projectId))) return response.status(403).json({ error: "You do not have access to this file" });
    }
    if (parsed.data.projectId && !(await userCanAccessProject(authenticated.userId!, parsed.data.projectId))) return response.status(403).json({ error: "You do not have access to this project" });
    if (parsed.data.conversationId) {
      const existingConversation = await findOwnedConversation(authenticated.userId!, parsed.data.conversationId);
      if (!existingConversation) return response.status(404).json({ error: "Conversation not found" });
      conversationId = existingConversation.id;
    } else if (parsed.data.projectId || parsed.data.fileId) {
      const conversation = await db.aIConversation.create({ data: { userId: authenticated.userId!, projectId: parsed.data.projectId, fileId: parsed.data.fileId, model: parsed.data.model, title: parsed.data.messages.find((message) => message.role === "user")?.content.slice(0, 80) ?? "New conversation" } });
      conversationId = conversation.id;
      const lastUserMessage = [...parsed.data.messages].reverse().find((message) => message.role === "user");
      if (lastUserMessage) await db.aIMessage.create({ data: { conversationId, role: "USER", content: lastUserMessage.content, command: parsed.data.command } });
    }
    const upstream = await fetch(`${process.env.AI_URL ?? "http://localhost:4002"}/v1/chat`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify(parsed.data) });
    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      return response.status(upstream.status || 502).json({ error: "AI service request failed", details });
    }
    setSSEHeaders(response);
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    let tokensUsed: number | undefined;
    let upstreamSentDone = false;
    const writeEvent = (event: string): void => {
      if (!event.startsWith("data: ")) return;
      try {
        const value = JSON.parse(event.slice(6)) as { type?: string; content?: string; tokensUsed?: number; message?: string };
        if (value.type === "chunk") assistantContent += value.content ?? "";
        if (value.type === "done") { tokensUsed = value.tokensUsed; upstreamSentDone = true; }
        response.write(`${event}\n\n`);
      } catch { response.write(`data: ${JSON.stringify({ type: "error", message: "Invalid AI stream response" })}\n\n`); }
    };
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      events.forEach(writeEvent);
      if (chunk.done) break;
    }
    if (buffer.trim()) writeEvent(buffer.trim());
    await db.aIUsage.update({ where: { id: authenticated.aiUsage!.id }, data: { requestCount: { increment: 1 }, tokenCount: { increment: tokensUsed ?? 0 } } });
    if (conversationId && assistantContent) {
      await db.aIMessage.create({ data: { conversationId, role: "ASSISTANT", content: assistantContent, tokensUsed } });
      await db.aIConversation.update({ where: { id: conversationId }, data: { messageCount: { increment: 2 } } });
    }
    if (!response.writableEnded && !upstreamSentDone) response.write(`data: ${JSON.stringify({ type: "done", tokensUsed: tokensUsed ?? 0 })}\n\n`);
    if (!response.writableEnded) response.write("data: [DONE]\n\n");
    response.end();
  } catch (error) {
    if (response.headersSent) { response.write(`data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "AI request failed" })}\n\n`); response.end(); return; }
    next(error);
  }
});

app.post("/v1/ai/apply", async (request, response, next) => {
  const parsed = aiApplySchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const userId = requireUser(request, response);
    if (!userId) return;
    const sizeBytes = Buffer.byteLength(parsed.data.code, "utf8");
    if (sizeBytes > AI_APPLY_LIMIT_BYTES) return response.status(413).json({ error: "CONTENT_TOO_LARGE", message: "AI generated content exceeds 500KB limit", sizeBytes, limitBytes: AI_APPLY_LIMIT_BYTES });
    const file = await db.file.findUnique({ where: { id: parsed.data.fileId }, include: { project: { include: { workspace: true } } } });
    if (!file) return response.status(404).json({ error: "FILE_NOT_FOUND", message: "File not found" });
    const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: file.project.workspace.id, userId } }, select: { userId: true } });
    if (!membership) return response.status(403).json({ error: "FORBIDDEN", message: "You do not have access to this file" });
    if (file.version !== parsed.data.expectedVersion) return response.status(409).json({ error: "VERSION_CONFLICT", message: "File changed since AI request was made", currentVersion: file.version });
    const safetyError = validateAIApplyContent(parsed.data.code, parsed.data.language, parsed.data.skipCheck);
    if (safetyError) return response.status(safetyError.status).json(safetyError);
    const lines = file.content.split("\n");
    let nextContent = parsed.data.code;
    let linesReplaced = lines.length;
    if (parsed.data.range) {
      if (parsed.data.range.endLine > lines.length) return response.status(400).json({ error: "INVALID_RANGE", message: "Apply range is outside the file" });
      const start = parsed.data.range.startLine - 1;
      const count = parsed.data.range.endLine - start;
      lines.splice(start, count, ...parsed.data.code.split("\n"));
      nextContent = lines.join("\n");
      linesReplaced = count;
    }
    const saved = await saveFileRevision(file.id, userId, nextContent, parsed.data.expectedVersion, parsed.data.language, true, parsed.data.aiMessageId);
    if (!saved) return response.status(409).json({ error: "File was modified elsewhere", currentVersion: (await db.file.findUniqueOrThrow({ where: { id: file.id }, select: { version: true } })).version });
    if (parsed.data.aiMessageId) {
      const message = await db.aIMessage.findFirst({ where: { id: parsed.data.aiMessageId, conversation: { userId } } });
      if (message) await db.aIMessage.update({ where: { id: message.id }, data: { appliedToFileId: file.id, appliedAt: new Date() } });
    }
    return response.json({ file: { id: saved.file.id, version: saved.file.version, sizeBytes: saved.file.sizeBytes, updatedAt: saved.file.updatedAt }, revisionId: saved.revision.id, linesReplaced, appliedFromAI: true });
  } catch (error) { return next(error); }
});

app.get("/v1/ai/usage", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try { const usage = await getOrCreateAIUsage(userId); const resetDate = new Date(usage.year, usage.month, 1).toISOString().slice(0, 10); return response.json({ used: usage.requestCount, limit: usage.limit, plan: usage.plan, resetDate, percentage: Math.round((usage.requestCount / usage.limit) * 100) }); } catch (error) { return next(error); }
});

const aiConversationMessageSchema = z.object({
  role: z.enum(["USER", "ASSISTANT", "user", "assistant"]).transform((role) => role.toUpperCase() as "USER" | "ASSISTANT"),
  content: z.string().max(200_000),
  command: z.string().trim().max(40).optional(),
  hasCode: z.boolean().optional().default(false),
  codeLanguage: z.string().trim().max(40).optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
});

async function findOwnedConversation(userId: string, conversationId: string) {
  return db.aIConversation.findFirst({ where: { id: conversationId, userId } });
}

function conversationSummary(conversation: { id: string; title: string; fileId: string | null; messageCount: number; updatedAt: Date }) {
  return { id: conversation.id, title: conversation.title, fileId: conversation.fileId, messageCount: conversation.messageCount, updatedAt: conversation.updatedAt };
}

app.get("/v1/ai/conversations", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    const fileId = typeof request.query.fileId === "string" ? request.query.fileId : undefined;
    const projectId = typeof request.query.projectId === "string" ? request.query.projectId : undefined;
    if (fileId) {
      const file = await db.file.findUnique({ where: { id: fileId }, select: { projectId: true } });
      if (!file) return response.status(404).json({ error: "File not found" });
      if (!await userCanAccessProject(userId, file.projectId)) return response.status(403).json({ error: "You do not have access to this file" });
    } else if (projectId && !await userCanAccessProject(userId, projectId)) return response.status(403).json({ error: "You do not have access to this project" });
    const all = request.query.all === "true";
    const limit = Math.min(Math.max(Number(request.query.limit ?? (all ? 20 : 1)), 1), 100);
    let conversations = await db.aIConversation.findMany({ where: { userId, ...(fileId ? { fileId } : {}), ...(projectId ? { projectId } : {}) }, orderBy: { updatedAt: "desc" }, take: limit, select: { id: true, title: true, messageCount: true, fileId: true, updatedAt: true } });
    if (!all && fileId && conversations.length === 0) {
      const conversation = await db.aIConversation.create({ data: { userId, fileId, projectId } , select: { id: true, title: true, messageCount: true, fileId: true, updatedAt: true } });
      conversations = [conversation];
    }
    if (!all) return response.json({ conversation: conversations[0] ? conversationSummary(conversations[0]) : null });
    const withPreview = await Promise.all(conversations.map(async (conversation) => ({ ...conversationSummary(conversation), preview: (await db.aIMessage.findFirst({ where: { conversationId: conversation.id, role: "USER" }, orderBy: { createdAt: "asc" }, select: { content: true } }))?.content.slice(0, 120) ?? "" })));
    return response.json({ conversations: withPreview });
  } catch (error) { return next(error); }
});

app.get("/v1/ai/conversations/:id/messages", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    const conversation = await findOwnedConversation(userId, String(request.params.id));
    if (!conversation) return response.status(404).json({ error: "Conversation not found" });
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20), 1), 100);
    const messages = await db.aIMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: limit + 1, ...(typeof request.query.cursor === "string" ? { skip: 1, cursor: { id: request.query.cursor } } : {}) });
    const page = messages.slice(0, limit);
    return response.json({ messages: page, nextCursor: messages.length > limit ? page[page.length - 1]?.id ?? null : null, total: await db.aIMessage.count({ where: { conversationId: conversation.id } }) });
  } catch (error) { return next(error); }
});

app.post("/v1/ai/conversations/:id/messages", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  const parsed = aiConversationMessageSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const conversation = await findOwnedConversation(userId, String(request.params.id));
    if (!conversation) return response.status(404).json({ error: "Conversation not found" });
    const existing = await db.aIMessage.findFirst({ where: { conversationId: conversation.id, role: parsed.data.role, content: parsed.data.content, createdAt: { gte: new Date(Date.now() - 30_000) } }, orderBy: { createdAt: "desc" } });
    const message = existing ?? await db.aIMessage.create({ data: { conversationId: conversation.id, ...parsed.data }, });
    if (!existing) await db.aIConversation.update({ where: { id: conversation.id }, data: { messageCount: { increment: 1 } } });
    return response.json({ message });
  } catch (error) { return next(error); }
});

app.delete("/v1/ai/conversations/:id", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try { const deleted = await db.aIConversation.deleteMany({ where: { id: String(request.params.id), userId } }); if (!deleted.count) return response.status(404).json({ error: "Conversation not found" }); return response.json({ success: true }); } catch (error) { return next(error); }
});

app.get("/v1/ai/conversations/:id/export", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    const conversation = await findOwnedConversation(userId, String(request.params.id));
    if (!conversation) return response.status(404).json({ error: "Conversation not found" });
    const messages = await db.aIMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" } });
    const file = conversation.fileId ? await db.file.findUnique({ where: { id: conversation.fileId }, select: { path: true } }) : null;
    const title = file?.path.split("/").pop() || "Conversation";
    const markdown = [`# AI Conversation — ${title}`, "", ...messages.map((message) => `## ${message.createdAt.toISOString().slice(0, 10)}\n**${message.role === "USER" ? "You" : "Devpulse AI"}:** ${message.content}`), ""].join("\n");
    const filename = `devpulse-ai-${new Date().toISOString().slice(0, 10)}.md`;
    return response.set({ "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` }).send(markdown);
  } catch (error) { return next(error); }
});

const executeSchema = z.object({
  language: z.enum(["javascript", "python", "rust", "go"]),
  code: z.string().max(500_000),
  timeoutMs: z.number().int().min(250).max(30_000).optional(),
  fileId: z.string().cuid().optional(),
});
const executeImages: Record<z.infer<typeof executeSchema>["language"], string> =
  {
    javascript: "node:20-alpine",
    python: "python:3.12-alpine",
    rust: "rust:1.83-alpine",
    go: "golang:1.23-alpine",
  };

function executeInContainer(
  language: z.infer<typeof executeSchema>["language"],
  code: string,
  timeoutMs: number,
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  error?: string;
}> {
  const command =
    language === "javascript"
      ? ["node", "-"]
      : language === "python"
        ? ["python", "-"]
        : language === "rust"
          ? [
              "sh",
              "-c",
              "cat > /tmp/main.rs && rustc /tmp/main.rs -o /tmp/main && /tmp/main",
            ]
          : ["sh", "-c", "cat > /tmp/main.go && go run /tmp/main.go"];
  const child = spawn(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--cpus",
      "1",
      "--memory",
      "256m",
      "--pids-limit",
      "64",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=64m",
      executeImages[language],
      ...command,
    ],
    { windowsHide: true },
  );
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      app.get("/v1/repositories", async (_request, response, next) => {
        try {
          const repositories = await db.project.findMany({
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              name: true,
              description: true,
              language: true,
              stars: true,
              forks: true,
              isStarred: true,
              defaultBranch: true,
              deployStatus: true,
              devboxReady: true,
              updatedAt: true,
            },
          });
          return response.json({ repositories });
        } catch (error) {
          return next(error);
        }
      });

      app.post("/v1/repositories", async (request, response, next) => {
        const parsed = z
          .object({
            name: z.string().trim().min(1).max(120),
            description: z.string().max(500).default(""),
            language: z.string().trim().max(40).default("TypeScript"),
            branch: z.string().trim().max(120).default("main"),
            workspaceId: z.string().cuid().optional(),
          })
          .safeParse(request.body);
        if (!parsed.success) return sendValidationError(response, parsed.error);
        try {
          const workspace = parsed.data.workspaceId
            ? await db.workspace.findUnique({
                where: { id: parsed.data.workspaceId },
              })
            : await db.workspace.findFirst({ orderBy: { createdAt: "asc" } });
          if (!workspace)
            return response.status(404).json({ error: "Workspace not found" });
          const repository = await db.project.create({
            data: {
              workspaceId: workspace.id,
              name: parsed.data.name,
              description: parsed.data.description,
              language: parsed.data.language,
              defaultBranch: parsed.data.branch,
            },
          });
          return response.status(201).json(repository);
        } catch (error) {
          return next(error);
        }
      });

      app.patch(
        "/v1/repositories/:repositoryId",
        async (request, response, next) => {
          const parsed = z
            .object({
              isStarred: z.boolean().optional(),
              description: z.string().max(500).optional(),
              name: z.string().trim().min(1).max(120).optional(),
            })
            .refine(
              (value) => Object.keys(value).length > 0,
              "at least one field is required",
            )
            .safeParse(request.body);
          if (!parsed.success)
            return sendValidationError(response, parsed.error);
          try {
            const repository = await db.project.update({
              where: { id: request.params.repositoryId },
              data: {
                ...parsed.data,
                ...(parsed.data.isStarred === undefined
                  ? {}
                  : {
                      stars: parsed.data.isStarred
                        ? { increment: 1 }
                        : { decrement: 1 },
                    }),
              },
            });
            return response.json(repository);
          } catch (error) {
            return next(error);
          }
        },
      );

      app.delete(
        "/v1/repositories/:repositoryId",
        async (request, response, next) => {
          try {
            await db.project.delete({
              where: { id: request.params.repositoryId },
            });
            return response.status(204).send();
          } catch (error) {
            return next(error);
          }
        },
      );

      app.get("/v1/devboxes", async (_request, response, next) => {
        try {
          return response.json({
            devboxes: await db.devbox.findMany({
              orderBy: { updatedAt: "desc" },
            }),
          });
        } catch (error) {
          return next(error);
        }
      });

      app.post("/v1/devboxes", async (request, response, next) => {
        const parsed = z
          .object({
            name: z.string().trim().min(1).max(120),
            template: z.string().trim().min(1).max(120),
            repo: z.string().trim().max(200).default("devpulse-core"),
            branch: z.string().trim().max(120).default("main"),
            workspaceId: z.string().cuid().optional(),
            projectId: z.string().cuid().optional(),
            vCpu: z.number().int().min(1).max(64).default(8),
            ram: z.string().max(40).default("32 GB ECC"),
            storage: z.string().max(40).default("100 GB NVMe"),
          })
          .safeParse(request.body);
        if (!parsed.success) return sendValidationError(response, parsed.error);
        try {
          const workspace = parsed.data.workspaceId
            ? await db.workspace.findUnique({
                where: { id: parsed.data.workspaceId },
              })
            : await db.workspace.findFirst({ orderBy: { createdAt: "asc" } });
          if (!workspace)
            return response.status(404).json({ error: "Workspace not found" });
          const devbox = await db.devbox.create({
            data: {
              ...parsed.data,
              workspaceId: workspace.id,
              port: 3000 + Math.floor(Math.random() * 5000),
              url: `https://ws-${Math.floor(Math.random() * 9000) + 1000}.devpulse.dev`,
            },
          });
          return response.status(201).json(devbox);
        } catch (error) {
          return next(error);
        }
      });

      app.patch("/v1/devboxes/:devboxId", async (request, response, next) => {
        const parsed = z
          .object({ status: z.enum(["Running", "Stopped", "Building"]) })
          .safeParse(request.body);
        if (!parsed.success) return sendValidationError(response, parsed.error);
        try {
          return response.json(
            await db.devbox.update({
              where: { id: request.params.devboxId },
              data: parsed.data,
            }),
          );
        } catch (error) {
          return next(error);
        }
      });

      app.delete("/v1/devboxes/:devboxId", async (request, response, next) => {
        try {
          await db.devbox.delete({ where: { id: request.params.devboxId } });
          return response.status(204).send();
        } catch (error) {
          return next(error);
        }
      });

      app.get("/v1/deployments", async (_request, response, next) => {
        try {
          return response.json({
            deployments: await db.deployment.findMany({
              orderBy: { createdAt: "desc" },
            }),
          });
        } catch (error) {
          return next(error);
        }
      });

      app.post("/v1/deployments", async (request, response, next) => {
        const parsed = z
          .object({
            projectId: z.string().cuid().optional(),
            commitMessage: z
              .string()
              .max(240)
              .default("release: deploy latest changes"),
            author: z.string().max(120).default("devpulse"),
          })
          .safeParse(request.body);
        if (!parsed.success) return sendValidationError(response, parsed.error);
        try {
          const project = parsed.data.projectId
            ? await db.project.findUnique({
                where: { id: parsed.data.projectId },
              })
            : await db.project.findFirst({ orderBy: { updatedAt: "desc" } });
          if (!project)
            return response.status(404).json({ error: "Project not found" });
          const deployment = await db.deployment.create({
            data: {
              projectId: project.id,
              target: `${project.name}-release-${Date.now()}.devpulse.app`,
              domain: "global-devpulse-ingress",
              status: "Building",
              branch: project.defaultBranch,
              commitHash: createHash("sha1")
                .update(`${project.id}:${Date.now()}`)
                .digest("hex")
                .slice(0, 7),
              commitMessage: parsed.data.commitMessage,
              author: parsed.data.author,
              timestamp: "Just now",
              duration: "In progress",
            },
          });
          await db.project.update({
            where: { id: project.id },
            data: { deployStatus: "building" },
          });
          return response.status(201).json(deployment);
        } catch (error) {
          return next(error);
        }
      });

      app.post(
        "/v1/deployments/:deploymentId/rerun",
        async (request, response, next) => {
          try {
            return response.json(
              await db.deployment.update({
                where: { id: request.params.deploymentId },
                data: {
                  status: "Building",
                  duration: "In progress",
                  timestamp: "Just now",
                },
              }),
            );
          } catch (error) {
            return next(error);
          }
        },
      );

      app.get("/v1/environment-variables", async (_request, response, next) => {
        try {
          return response.json({
            variables: await db.environmentVariable.findMany({
              orderBy: { updatedAt: "desc" },
              select: {
                id: true,
                projectId: true,
                key: true,
                value: true,
                scope: true,
                updatedAt: true,
              },
            }),
          });
        } catch (error) {
          return next(error);
        }
      });

      app.post("/v1/environment-variables", async (request, response, next) => {
        const parsed = z
          .object({
            projectId: z.string().cuid().optional(),
            key: z.string().trim().min(1).max(120),
            value: z.string().max(4000),
            scope: z.string().trim().max(120).default("Production, Staging"),
          })
          .safeParse(request.body);
        if (!parsed.success) return sendValidationError(response, parsed.error);
        try {
          const project = parsed.data.projectId
            ? await db.project.findUnique({
                where: { id: parsed.data.projectId },
              })
            : await db.project.findFirst({ orderBy: { updatedAt: "desc" } });
          if (!project)
            return response.status(404).json({ error: "Project not found" });
          return response.status(201).json(
            await db.environmentVariable.create({
              data: {
                ...parsed.data,
                projectId: project.id,
                key: parsed.data.key.toUpperCase(),
              },
            }),
          );
        } catch (error) {
          return next(error);
        }
      });

      app.delete(
        "/v1/environment-variables/:variableId",
        async (request, response, next) => {
          try {
            await db.environmentVariable.delete({
              where: { id: request.params.variableId },
            });
            return response.status(204).send();
          } catch (error) {
            return next(error);
          }
        },
      );
      clearTimeout(timer);
      stderr += error.message;
      resolve({ stdout, stderr, exitCode: null, timedOut, error: error.message });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut });
    });
    child.stdin.end(code);
  });
}

app.post("/v1/execute", async (request, response) => {
  const parsed = executeSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  const cacheKey = `execute:${createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex")}`;
  await redisConnection;
  const cached = redis.isReady ? await redis.get(cacheKey) : null;
  if (cached) {
    const cachedResult = JSON.parse(cached) as { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; error?: string; durationMs?: number; executionId?: string };
    const userId = getRequestUserId(request);
    let executionId = cachedResult.executionId;
    if (parsed.data.fileId && userId && !executionId) {
      const file = await db.file.findUnique({ where: { id: parsed.data.fileId }, select: { id: true, project: { select: { workspaceId: true } } } });
      const membership = file ? await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: file.project.workspaceId, userId } } }) : null;
      if (file && membership) {
        const execution = await db.codeExecution.create({ data: { fileId: file.id, userId, language: parsed.data.language, codeSnapshot: parsed.data.code, stdout: cachedResult.stdout, stderr: cachedResult.stderr, exitCode: cachedResult.exitCode, durationMs: cachedResult.durationMs ?? 0, timedOut: cachedResult.timedOut, error: cachedResult.error ?? null } });
        executionId = execution.id;
      }
    }
    return response.json({ ...cachedResult, executionId, cached: true });
  }
  const startedAt = Date.now();
  const result = await executeInContainer(
    parsed.data.language,
    parsed.data.code,
    parsed.data.timeoutMs ?? 10_000,
  );
  const durationMs = Date.now() - startedAt;
  let executionId: string | undefined;
  const userId = getRequestUserId(request);
  if (parsed.data.fileId && userId) {
    const file = await db.file.findUnique({ where: { id: parsed.data.fileId }, select: { id: true, project: { select: { workspaceId: true } } } });
    const membership = file ? await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: file.project.workspaceId, userId } } }) : null;
    if (file && membership) {
      const execution = await db.codeExecution.create({ data: { fileId: file.id, userId, language: parsed.data.language, codeSnapshot: parsed.data.code, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, durationMs, timedOut: result.timedOut, error: result.error ?? null } });
      executionId = execution.id;
    }
  }
  if (redis.isReady)
    await redis.set(cacheKey, JSON.stringify({ ...result, durationMs, executionId }), { EX: 60 });
  if (result.stderr.includes("ENOENT") || result.stderr.includes("not found"))
    return response.status(503).json({
      error: "Execution sandbox is unavailable",
      details: result.stderr,
    });
  return response.status(result.timedOut ? 408 : 200).json({ ...result, durationMs, executionId });
});

app.get("/v1/files/:fileId/executions", checkFileAccess, async (request, response, next) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit ?? 10), 1), 100);
    const executions = await db.codeExecution.findMany({ where: { fileId: String(request.params.fileId) }, orderBy: { createdAt: "desc" }, take: limit, select: { id: true, language: true, stdout: true, stderr: true, exitCode: true, durationMs: true, timedOut: true, error: true, createdAt: true } });
    return response.json({ executions: executions.map((execution) => ({ id: execution.id, language: execution.language, exitCode: execution.exitCode, durationMs: execution.durationMs, timedOut: execution.timedOut, createdAt: execution.createdAt, stdoutPreview: execution.stdout?.slice(0, 200), hasError: Boolean(execution.error) || execution.exitCode !== 0 })) });
  } catch (error) { return next(error); }
});

app.get("/v1/executions/:id", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    const execution = await db.codeExecution.findFirst({ where: { id: String(request.params.id), userId }, include: { user: { select: { name: true, avatarUrl: true } } } });
    if (!execution) return response.status(404).json({ error: "Execution not found" });
    return response.json({ execution });
  } catch (error) { return next(error); }
});

const editorSessionSchema = z.object({ projectId: z.string().cuid(), openFileIds: z.array(z.string().cuid()).max(500), activeFileId: z.string().cuid().optional(), scrollPositions: z.record(z.number().finite()).optional(), cursorPositions: z.record(z.object({ line: z.number().int().nonnegative(), col: z.number().int().nonnegative() })).optional() });
app.put("/v1/editor/session", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  const parsed = editorSessionSchema.safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const project = await db.project.findUnique({ where: { id: parsed.data.projectId }, select: { workspaceId: true } });
    if (!project) return response.status(404).json({ error: "Project not found" });
    const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } } });
    if (!membership) return response.status(403).json({ error: "You do not have access to this project" });
    const session = await db.editorSession.upsert({ where: { userId_projectId: { userId, projectId: parsed.data.projectId } }, create: { ...parsed.data, userId }, update: { ...parsed.data, updatedAt: new Date() } });
    return response.json({ session });
  } catch (error) { return next(error); }
});

app.get("/v1/editor/session/:projectId", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    if (!await userCanAccessProject(userId, String(request.params.projectId))) return response.status(403).json({ error: "You do not have access to this project" });
    const session = await db.editorSession.findUnique({ where: { userId_projectId: { userId, projectId: String(request.params.projectId) } } });
    const savedSession = session ? { openFileIds: session.openFileIds, activeFileId: session.activeFileId, scrollPositions: session.scrollPositions, cursorPositions: session.cursorPositions } : null;
    return response.json({ session: savedSession, openFileIds: savedSession?.openFileIds ?? [], activeFileId: savedSession?.activeFileId ?? null, scrollPositions: savedSession?.scrollPositions ?? {}, cursorPositions: savedSession?.cursorPositions ?? {} });
  } catch (error) { return next(error); }
});

app.delete("/v1/editor/session/:projectId", async (request, response, next) => {
  const userId = requireUser(request, response); if (!userId) return;
  try {
    if (!await userCanAccessProject(userId, String(request.params.projectId))) return response.status(403).json({ error: "You do not have access to this project" });
    await db.editorSession.deleteMany({ where: { userId, projectId: String(request.params.projectId) } });
    return response.status(204).send();
  } catch (error) { return next(error); }
});

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Devpulse API listening on :${port}`));
}
