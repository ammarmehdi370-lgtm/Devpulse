import { db } from "../src/index.js";

const DEMO_EMAIL = "demo@devpulse.local";
const DEMO_WORKSPACE_SLUG = "demo";
const DEMO_PROJECT_ID = "demo-project";
const DEMO_CHANNEL_ID = "demo-channel-general";
const DEMO_CONVERSATION_IDS = [
  "demo-ai-conversation-1",
  "demo-ai-conversation-2",
];
const DEMO_EXECUTION_IDS = [
  "demo-execution-1",
  "demo-execution-2",
  "demo-execution-3",
];

async function clearSeedData(): Promise<void> {
  console.log("Clearing existing Devpulse demo seed data...");

  await db.$transaction(async (transaction) => {
    await transaction.aIMessage.deleteMany({
      where: { conversationId: { in: DEMO_CONVERSATION_IDS } },
    });
    await transaction.aIConversation.deleteMany({
      where: { id: { in: DEMO_CONVERSATION_IDS } },
    });
    await transaction.message.deleteMany({
      where: { id: "demo-message-welcome" },
    });
    await transaction.codeExecution.deleteMany({
      where: { id: { in: DEMO_EXECUTION_IDS } },
    });
    await transaction.editorSession.deleteMany({
      where: { projectId: DEMO_PROJECT_ID },
    });
    await transaction.devbox.deleteMany({
      where: { id: "demo-devbox" },
    });
    await transaction.deployment.deleteMany({
      where: { id: "demo-deployment" },
    });
    await transaction.project.deleteMany({
      where: { id: DEMO_PROJECT_ID },
    });
  });

  console.log("Demo seed data cleared; user and workspace were preserved.");
}

async function seedData(): Promise<void> {
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Devpulse Demo" },
    create: {
      email: DEMO_EMAIL,
      name: "Devpulse Demo",
    },
  });
  console.log(`✓ User: ${user.email}`);

  const workspace = await db.workspace.upsert({
    where: { slug: DEMO_WORKSPACE_SLUG },
    update: { name: "Demo Workspace" },
    create: {
      name: "Demo Workspace",
      slug: DEMO_WORKSPACE_SLUG,
      ownerId: user.id,
      plan: "PRO",
    },
  });
  console.log(`✓ Workspace: ${workspace.name}`);

  await db.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
  });
  console.log("✓ Membership: OWNER");

  const project = await db.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {
      description: "Persistent Devpulse demo repository",
      language: "TypeScript",
      isPrivate: false,
      stars: 12,
      forks: 3,
      isStarred: true,
      deployStatus: "live",
    },
    create: {
      id: DEMO_PROJECT_ID,
      name: "Devpulse Demo Project",
      workspaceId: workspace.id,
      description: "Persistent Devpulse demo repository",
      language: "TypeScript",
      isPrivate: false,
      stars: 12,
      forks: 3,
      isStarred: true,
      deployStatus: "live",
    },
  });
  console.log(`✓ Project: ${project.name}`);

  const fileSeeds = [
    {
      path: "README.md",
      language: "markdown",
      content: "# Devpulse Demo\n",
    },
    {
      path: "main.py",
      language: "python",
      content: 'print("Hello from Devpulse")\n',
    },
  ];
  const files: Awaited<ReturnType<typeof db.file.upsert>>[] = [];
  for (const fileSeed of fileSeeds) {
    const file = await db.file.upsert({
      where: {
        projectId_path: {
          projectId: project.id,
          path: fileSeed.path,
        },
      },
      update: {
        language: fileSeed.language,
        content: fileSeed.content,
        sizeBytes: Buffer.byteLength(fileSeed.content),
      },
      create: {
        projectId: project.id,
        path: fileSeed.path,
        language: fileSeed.language,
        content: fileSeed.content,
        sizeBytes: Buffer.byteLength(fileSeed.content),
      },
    });
    files.push(file);

    await db.fileRevision.upsert({
      where: {
        fileId_version: {
          fileId: file.id,
          version: 1,
        },
      },
      update: {
        content: fileSeed.content,
        authorId: user.id,
      },
      create: {
        fileId: file.id,
        version: 1,
        content: fileSeed.content,
        authorId: user.id,
      },
    });
    console.log(`✓ File: ${fileSeed.path}`);
  }

  const conversationSeeds = [
    { id: "demo-ai-conversation-1", title: "Improve editor startup" },
    { id: "demo-ai-conversation-2", title: "Explain the active file" },
  ] as const;
  for (const [index, conversationSeed] of conversationSeeds.entries()) {
    const file = files[index] ?? files[0];
    if (!file) throw new Error("Demo project files were not created.");

    const conversation = await db.aIConversation.upsert({
      where: { id: conversationSeed.id },
      update: {
        title: conversationSeed.title,
        userId: user.id,
        projectId: project.id,
        fileId: file.id,
        model: "claude-sonnet-4-6",
        messageCount: 5,
      },
      create: {
        id: conversationSeed.id,
        title: conversationSeed.title,
        userId: user.id,
        projectId: project.id,
        fileId: file.id,
        model: "claude-sonnet-4-6",
        messageCount: 5,
      },
    });

    for (let messageIndex = 1; messageIndex <= 5; messageIndex += 1) {
      const isUser = messageIndex % 2 === 1;
      const messageId = `${conversation.id}-message-${messageIndex}`;
      const messageData = {
        conversationId: conversation.id,
        role: isUser ? ("USER" as const) : ("ASSISTANT" as const),
        content: isUser
          ? `Please review ${conversationSeed.title.toLowerCase()}.`
          : `Review ${messageIndex}: the requested editor guidance is ready.`,
        command: isUser ? (messageIndex === 1 ? "/explain" : "/fix") : null,
        hasCode: !isUser,
        codeLanguage: !isUser ? "typescript" : null,
      };

      await db.aIMessage.upsert({
        where: { id: messageId },
        update: messageData,
        create: {
          id: messageId,
          ...messageData,
          tokensUsed: isUser ? 18 : 64,
          responseTimeMs: isUser ? null : 420,
        },
      });
    }
  }

  const now = new Date();
  await db.aIUsage.upsert({
    where: {
      userId_month_year: {
        userId: user.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    },
    update: { workspaceId: workspace.id },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      requestCount: 10,
      tokenCount: 410,
      estimatedCost: 0.0123,
    },
  });

  for (let index = 0; index < DEMO_EXECUTION_IDS.length; index += 1) {
    const file = files[index % files.length];
    if (!file) throw new Error("Demo project files were not created.");
    const executionId = DEMO_EXECUTION_IDS[index];
    if (!executionId) throw new Error(`Missing demo execution ID for item ${index + 1}.`);

    await db.codeExecution.upsert({
      where: { id: executionId },
      update: {
        fileId: file.id,
        userId: user.id,
        language: file.language ?? "javascript",
        codeSnapshot: file.content,
        stdout:
          index === 0
            ? "Devpulse execution succeeded\n"
            : `Execution ${index + 1} completed\n`,
        stderr: null,
        exitCode: 0,
        durationMs: 120 + index * 37,
        timedOut: false,
      },
      create: {
        id: executionId,
        fileId: file.id,
        userId: user.id,
        language: file.language ?? "javascript",
        codeSnapshot: file.content,
        stdout:
          index === 0
            ? "Devpulse execution succeeded\n"
            : `Execution ${index + 1} completed\n`,
        exitCode: 0,
        durationMs: 120 + index * 37,
      },
    });
  }

  const primaryFile = files[0];
  if (!primaryFile) throw new Error("Demo project files were not created.");

  await db.editorSession.upsert({
    where: {
      userId_projectId: { userId: user.id, projectId: project.id },
    },
    update: {
      openFileIds: files.map((file) => file.id),
      activeFileId: primaryFile.id,
      scrollPositions: { [primaryFile.id]: 1 },
      cursorPositions: { [primaryFile.id]: { line: 1, col: 1 } },
    },
    create: {
      userId: user.id,
      projectId: project.id,
      openFileIds: files.map((file) => file.id),
      activeFileId: primaryFile.id,
      scrollPositions: { [primaryFile.id]: 1 },
      cursorPositions: { [primaryFile.id]: { line: 1, col: 1 } },
    },
  });

  await db.devbox.upsert({
    where: { id: "demo-devbox" },
    update: {
      workspaceId: workspace.id,
      projectId: project.id,
      name: "devpulse-demo-devbox",
      repo: "devpulse-demo-project",
      template: "Next.js 15",
      url: "https://ws-demo.devpulse.dev",
      port: 3000,
    },
    create: {
      id: "demo-devbox",
      workspaceId: workspace.id,
      projectId: project.id,
      name: "devpulse-demo-devbox",
      repo: "devpulse-demo-project",
      template: "Next.js 15",
      url: "https://ws-demo.devpulse.dev",
      port: 3000,
    },
  });

  await db.deployment.upsert({
    where: { id: "demo-deployment" },
    update: {
      projectId: project.id,
      target: "devpulse-demo-preview.devpulse.app",
      domain: "global-devpulse-ingress",
      status: "Ready",
      branch: "main",
      commitHash: "demo123",
      commitMessage: "seed: create persistent demo deployment",
      author: "devpulse",
      timestamp: "Just now",
      duration: "12s",
    },
    create: {
      id: "demo-deployment",
      projectId: project.id,
      target: "devpulse-demo-preview.devpulse.app",
      domain: "global-devpulse-ingress",
      status: "Ready",
      branch: "main",
      commitHash: "demo123",
      commitMessage: "seed: create persistent demo deployment",
      author: "devpulse",
      timestamp: "Just now",
      duration: "12s",
    },
  });

  await db.environmentVariable.upsert({
    where: {
      projectId_key: {
        projectId: project.id,
        key: "DATABASE_URL",
      },
    },
    update: {
      value: "postgresql://localhost:5433/devpulse",
      scope: "Development",
    },
    create: {
      projectId: project.id,
      key: "DATABASE_URL",
      value: "postgresql://localhost:5433/devpulse",
      scope: "Development",
    },
  });

  const channel = await db.channel.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "general",
      },
    },
    update: { type: "PUBLIC" },
    create: {
      id: DEMO_CHANNEL_ID,
      workspaceId: workspace.id,
      name: "general",
      type: "PUBLIC",
    },
  });

  await db.message.upsert({
    where: { id: "demo-message-welcome" },
    update: {
      channelId: channel.id,
      authorId: user.id,
      body: "Welcome to the Devpulse demo workspace!",
    },
    create: {
      id: "demo-message-welcome",
      channelId: channel.id,
      authorId: user.id,
      body: "Welcome to the Devpulse demo workspace!",
    },
  });
  console.log("✓ Channel: #general and welcome message");
}

async function verifySeed(): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { slug: DEMO_WORKSPACE_SLUG },
    select: { id: true },
  });
  const [users, workspaces, projects, files, channels] = await Promise.all([
    db.user.count({ where: { email: DEMO_EMAIL } }),
    db.workspace.count({ where: { slug: DEMO_WORKSPACE_SLUG } }),
    workspace
      ? db.project.count({
          where: {
            workspaceId: workspace.id,
            name: "Devpulse Demo Project",
          },
        })
      : Promise.resolve(0),
    workspace
      ? db.file.count({
          where: {
            project: {
              workspaceId: workspace.id,
              name: "Devpulse Demo Project",
            },
          },
        })
      : Promise.resolve(0),
    db.channel.count({ where: { id: DEMO_CHANNEL_ID } }),
  ]);

  console.log("\nVerification:");
  console.log(`  users:      ${users}`);
  console.log(`  workspaces: ${workspaces}`);
  console.log(`  projects:   ${projects}`);
  console.log(`  files:      ${files}`);
  console.log(`  channels:   ${channels}`);

  if (users !== 1 || workspaces !== 1 || projects !== 1 || files < 2 || channels !== 1) {
    throw new Error("Seed verification failed: one or more demo records are missing.");
  }
}

async function main(): Promise<void> {
  console.log("\n=== Devpulse Database Seed ===");

  if (process.argv.includes("--reset")) {
    await clearSeedData();
  }

  console.log("Seeding demo data...");
  await seedData();
  await verifySeed();
  console.log("\nSeed complete.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "Seed failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
