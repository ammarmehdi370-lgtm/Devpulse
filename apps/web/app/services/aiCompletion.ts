export interface AICompletionRequest {
  language: string;
  linePrefix: string;
}

export interface AICompletion {
  insertText: string;
}

// TODO: Send this request to the AI completion backend and honor cancellation.
export const getAIInlineCompletion = async ({
  language: _language,
  linePrefix,
}: AICompletionRequest): Promise<AICompletion | null> => {
  if (!/(?:\/\/|#)\s*ai:\s*$/i.test(linePrefix)) return null;

  return { insertText: "AI completion preview" };
};
