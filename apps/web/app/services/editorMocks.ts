export interface EditorRunRequest {
  path: string;
  language: string;
  code: string;
}

export interface EditorRunResult {
  ok: boolean;
  exitCode: number;
  output: string;
}

export interface AssistantRequest {
  prompt: string;
  projectName: string;
  activePath: string | null;
  code: string;
}

export interface AssistantReply {
  text: string;
  code?: string;
}

export interface TerminalReconnectResult {
  connected: boolean;
  message: string;
}

export interface SaveEditorPreviewRequest {
  path: string;
  content: string;
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

// TODO: Replace this preview adapter with the authenticated execution API.
export const runEditorPreview = async (
  request: EditorRunRequest,
): Promise<EditorRunResult> => {
  await wait(450);
  return {
    ok: true,
    exitCode: 0,
    output: `Preview only: ${request.path} (${request.language}, ${request.code.length} characters).\nConnect the execution service to run this file.`,
  };
};

// TODO: Replace this deterministic UI response with the assistant API adapter.
export const sendAssistantPreview = async (
  request: AssistantRequest,
): Promise<AssistantReply> => {
  await wait(700);
  return {
    text: `Assistant preview received your request for ${request.activePath || "the workspace"}. Connect the AI service to generate a response.`,
  };
};

// TODO: Replace with the workspace file persistence API.
export const saveEditorPreview = async (
  _request: SaveEditorPreviewRequest,
): Promise<{ saved: true }> => {
  await wait(160);
  return { saved: true };
};

// TODO: Replace with a terminal session create/reconnect request when a backend exists.
export const reconnectTerminalPreview =
  async (): Promise<TerminalReconnectResult> => {
    await wait(500);
    return {
      connected: false,
      message: "Shell service is not connected yet.",
    };
  };
