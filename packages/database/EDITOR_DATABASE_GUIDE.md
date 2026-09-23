# Devpulse Editor Database Guide

The editor persistence models are defined in `prisma/schema.prisma` and are compatible with PostgreSQL 15 and Prisma 6.x.

## Migration

Run the migration from the repository root after reviewing the schema:

```bash
pnpm --filter database migrate dev --name "add_editor_ai_execution_models"
```

The package script is also available as:

```bash
corepack pnpm --filter @devpulse/database db:migrate -- --name "add_editor_ai_execution_models"
```

## Enums

- `MessageRole`: `USER` or `ASSISTANT` for AI conversation messages.
- `FileOrigin`: `API`, `LOCAL`, or `NEW` for editor-origin metadata. This is available for application-level editor state and is intentionally not persisted on `File`.

## Cascade behavior

- Deleting a `User` cascades to `AIConversation`, `AIUsage`, and `EditorSession` records. `CodeExecution.user` follows the existing required-user relation behavior.
- Deleting an `AIConversation` cascades to its `AIMessage` records.
- Deleting a `Project` sets `AIConversation.projectId` to `NULL` and cascades to its `EditorSession` records.
- Deleting a `File` sets `AIConversation.fileId` to `NULL` and cascades to its `CodeExecution` records.
- Deleting a `File` cascades to its `FileRevision` records.
- Deleting a `Project` cascades to its files and therefore their revisions and executions.

## Editor performance indexes

- `File`: unique `[projectId, path]`, plus `[projectId]`, `[projectId, path]`, `[projectId, updatedAt]`, and `[projectId, language]`.
- `FileRevision`: unique `[fileId, version]` plus `[fileId, createdAt]`.
- `Message`: `[channelId, createdAt]`.
- `AIConversation`: `[userId, fileId]` and `[projectId, updatedAt]`.
- `AIMessage`: `[conversationId, createdAt]`.
- `AIUsage`: unique `[userId, month, year]` plus `[userId, year, month]`.
- `CodeExecution`: `[fileId, createdAt]` and `[userId, createdAt]`.
- `EditorSession`: unique `[userId, projectId]` plus `[userId, updatedAt]`.

## Prisma query examples

These examples assume `db` is an initialized `PrismaClient` and `fileId`, `projectId`, and `userId` are available.

### a) Get or create an AI conversation for a file

```ts
const conversation = await db.aIConversation.findFirst({
  where: { userId, projectId, fileId },
  orderBy: { updatedAt: "desc" },
});

const activeConversation = conversation ?? await db.aIConversation.create({
  data: {
    userId,
    projectId,
    fileId,
    title: "New conversation",
  },
});
```

### b) Add a message and update the conversation count

```ts
const message = await db.$transaction(async (transaction) => {
  const createdMessage = await transaction.aIMessage.create({
    data: {
      conversationId,
      role: "USER",
      content: prompt,
      command: prompt.startsWith("/") ? prompt.split(/\s+/)[0] : undefined,
    },
  });

  await transaction.aIConversation.update({
    where: { id: conversationId },
    data: { messageCount: { increment: 1 } },
  });

  return createdMessage;
});
```

### c) Increment AI usage for the current month

```ts
const now = new Date();
const usage = await db.aIUsage.upsert({
  where: {
    userId_month_year: {
      userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  },
  create: {
    userId,
    workspaceId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    requestCount: 1,
    tokenCount,
    estimatedCost,
  },
  update: {
    requestCount: { increment: 1 },
    tokenCount: { increment: tokenCount },
    estimatedCost: { increment: estimatedCost },
  },
});
```

### d) Save a code execution result

```ts
const execution = await db.codeExecution.create({
  data: {
    fileId,
    userId,
    language,
    code,
    stdout,
    stderr,
    exitCode,
    durationMs,
    timedOut,
  },
});
```

### e) Save editor session state

```ts
const session = await db.editorSession.upsert({
  where: { userId_projectId: { userId, projectId } },
  create: {
    userId,
    projectId,
    openFileIds,
    activeFileId,
    scrollPositions,
    cursorPositions,
  },
  update: {
    openFileIds,
    activeFileId,
    scrollPositions,
    cursorPositions,
  },
});
```

### f) Restore editor session when a project opens

```ts
const session = await db.editorSession.findUnique({
  where: { userId_projectId: { userId, projectId } },
});

const files = await db.file.findMany({
  where: {
    projectId,
    ...(session ? { id: { in: session.openFileIds } } : {}),
  },
  orderBy: { path: "asc" },
});
```

### g) Get the last 20 AI messages for a file

```ts
const messages = await db.aIMessage.findMany({
  where: {
    conversation: { fileId, userId },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});
```

### h) Get user AI usage for the current month

```ts
const now = new Date();
const usage = await db.aIUsage.findUnique({
  where: {
    userId_month_year: {
      userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  },
});
```
