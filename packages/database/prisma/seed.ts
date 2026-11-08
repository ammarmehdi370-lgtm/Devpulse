import { db } from "../src/index.js";

const DEMO_EMAIL = "demo@devpulse.local";
const DEMO_WORKSPACE_SLUG = "demo";
const DEMO_PROJECT_ID = "demo-project";
const DEMO_CHANNEL_ID = "demo-channel-general";
const DEMO_PROJECTS = [
  {
    id: DEMO_PROJECT_ID,
    name: "Devpulse Demo Project",
    description: "Persistent Devpulse demo repository",
    language: "TypeScript",
    files: [
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
    ],
  },
  {
    id: "demo-project-web",
    name: "Devpulse Web",
    description: "A demo web application repository",
    language: "TypeScript",
    files: [
      {
        path: "README.md",
        language: "markdown",
        content: "# Devpulse Web\n",
      },
      {
        path: "src/index.ts",
        language: "typescript",
        content: 'export const appName = "Devpulse Web";\n',
      },
    ],
  },
  {
    id: "demo-project-api",
    name: "Devpulse API",
    description: "A demo API service repository",
    language: "TypeScript",
    files: [
      {
        path: "README.md",
        language: "markdown",
        content: "# Devpulse API\n",
      },
      {
        path: "src/server.ts",
        language: "typescript",
        content: 'export const healthRoute = "/health";\n',
      },
    ],
  },
  {
    id: "demo-project-docs",
    name: "Devpulse Docs",
    description: "A demo documentation repository",
    language: "Markdown",
    files: [
      {
        path: "README.md",
        language: "markdown",
        content: "# Devpulse Docs\n",
      },
      {
        path: "guide.md",
        language: "markdown",
        content: "## Getting started\n\nWelcome to Devpulse.\n",
      },
    ],
  },
] as const;
const DEMO_PROJECT_IDS = DEMO_PROJECTS.map(({ id }) => id);
const DEMO_CHANNELS = [
  { id: DEMO_CHANNEL_ID, name: "general" },
  { id: "demo-channel-development", name: "development" },
  { id: "demo-channel-announcements", name: "announcements" },
] as const;
const DEMO_CHANNEL_IDS = DEMO_CHANNELS.map(({ id }) => id);
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
    await transaction.aIUsage.deleteMany({
      where: { user: { email: DEMO_EMAIL } },
    });
    await transaction.message.deleteMany({
      where: { id: "demo-message-welcome" },
    });
    await transaction.codeExecution.deleteMany({
      where: { id: { in: DEMO_EXECUTION_IDS } },
    });
    await transaction.editorSession.deleteMany({
      where: { projectId: { in: DEMO_PROJECT_IDS } },
    });
    await transaction.devbox.deleteMany({
      where: { id: "demo-devbox" },
    });
    await transaction.deployment.deleteMany({
      where: { id: "demo-deployment" },
    });
    await transaction.channel.deleteMany({
      where: { id: { in: DEMO_CHANNEL_IDS } },
    });
    await transaction.project.deleteMany({
      where: { id: { in: DEMO_PROJECT_IDS } },
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
    update: { name: "Demo Workspace", ownerId: user.id, plan: "PRO" },
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

  const projects = [];
  for (const [index, projectSeed] of DEMO_PROJECTS.entries()) {
    const project = await db.project.upsert({
      where: { id: projectSeed.id },
      update: {
        name: projectSeed.name,
        workspaceId: workspace.id,
        description: projectSeed.description,
        language: projectSeed.language,
        isPrivate: false,
        stars: index === 0 ? 12 : 0,
        forks: index === 0 ? 3 : 0,
        isStarred: index === 0,
        deployStatus: index === 0 ? "live" : "none",
      },
      create: {
        id: projectSeed.id,
        name: projectSeed.name,
        workspaceId: workspace.id,
        description: projectSeed.description,
        language: projectSeed.language,
        isPrivate: false,
        stars: index === 0 ? 12 : 0,
        forks: index === 0 ? 3 : 0,
        isStarred: index === 0,
        deployStatus: index === 0 ? "live" : "none",
      },
    });
    projects.push(project);
    console.log(`✓ Project: ${project.name}`);
  }

  const primaryProject = projects[0];
  if (!primaryProject) throw new Error("Demo projects were not created.");

  const files: Awaited<ReturnType<typeof db.file.upsert>>[] = [];
  for (const [projectIndex, projectSeed] of DEMO_PROJECTS.entries()) {
    const project = projects[projectIndex];
    if (!project) throw new Error(`Missing demo project ${projectSeed.name}.`);

    for (const fileSeed of projectSeed.files) {
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
      console.log(`✓ File: ${project.name}/${fileSeed.path}`);
    }
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
        projectId: primaryProject.id,
        fileId: file.id,
        model: "claude-sonnet-4-6",
        messageCount: 5,
      },
      create: {
        id: conversationSeed.id,
        title: conversationSeed.title,
        userId: user.id,
        projectId: primaryProject.id,
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
    if (!executionId)
      throw new Error(`Missing demo execution ID for item ${index + 1}.`);

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
      userId_projectId: { userId: user.id, projectId: primaryProject.id },
    },
    update: {
      openFileIds: files.map((file) => file.id),
      activeFileId: primaryFile.id,
      scrollPositions: { [primaryFile.id]: 1 },
      cursorPositions: { [primaryFile.id]: { line: 1, col: 1 } },
    },
    create: {
      userId: user.id,
      projectId: primaryProject.id,
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
      projectId: primaryProject.id,
      name: "devpulse-demo-devbox",
      repo: "devpulse-demo-project",
      template: "Next.js 15",
      url: "https://ws-demo.devpulse.dev",
      port: 3000,
    },
    create: {
      id: "demo-devbox",
      workspaceId: workspace.id,
      projectId: primaryProject.id,
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
      projectId: primaryProject.id,
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
      projectId: primaryProject.id,
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
        projectId: primaryProject.id,
        key: "DATABASE_URL",
      },
    },
    update: {
      value: "postgresql://localhost:5433/devpulse",
      scope: "Development",
    },
    create: {
      projectId: primaryProject.id,
      key: "DATABASE_URL",
      value: "postgresql://localhost:5433/devpulse",
      scope: "Development",
    },
  });

  let generalChannelId: string | undefined;
  for (const channelSeed of DEMO_CHANNELS) {
    const channel = await db.channel.upsert({
      where: {
        workspaceId_name: {
          workspaceId: workspace.id,
          name: channelSeed.name,
        },
      },
      update: { type: "PUBLIC" },
      create: {
        id: channelSeed.id,
        workspaceId: workspace.id,
        name: channelSeed.name,
        type: "PUBLIC",
      },
    });
    if (channelSeed.id === DEMO_CHANNEL_ID) generalChannelId = channel.id;
  }
  if (!generalChannelId)
    throw new Error("Demo general channel was not created.");

  await db.message.upsert({
    where: { id: "demo-message-welcome" },
    update: {
      channelId: generalChannelId,
      authorId: user.id,
      body: "Welcome to the Devpulse demo workspace!",
    },
    create: {
      id: "demo-message-welcome",
      channelId: generalChannelId,
      authorId: user.id,
      body: "Welcome to the Devpulse demo workspace!",
    },
  });
  console.log("✓ Channels: #general, #development, #announcements");
}

async function verifySeed(): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { slug: DEMO_WORKSPACE_SLUG },
    select: { id: true },
  });
  const [users, workspaces, ownerMemberships, projects, files, channels] =
    await Promise.all([
      db.user.count({ where: { email: DEMO_EMAIL } }),
      db.workspace.count({ where: { slug: DEMO_WORKSPACE_SLUG } }),
      workspace
        ? db.workspaceMember.count({
            where: {
              workspaceId: workspace.id,
              user: { email: DEMO_EMAIL },
              role: "OWNER",
            },
          })
        : Promise.resolve(0),
      workspace
        ? db.project.count({
            where: { id: { in: DEMO_PROJECT_IDS }, workspaceId: workspace.id },
          })
        : Promise.resolve(0),
      workspace
        ? db.file.count({ where: { projectId: { in: DEMO_PROJECT_IDS } } })
        : Promise.resolve(0),
      db.channel.count({ where: { id: { in: DEMO_CHANNEL_IDS } } }),
    ]);

  console.log("\nVerification:");
  console.log(`  users:      ${users}`);
  console.log(`  workspaces: ${workspaces}`);
  console.log(`  OWNER memberships: ${ownerMemberships}`);
  console.log(`  projects:   ${projects}`);
  console.log(`  files:      ${files}`);
  console.log(`  channels:   ${channels}`);

  if (
    users !== 1 ||
    workspaces !== 1 ||
    ownerMemberships !== 1 ||
    projects !== DEMO_PROJECTS.length ||
    files < 4 ||
    channels !== DEMO_CHANNELS.length
  ) {
    throw new Error(
      "Seed verification failed: one or more demo records are missing.",
    );
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
