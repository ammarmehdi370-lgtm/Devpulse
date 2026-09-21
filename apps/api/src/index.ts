import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createClient } from "redis";
import * as Minio from "minio";
import jwt, { type SignOptions } from "jsonwebtoken";
import pinoHttp from "pino-http";
import { z } from "zod";
import { db } from "@devpulse/database";
import type { Prisma } from "@devpulse/database";

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
    include: { project: true },
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

app.patch("/v1/files/:fileId", async (request, response, next) => {
  const parsed = z
    .object({
      path: filePathSchema.optional(),
      content: fileContentSchema.optional(),
      language: fileLanguageSchema,
    })
    .refine(
      (value) =>
        value.path !== undefined ||
        value.content !== undefined ||
        value.language !== undefined,
      "at least one field is required",
    )
    .safeParse(request.body);
  if (!parsed.success) return sendValidationError(response, parsed.error);
  try {
    const existing = await findProjectFile(request.params.fileId);
    if (!existing)
      return response.status(404).json({ error: "File not found" });
    const nextContent = parsed.data.content ?? existing.content;
    const contentChanged =
      parsed.data.content !== undefined &&
      parsed.data.content !== existing.content;
    const file = await db.$transaction(
      async (transaction: Prisma.TransactionClient) => {
        const updated = await transaction.file.update({
          where: { id: existing.id },
          data: {
            path: parsed.data.path,
            language: parsed.data.language,
            content: parsed.data.content,
            ...(contentChanged ? { version: { increment: 1 } } : {}),
          },
        });
        if (contentChanged)
          await transaction.fileRevision.create({
            data: {
              fileId: updated.id,
              version: updated.version,
              content: nextContent,
            },
          });
        return updated;
      },
    );
    return response.json(file);
  } catch (error) {
    return next(error);
  }
});

app.delete("/v1/files/:fileId", async (request, response, next) => {
  try {
    const file = await findProjectFile(request.params.fileId);
    if (!file) return response.status(404).json({ error: "File not found" });
    await db.file.delete({ where: { id: file.id } });
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

const executeSchema = z.object({
  language: z.enum(["javascript", "python", "rust", "go"]),
  code: z.string().max(500_000),
  timeoutMs: z.number().int().min(250).max(30_000).optional(),
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
      resolve({ stdout, stderr, exitCode: null, timedOut });
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
  if (cached) return response.json({ ...JSON.parse(cached), cached: true });
  const result = await executeInContainer(
    parsed.data.language,
    parsed.data.code,
    parsed.data.timeoutMs ?? 10_000,
  );
  if (redis.isReady)
    await redis.set(cacheKey, JSON.stringify(result), { EX: 60 });
  if (result.stderr.includes("ENOENT") || result.stderr.includes("not found"))
    return response.status(503).json({
      error: "Execution sandbox is unavailable",
      details: result.stderr,
    });
  return response.status(result.timedOut ? 408 : 200).json(result);
});

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Devpulse API listening on :${port}`));
}
