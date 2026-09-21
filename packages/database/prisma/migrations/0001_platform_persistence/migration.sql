CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'GUEST');
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT');

CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT, "avatarUrl" TEXT, "passwordHash" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Workspace" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "plan" "Plan" NOT NULL DEFAULT 'FREE', "ownerId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id"));
CREATE TABLE "WorkspaceMember" ("workspaceId" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER', "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId"));
CREATE TABLE "Project" ("id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL, "defaultBranch" TEXT NOT NULL DEFAULT 'main', "description" TEXT NOT NULL DEFAULT '', "language" TEXT NOT NULL DEFAULT 'TypeScript', "stars" INTEGER NOT NULL DEFAULT 0, "forks" INTEGER NOT NULL DEFAULT 0, "isStarred" BOOLEAN NOT NULL DEFAULT false, "deployStatus" TEXT NOT NULL DEFAULT 'none', "devboxReady" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Project_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Devbox" ("id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "projectId" TEXT, "name" TEXT NOT NULL, "repo" TEXT NOT NULL, "branch" TEXT NOT NULL DEFAULT 'main', "template" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Running', "uptime" TEXT NOT NULL DEFAULT '1m', "vCpu" INTEGER NOT NULL DEFAULT 8, "ram" TEXT NOT NULL DEFAULT '32 GB ECC', "storage" TEXT NOT NULL DEFAULT '100 GB NVMe', "port" INTEGER NOT NULL DEFAULT 3000, "url" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Devbox_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Deployment" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "target" TEXT NOT NULL, "domain" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'Building', "branch" TEXT NOT NULL DEFAULT 'main', "commitHash" TEXT NOT NULL, "commitMessage" TEXT NOT NULL, "author" TEXT NOT NULL, "timestamp" TEXT NOT NULL, "duration" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "EnvironmentVariable" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "key" TEXT NOT NULL, "value" TEXT NOT NULL, "scope" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "EnvironmentVariable_pkey" PRIMARY KEY ("id"));
CREATE TABLE "File" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "path" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '', "language" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "File_pkey" PRIMARY KEY ("id"));
CREATE TABLE "FileRevision" ("id" TEXT NOT NULL, "fileId" TEXT NOT NULL, "version" INTEGER NOT NULL, "content" TEXT NOT NULL, "authorId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FileRevision_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Channel" ("id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Channel_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Message" ("id" TEXT NOT NULL, "channelId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "editedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3), CONSTRAINT "Message_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
CREATE INDEX "Devbox_workspaceId_idx" ON "Devbox"("workspaceId");
CREATE INDEX "Devbox_projectId_idx" ON "Devbox"("projectId");
CREATE INDEX "Deployment_projectId_idx" ON "Deployment"("projectId");
CREATE INDEX "EnvironmentVariable_projectId_idx" ON "EnvironmentVariable"("projectId");
CREATE UNIQUE INDEX "EnvironmentVariable_projectId_key_key" ON "EnvironmentVariable"("projectId", "key");
CREATE INDEX "File_projectId_idx" ON "File"("projectId");
CREATE UNIQUE INDEX "File_projectId_path_key" ON "File"("projectId", "path");
CREATE UNIQUE INDEX "FileRevision_fileId_version_key" ON "FileRevision"("fileId", "version");
CREATE INDEX "Channel_workspaceId_idx" ON "Channel"("workspaceId");
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Devbox" ADD CONSTRAINT "Devbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Devbox" ADD CONSTRAINT "Devbox_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnvironmentVariable" ADD CONSTRAINT "EnvironmentVariable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FileRevision" ADD CONSTRAINT "FileRevision_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
