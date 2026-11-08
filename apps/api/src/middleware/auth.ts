import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { db } from "@devpulse/database";
import { verifyToken } from "../lib/jwt.js";

export interface AuthUser {
  id: string;
  email: string;
  workspaceId: string;
}

interface AccessibleProject {
  id: string;
  workspaceId: string;
}

interface AccessibleFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  language: string | null;
  sizeBytes: number | null;
  version: number;
  updatedAt: Date;
  lastEditedBy: { id: string; name: string | null } | null;
  lastEditedAt: Date | null;
  project: AccessibleProject;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    project?: AccessibleProject;
    fileRecord?: AccessibleFile;
  }
}

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

const roleRank: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  GUEST: 1,
};

function isWorkspaceRole(role: string): role is WorkspaceRole {
  return Object.hasOwn(roleRank, role);
}

const publicV1Routes = [
  /^\/v1\/auth\/logout$/,
  /^\/v1\/auth\/[^/]+\/(?:start|callback)$/,
  /^\/v1\/plans(?:\/[^/]+)?$/,
];

export function isPublicV1Route(path: string): boolean {
  const pathname = path.split("?", 1)[0] ?? "";
  return publicV1Routes.some((pattern) => pattern.test(pathname));
}

export const requireAuth: RequestHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (isPublicV1Route(request.originalUrl)) {
    next();
    return;
  }

  const token = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    response.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const payload = await verifyToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
      workspaceId: payload.workspaceId,
    };
    next();
  } catch {
    response.status(401).json({ error: "UNAUTHORIZED" });
  }
};

export class WorkspaceMembershipError extends Error {
  constructor() {
    super("Workspace membership required");
    this.name = "WorkspaceMembershipError";
  }
}

export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
  minRole?: WorkspaceRole,
): Promise<void> {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  const role: unknown = membership?.role;
  if (
    !membership ||
    typeof role !== "string" ||
    !isWorkspaceRole(role) ||
    (minRole && roleRank[role] < roleRank[minRole])
  ) {
    throw new WorkspaceMembershipError();
  }
}

export const loadProjectForUser: RequestHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const project = await db.project.findUnique({
      where: { id: request.params.projectId },
    });
    if (!project) {
      response.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      await assertWorkspaceMember(request.user!.id, project.workspaceId);
    } catch (error) {
      if (error instanceof WorkspaceMembershipError) {
        response.status(404).json({ error: "Project not found" });
        return;
      }
      throw error;
    }

    request.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

export const loadFileForUser: RequestHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const file = await db.file.findUnique({
      where: { id: request.params.fileId },
      include: {
        project: true,
        lastEditedBy: { select: { id: true, name: true } },
      },
    });
    if (!file || (request.project && file.projectId !== request.project.id)) {
      response.status(404).json({ error: "File not found" });
      return;
    }

    try {
      await assertWorkspaceMember(request.user!.id, file.project.workspaceId);
    } catch (error) {
      if (error instanceof WorkspaceMembershipError) {
        response.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }

    request.fileRecord = file;
    next();
  } catch (error) {
    next(error);
  }
};

export async function findFileForUser(
  fileId: string,
  userId: string,
): Promise<AccessibleFile | null> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    include: {
      project: true,
      lastEditedBy: { select: { id: true, name: true } },
    },
  });
  if (!file) return null;

  try {
    await assertWorkspaceMember(userId, file.project.workspaceId);
  } catch (error) {
    if (error instanceof WorkspaceMembershipError) return null;
    throw error;
  }

  return file;
}

export const handleWorkspaceMembershipError: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (error instanceof WorkspaceMembershipError) {
    response.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  next(error);
};
