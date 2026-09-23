-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "FileOrigin" AS ENUM ('API', 'LOCAL', 'NEW');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedById" TEXT,
ADD COLUMN     "sizeBytes" INTEGER;

-- AlterTable
ALTER TABLE "FileRevision" ADD COLUMN     "aiMessageId" TEXT,
ADD COLUMN     "appliedFromAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "charCount" INTEGER,
ADD COLUMN     "diffPatch" TEXT,
ADD COLUMN     "lineCount" INTEGER;

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "fileId" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "command" TEXT,
    "tokensUsed" INTEGER,
    "responseTimeMs" INTEGER,
    "hasCode" BOOLEAN NOT NULL DEFAULT false,
    "codeLanguage" TEXT,
    "appliedToFileId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeExecution" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stdout" TEXT,
    "stderr" TEXT,
    "exitCode" INTEGER,
    "durationMs" INTEGER,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "openFileIds" TEXT[],
    "activeFileId" TEXT,
    "scrollPositions" JSONB,
    "cursorPositions" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIConversation_userId_fileId_idx" ON "AIConversation"("userId", "fileId");

-- CreateIndex
CREATE INDEX "AIConversation_projectId_updatedAt_idx" ON "AIConversation"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsage_userId_year_month_idx" ON "AIUsage"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsage_userId_month_year_key" ON "AIUsage"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "CodeExecution_fileId_createdAt_idx" ON "CodeExecution"("fileId", "createdAt");

-- CreateIndex
CREATE INDEX "CodeExecution_userId_createdAt_idx" ON "CodeExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EditorSession_userId_updatedAt_idx" ON "EditorSession"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EditorSession_userId_projectId_key" ON "EditorSession"("userId", "projectId");

-- CreateIndex
CREATE INDEX "File_projectId_path_idx" ON "File"("projectId", "path");

-- CreateIndex
CREATE INDEX "File_projectId_updatedAt_idx" ON "File"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "File_projectId_language_idx" ON "File"("projectId", "language");

-- CreateIndex
CREATE INDEX "FileRevision_fileId_createdAt_idx" ON "FileRevision"("fileId", "createdAt");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeExecution" ADD CONSTRAINT "CodeExecution_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeExecution" ADD CONSTRAINT "CodeExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorSession" ADD CONSTRAINT "EditorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorSession" ADD CONSTRAINT "EditorSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
