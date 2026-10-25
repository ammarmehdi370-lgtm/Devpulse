import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import {
  channels,
  files,
  messages,
  projects,
  schema,
  users,
  workspaces,
  workspaceMembers,
} from "./db/schema";

const initialMigration = [
  `CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE')`,
  `CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST')`,
  `CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT')`,
  `CREATE TABLE "User" (
    "id" text PRIMARY KEY, "email" text NOT NULL UNIQUE, "name" text,
    "avatarUrl" text, "passwordHash" text,
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE "Workspace" (
    "id" text PRIMARY KEY, "name" text NOT NULL, "slug" text NOT NULL UNIQUE,
    "plan" "Plan" NOT NULL DEFAULT 'FREE', "ownerId" text NOT NULL REFERENCES "User"("id"),
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX "Workspace_ownerId_idx" ON "Workspace" ("ownerId")`,
  `CREATE TABLE "WorkspaceMember" (
    "workspaceId" text NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
    "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId")
  )`,
  `CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember" ("userId")`,
  `CREATE TABLE "Project" (
    "id" text PRIMARY KEY, "workspaceId" text NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
    "name" text NOT NULL, "template" text NOT NULL DEFAULT 'blank',
    "defaultBranch" text NOT NULL DEFAULT 'main', "description" text NOT NULL DEFAULT '',
    "isPrivate" boolean NOT NULL DEFAULT false, "language" text NOT NULL DEFAULT 'TypeScript',
    "stars" integer NOT NULL DEFAULT 0, "forks" integer NOT NULL DEFAULT 0,
    "isStarred" boolean NOT NULL DEFAULT false, "deployStatus" text NOT NULL DEFAULT 'none',
    "devboxReady" boolean NOT NULL DEFAULT true,
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    "updatedAt" timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT "Project_workspaceId_name_key" UNIQUE ("workspaceId", "name")
  )`,
  `CREATE INDEX "Project_workspaceId_idx" ON "Project" ("workspaceId")`,
  `CREATE TABLE "File" (
    "id" text PRIMARY KEY, "projectId" text NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "path" text NOT NULL, "content" text NOT NULL DEFAULT '', "language" text,
    "sizeBytes" integer, "lastEditedById" text REFERENCES "User"("id"),
    "lastEditedAt" timestamp(3), "version" integer NOT NULL DEFAULT 1,
    "lockedBy" text, "lockedAt" timestamp(3),
    "updatedAt" timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT "File_projectId_path_key" UNIQUE ("projectId", "path")
  )`,
  `CREATE INDEX "File_projectId_idx" ON "File" ("projectId")`,
  `CREATE INDEX "File_projectId_updatedAt_idx" ON "File" ("projectId", "updatedAt")`,
  `CREATE INDEX "File_projectId_language_idx" ON "File" ("projectId", "language")`,
  `CREATE TABLE "FileRevision" (
    "id" text PRIMARY KEY, "fileId" text NOT NULL REFERENCES "File"("id") ON DELETE CASCADE,
    "version" integer NOT NULL, "content" text NOT NULL, "authorId" text,
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    "appliedFromAI" boolean NOT NULL DEFAULT false, "aiMessageId" text,
    "lineCount" integer, "charCount" integer, "diffPatch" text,
    CONSTRAINT "FileRevision_fileId_version_key" UNIQUE ("fileId", "version")
  )`,
  `CREATE INDEX "FileRevision_fileId_createdAt_idx" ON "FileRevision" ("fileId", "createdAt")`,
  `CREATE TABLE "Channel" (
    "id" text PRIMARY KEY, "workspaceId" text NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
    "name" text NOT NULL, "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT "Channel_workspaceId_name_key" UNIQUE ("workspaceId", "name")
  )`,
  `CREATE INDEX "Channel_workspaceId_idx" ON "Channel" ("workspaceId")`,
  `CREATE TABLE "Message" (
    "id" text PRIMARY KEY, "channelId" text NOT NULL REFERENCES "Channel"("id") ON DELETE CASCADE,
    "authorId" text NOT NULL REFERENCES "User"("id"), "body" text NOT NULL,
    "createdAt" timestamp(3) NOT NULL DEFAULT now(),
    "editedAt" timestamp(3), "deletedAt" timestamp(3)
  )`,
  `CREATE INDEX "Message_channelId_createdAt_idx" ON "Message" ("channelId", "createdAt")`,
  `CREATE TABLE "AIUsage" (
    "id" text PRIMARY KEY, "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "workspaceId" text, "month" integer NOT NULL, "year" integer NOT NULL,
    "requestCount" integer NOT NULL DEFAULT 0, "tokenCount" integer NOT NULL DEFAULT 0,
    "estimatedCost" double precision NOT NULL DEFAULT 0, "updatedAt" timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT "AIUsage_userId_month_year_key" UNIQUE ("userId", "month", "year")
  )`,
  `CREATE INDEX "AIUsage_userId_year_month_idx" ON "AIUsage" ("userId", "year", "month")`,
];

const migrations = [
  { id: 1, statements: initialMigration },
  {
    id: 2,
    statements: [
      `CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT')`,
      `CREATE TABLE "AIConversation" (
        "id" text PRIMARY KEY, "title" text NOT NULL DEFAULT 'New conversation',
        "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "projectId" text REFERENCES "Project"("id") ON DELETE SET NULL,
        "fileId" text REFERENCES "File"("id") ON DELETE SET NULL,
        "model" text NOT NULL DEFAULT 'claude-sonnet-4-6',
        "messageCount" integer NOT NULL DEFAULT 0,
        "createdAt" timestamp(3) NOT NULL DEFAULT now(),
        "updatedAt" timestamp(3) NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX "AIConversation_userId_fileId_idx" ON "AIConversation" ("userId", "fileId")`,
      `CREATE INDEX "AIConversation_projectId_updatedAt_idx" ON "AIConversation" ("projectId", "updatedAt")`,
      `CREATE TABLE "AIMessage" (
        "id" text PRIMARY KEY,
        "conversationId" text NOT NULL REFERENCES "AIConversation"("id") ON DELETE CASCADE,
        "role" "AIMessageRole" NOT NULL, "content" text NOT NULL, "command" text,
        "tokensUsed" integer, "responseTimeMs" integer,
        "hasCode" boolean NOT NULL DEFAULT false, "codeLanguage" text,
        "appliedToFileId" text, "appliedAt" timestamp(3),
        "createdAt" timestamp(3) NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage" ("conversationId", "createdAt")`,
    ],
  },
  {
    id: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
        "workspaceId" text NOT NULL REFERENCES "Workspace"("id") ON DELETE CASCADE,
        "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
        "joinedAt" timestamp(3) NOT NULL DEFAULT now(),
        CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId")
      )`,
      `CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx" ON "WorkspaceMember" ("userId")`,
    ],
  },
];

export type BrowserDatabase = PgliteDatabase<typeof schema>;
export type BrowserTransaction = Parameters<Parameters<BrowserDatabase["transaction"]>[0]>[0];

let clientPromise: Promise<PGlite> | undefined;
let databasePromise: Promise<BrowserDatabase> | undefined;

export async function initDatabase(): Promise<BrowserDatabase> {
  if (typeof window === "undefined") {
    throw new Error("The browser database can only be initialized in a browser.");
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new PGlite("idb://devpulse");
      await client.waitReady;
      if (navigator.locks) {
        await navigator.locks.request("devpulse-db-migrations", () => runMigrations(client));
      } else {
        await runMigrations(client);
      }
      return client;
    })().catch((error: unknown) => {
      clientPromise = undefined;
      databasePromise = undefined;
      throw error;
    });
  }

  if (!databasePromise) {
    databasePromise = clientPromise
      .then((client) => drizzle(client, { schema }))
      .catch((error: unknown) => {
        databasePromise = undefined;
        throw error;
      });
  }

  return databasePromise;
}

export const getDB = initDatabase;

async function runMigrations(client: PGlite): Promise<void> {
  await client.exec(`CREATE TABLE IF NOT EXISTS "__devpulse_migrations" (
    "id" integer PRIMARY KEY, "appliedAt" timestamp(3) NOT NULL DEFAULT now()
  )`);
  const result = await client.query<{ id: number }>(
    `SELECT "id" FROM "__devpulse_migrations" ORDER BY "id"`,
  );
  const appliedMigrations = new Set(result.rows.map((row) => row.id));
  for (const migration of migrations) {
    if (appliedMigrations.has(migration.id)) continue;
    await client.transaction(async (tx) => {
      for (const statement of migration.statements) await tx.exec(statement);
      await tx.exec(
        `INSERT INTO "__devpulse_migrations" ("id") VALUES (${migration.id})`,
      );
    });
  }
}

export type DemoSeedResult = "seeded" | "already-seeded" | "database-not-empty";

export async function seedIfEmpty(): Promise<DemoSeedResult> {
  const db = await getDB();
  const seed = async (): Promise<DemoSeedResult> => db.transaction(async (tx): Promise<DemoSeedResult> => {
    const [demoUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "demo@devpulse.local"))
      .limit(1);
    if (demoUser) return "already-seeded";

    const [existingUser] = await tx.select({ id: users.id }).from(users).limit(1);
    if (existingUser) return "database-not-empty";

    const ids = {
      user: crypto.randomUUID(),
      workspace: crypto.randomUUID(),
      projectCore: crypto.randomUUID(),
      projectDaemon: crypto.randomUUID(),
      projectRouter: crypto.randomUUID(),
      projectHypervisor: crypto.randomUUID(),
      generalChannel: crypto.randomUUID(),
      frontendChannel: crypto.randomUUID(),
      backendChannel: crypto.randomUUID(),
    };
    const now = new Date();
    const projectSeeds = [
      {
        id: ids.projectCore,
        name: "devpulse-core",
        language: "TypeScript",
        description: "Hyper-optimized microVM runtime",
        defaultBranch: "staging",
        stars: 124,
        forks: 38,
        isStarred: true,
        deployStatus: "live",
        devboxReady: true,
      },
      {
        id: ids.projectDaemon,
        name: "neural-coder-daemon",
        language: "Python",
        description: "AI-powered code generation daemon",
        defaultBranch: "main",
        stars: 89,
        forks: 14,
        isStarred: true,
        deployStatus: "building",
        devboxReady: true,
      },
      {
        id: ids.projectRouter,
        name: "wireguard-mesh-router",
        language: "Go",
        description: "Zero-config mesh networking",
        defaultBranch: "v1.4-stable",
        stars: 45,
        forks: 9,
        isStarred: false,
        deployStatus: "live",
        devboxReady: false,
      },
      {
        id: ids.projectHypervisor,
        name: "microkernel-hypervisor",
        language: "Rust",
        description: "Bare-metal hypervisor kernel",
        defaultBranch: "master",
        stars: 210,
        forks: 42,
        isStarred: true,
        deployStatus: "none",
        devboxReady: false,
      },
    ];
    const demoFiles = [
      {
        id: crypto.randomUUID(),
        path: "src/index.ts",
        language: "typescript",
        content: "// Devpulse core entry\nexport {}",
      },
      {
        id: crypto.randomUUID(),
        path: "src/server.ts",
        language: "typescript",
        content: "// Express server\nexport {}",
      },
      {
        id: crypto.randomUUID(),
        path: "src/workers/agent.py",
        language: "python",
        content: '# AI agent worker\nprint("hello")',
      },
      {
        id: crypto.randomUUID(),
        path: "package.json",
        language: "json",
        content: '{"name":"devpulse-core","version":"0.1.0"}',
      },
      {
        id: crypto.randomUUID(),
        path: "README.md",
        language: "markdown",
        content: "# devpulse-core\nHyper-optimized runtime.",
      },
    ];

    await tx.insert(users).values({
      id: ids.user,
      email: "demo@devpulse.local",
      name: "Alex",
    }).onConflictDoNothing();
    await tx.insert(workspaces).values({
      id: ids.workspace,
      name: "Demo Workspace",
      slug: "demo-workspace",
      ownerId: ids.user,
      plan: "PRO",
    }).onConflictDoNothing();
    await tx.insert(workspaceMembers).values({
      workspaceId: ids.workspace,
      userId: ids.user,
      role: "OWNER",
    }).onConflictDoNothing();
    for (const project of projectSeeds) {
      await tx.insert(projects).values({
        ...project,
        workspaceId: ids.workspace,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing();
    }
    for (const file of demoFiles) {
      await tx.insert(files).values({
        ...file,
        projectId: projectSeeds[0]!.id,
        sizeBytes: new TextEncoder().encode(file.content).byteLength,
        version: 1,
        updatedAt: now,
      }).onConflictDoNothing();
    }
    const channelSeeds = [
      { id: ids.generalChannel, name: "general" },
      { id: ids.frontendChannel, name: "frontend" },
      { id: ids.backendChannel, name: "backend" },
    ];
    await tx.insert(channels).values(channelSeeds.map(({ id, name }) => ({
      id,
      workspaceId: ids.workspace,
      name,
      type: "PUBLIC",
    }))).onConflictDoNothing();
    await tx.insert(messages).values([
      {
        id: crypto.randomUUID(),
        channelId: ids.generalChannel,
        authorId: ids.user,
        body: "Just pushed the new Monaco theme 🎉",
      },
      {
        id: crypto.randomUUID(),
        channelId: ids.generalChannel,
        authorId: ids.user,
        body: "AI drawer is looking great, nice work",
      },
      {
        id: crypto.randomUUID(),
        channelId: ids.frontendChannel,
        authorId: ids.user,
        body: "Frontend build is passing ✅",
      },
    ]).onConflictDoNothing();

    return "seeded";
  });

  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("devpulse-demo-seed", seed);
  }
  return seed();
}

export async function clearDatabase(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("The browser database can only be cleared in a browser.");
  }
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
  }
  clientPromise = undefined;
  databasePromise = undefined;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("devpulse");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete the PGlite IndexedDB database."));
    request.onblocked = () => reject(new Error("Close other Devpulse tabs before clearing the database."));
  });
}
