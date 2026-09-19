export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
}

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
}
