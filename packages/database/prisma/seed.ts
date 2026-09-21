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
  await db.project.upsert({
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
