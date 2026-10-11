import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  primaryKey,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("Plan", ["FREE", "PRO", "ENTERPRISE"]);
export const workspaceRoleEnum = pgEnum("WorkspaceRole", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "GUEST",
]);
export const channelTypeEnum = pgEnum("ChannelType", [
  "PUBLIC",
  "PRIVATE",
  "DIRECT",
]);
export const aiMessageRoleEnum = pgEnum("AIMessageRole", ["USER", "ASSISTANT"]);

export const users = pgTable("User", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatarUrl"),
  passwordHash: text("passwordHash"),
  createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
});

export const workspaces = pgTable(
  "Workspace",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    plan: planEnum("plan").notNull().default("FREE"),
    ownerId: text("ownerId")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [index("Workspace_ownerId_idx").on(table.ownerId)],
);

export const workspaceMembers = pgTable(
  "WorkspaceMember",
  {
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("MEMBER"),
    joinedAt: timestamp("joinedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("WorkspaceMember_userId_idx").on(table.userId),
  ],
);

export const projects = pgTable(
  "Project",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    template: text("template").notNull().default("blank"),
    defaultBranch: text("defaultBranch").notNull().default("main"),
    description: text("description").notNull().default(""),
    isPrivate: boolean("isPrivate").notNull().default(false),
    language: text("language").notNull().default("TypeScript"),
    stars: integer("stars").notNull().default(0),
    forks: integer("forks").notNull().default(0),
    isStarred: boolean("isStarred").notNull().default(false),
    deployStatus: text("deployStatus").notNull().default("none"),
    devboxReady: boolean("devboxReady").notNull().default(true),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index("Project_workspaceId_idx").on(table.workspaceId),
    unique("Project_workspaceId_name_key").on(table.workspaceId, table.name),
  ],
);

export const files = pgTable(
  "File",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull().default(""),
    language: text("language"),
    sizeBytes: integer("sizeBytes"),
    lastEditedById: text("lastEditedById").references(() => users.id),
    lastEditedAt: timestamp("lastEditedAt", { precision: 3 }),
    version: integer("version").notNull().default(1),
    lockedBy: text("lockedBy"),
    lockedAt: timestamp("lockedAt", { precision: 3 }),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    unique("File_projectId_path_key").on(table.projectId, table.path),
    index("File_projectId_idx").on(table.projectId),
    index("File_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
    index("File_projectId_language_idx").on(table.projectId, table.language),
  ],
);

export const fileRevisions = pgTable(
  "FileRevision",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    fileId: text("fileId")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    authorId: text("authorId"),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    appliedFromAI: boolean("appliedFromAI").notNull().default(false),
    aiMessageId: text("aiMessageId"),
    lineCount: integer("lineCount"),
    charCount: integer("charCount"),
    diffPatch: text("diffPatch"),
  },
  (table) => [
    unique("FileRevision_fileId_version_key").on(table.fileId, table.version),
    index("FileRevision_fileId_createdAt_idx").on(table.fileId, table.createdAt),
  ],
);

export const channels = pgTable(
  "Channel",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: channelTypeEnum("type").notNull().default("PUBLIC"),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index("Channel_workspaceId_idx").on(table.workspaceId),
    unique("Channel_workspaceId_name_key").on(table.workspaceId, table.name),
  ],
);

export const messages = pgTable(
  "Message",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    channelId: text("channelId")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: text("authorId")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    editedAt: timestamp("editedAt", { precision: 3 }),
    deletedAt: timestamp("deletedAt", { precision: 3 }),
  },
  (table) => [index("Message_channelId_createdAt_idx").on(table.channelId, table.createdAt)],
);

export const aiConversations = pgTable(
  "AIConversation",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull().default("New conversation"),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
    fileId: text("fileId").references(() => files.id, { onDelete: "set null" }),
    model: text("model").notNull().default("claude-sonnet-4-6"),
    messageCount: integer("messageCount").notNull().default(0),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index("AIConversation_userId_fileId_idx").on(table.userId, table.fileId),
    index("AIConversation_projectId_updatedAt_idx").on(table.projectId, table.updatedAt),
  ],
);

export const aiMessages = pgTable(
  "AIMessage",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    command: text("command"),
    tokensUsed: integer("tokensUsed"),
    responseTimeMs: integer("responseTimeMs"),
    hasCode: boolean("hasCode").notNull().default(false),
    codeLanguage: text("codeLanguage"),
    appliedToFileId: text("appliedToFileId"),
    appliedAt: timestamp("appliedAt", { precision: 3 }),
    createdAt: timestamp("createdAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    index("AIMessage_conversationId_createdAt_idx").on(table.conversationId, table.createdAt),
  ],
);

export const aiUsage = pgTable(
  "AIUsage",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspaceId"),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    requestCount: integer("requestCount").notNull().default(0),
    tokenCount: integer("tokenCount").notNull().default(0),
    estimatedCost: doublePrecision("estimatedCost").notNull().default(0),
    updatedAt: timestamp("updatedAt", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    unique("AIUsage_userId_month_year_key").on(table.userId, table.month, table.year),
    index("AIUsage_userId_year_month_idx").on(table.userId, table.year, table.month),
  ],
);

export const schema = {
  users,
  workspaces,
  workspaceMembers,
  projects,
  files,
  fileRevisions,
  channels,
  messages,
  aiConversations,
  aiMessages,
  aiUsage,
};

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectFile = typeof files.$inferSelect;
export type FileRevision = typeof fileRevisions.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AIConversation = typeof aiConversations.$inferSelect;
export type AIMessage = typeof aiMessages.$inferSelect;
export type AIUsage = typeof aiUsage.$inferSelect;
