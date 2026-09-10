export interface FileNode {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    content?: string;
    extension?: string;
}
export interface EditorTab {
    id: string;
    name: string;
    path: string;
    language: string;
    content: string;
    isDirty: boolean;
}
export interface ExecutionRequest {
    language: string;
    code: string;
    filePath?: string;
}
export interface ExecutionResponse {
    success: boolean;
    output: string;
    error?: string;
    executionTimeMs: number;
    exitCode: number | null;
}
export interface CreateFileRequest {
    path: string;
    type: 'file' | 'directory';
    content?: string;
}
export interface SaveFileRequest {
    path: string;
    content: string;
}
export * from "./chat";
