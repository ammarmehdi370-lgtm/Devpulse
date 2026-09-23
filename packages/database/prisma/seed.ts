import { db } from "../src/index.js";

async function main(): Promise<void> {
  const user = await db.user.upsert({
    where: { email: "demo@devpulse.local" },
    update: {},
    create: { email: "demo@devpulse.local", name: "Devpulse Demo" },
  });
  const workspace = await db.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo",
      ownerId: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  const project = await db.project.upsert({
    where: { id: "demo-project" },
    update: {},
    create: {
      id: "demo-project",
      name: "Devpulse Demo Project",
      workspaceId: workspace.id,
      description: "Persistent Devpulse demo repository",
      language: "TypeScript",
      stars: 12,
      forks: 3,
      isStarred: true,
      deployStatus: "live",
      files: {
        create: [
          {
            path: "README.md",
            language: "markdown",
            content: "# Devpulse Demo\n",
            revisions: { create: { version: 1, content: "# Devpulse Demo\n" } },
          },
          {
            path: "main.py",
            language: "python",
            content: 'print("Hello from Devpulse")\n',
            revisions: {
              create: { version: 1, content: 'print("Hello from Devpulse")\n' },
            },
          },
        ],
      },
    },
  });
  const files = await db.file.findMany({
    where: { projectId: project.id },
    orderBy: { path: "asc" },
  });
  const primaryFile = files[0];
  if (!primaryFile) throw new Error("Demo project has no files");

  const conversationSeeds = [
    { id: "demo-ai-conversation-1", title: "Improve editor startup", fileId: primaryFile.id },
    { id: "demo-ai-conversation-2", title: "Explain the active file", fileId: files[1]?.id ?? primaryFile.id },
  ];
  for (const conversationSeed of conversationSeeds) {
    const conversation = await db.aIConversation.upsert({
      where: { id: conversationSeed.id },
      update: {
        title: conversationSeed.title,
        projectId: project.id,
        fileId: conversationSeed.fileId,
        model: "claude-sonnet-4-6",
        messageCount: 5,
      },
      create: {
        id: conversationSeed.id,
        title: conversationSeed.title,
        userId: user.id,
        projectId: project.id,
        fileId: conversationSeed.fileId,
        model: "claude-sonnet-4-6",
        messageCount: 5,
      },
    });
    for (let index = 1; index <= 5; index += 1) {
      const isUser = index % 2 === 1;
      await db.aIMessage.upsert({
        where: { id: `${conversationSeed.id}-message-${index}` },
        update: {
          conversationId: conversation.id,
          role: isUser ? "USER" : "ASSISTANT",
          content: isUser
            ? `Please review ${conversationSeed.title.toLowerCase()}.`
            : `Review ${index}: the requested editor guidance is ready.`,
          command: isUser ? (index === 1 ? "/explain" : "/fix") : null,
          hasCode: !isUser,
          codeLanguage: !isUser ? "typescript" : null,
        },
        create: {
          id: `${conversationSeed.id}-message-${index}`,
          conversationId: conversation.id,
          role: isUser ? "USER" : "ASSISTANT",
          content: isUser
            ? `Please review ${conversationSeed.title.toLowerCase()}.`
            : `Review ${index}: the requested editor guidance is ready.`,
          command: isUser ? (index === 1 ? "/explain" : "/fix") : null,
          tokensUsed: isUser ? 18 : 64,
          responseTimeMs: isUser ? null : 420,
          hasCode: !isUser,
          codeLanguage: !isUser ? "typescript" : null,
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
    update: { requestCount: 10, tokenCount: 410, estimatedCost: 0.0123, workspaceId: workspace.id },
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

  for (let index = 0; index < 3; index += 1) {
    const file = files[index % files.length]!;
    await db.codeExecution.upsert({
      where: { id: `demo-execution-${index + 1}` },
      update: {
        fileId: file.id,
        userId: user.id,
        language: file.language || "javascript",
        code: file.content,
        stdout: index === 0 ? "Devpulse execution succeeded\n" : `Execution ${index + 1} completed\n`,
        stderr: null,
        exitCode: 0,
        durationMs: 120 + index * 37,
        timedOut: false,
      },
      create: {
        id: `demo-execution-${index + 1}`,
        fileId: file.id,
        userId: user.id,
        language: file.language || "javascript",
        code: file.content,
        stdout: index === 0 ? "Devpulse execution succeeded\n" : `Execution ${index + 1} completed\n`,
        exitCode: 0,
        durationMs: 120 + index * 37,
      },
    });
  }

  await db.editorSession.upsert({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
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
    update: {},
    create: {
      id: "demo-devbox",
      workspaceId: workspace.id,
      projectId: "demo-project",
      name: "devpulse-demo-devbox",
      repo: "devpulse-demo-project",
      template: "Next.js 15",
      url: "https://ws-demo.devpulse.dev",
      port: 3000,
    },
  });
  await db.deployment.upsert({
    where: { id: "demo-deployment" },
    update: {},
    create: {
      id: "demo-deployment",
      projectId: "demo-project",
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
      projectId_key: { projectId: "demo-project", key: "DATABASE_URL" },
    },
    update: {},
    create: {
      projectId: "demo-project",
      key: "DATABASE_URL",
      value: "postgresql://localhost:5432/devpulse",
      scope: "Development",
    },
  });
}

main().finally(() => db.$disconnect());
