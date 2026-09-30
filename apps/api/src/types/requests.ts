export interface AiApplyRequest {
  fileId: string;
  code: string;
  language: string;
  range?: {
    startLine: number;
    endLine: number;
  };
  aiMessageId?: string;
  expectedVersion: number;
}

export interface AiChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  command?: string;
  context?: {
    fileName?: string;
    language?: string;
    selectedCode?: string;
    surroundingCode?: string;
    projectName?: string;
    recentErrors?: string[];
  };
  fileId?: string;
  projectId?: string;
}