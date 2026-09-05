import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { FileNode, ExecutionRequest, ExecutionResponse, SaveFileRequest, CreateFileRequest } from '@devpulse/shared-types';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const WORKSPACE_DIR = path.resolve(__dirname, '../demo_workspace');

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Helper: Scan workspace folder recursively
function readDirectoryRecursive(dirPath: string, relativePath = ''): FileNode[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip hidden files/directories like node_modules or .git
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const extension = entry.isFile() ? path.extname(entry.name).slice(1) : undefined;

    if (entry.isDirectory()) {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'directory',
        children: readDirectoryRecursive(fullPath, relPath),
      });
    } else {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'file',
        extension,
      });
    }
  }

  // Sort directories first, then files alphabetically
  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });
}

// Sanitize requested file path against path traversal attacks
function getSanitizedPath(relPath: string): string | null {
  const normalized = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const absolute = path.join(WORKSPACE_DIR, normalized);
  if (!absolute.startsWith(WORKSPACE_DIR)) {
    return null;
  }
  return absolute;
}

// Routes

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get file tree
app.get('/api/files', (_req: Request, res: Response) => {
  try {
    const tree = readDirectoryRecursive(WORKSPACE_DIR);
    res.json({ success: true, tree });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get file content
app.get('/api/files/content', (req: Request, res: Response) => {
  const relPath = req.query.path as string;
  if (!relPath) {
    return res.status(400).json({ success: false, error: 'Path query param required' });
  }

  const safePath = getSanitizedPath(relPath);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  try {
    const content = fs.readFileSync(safePath, 'utf-8');
    res.json({ success: true, path: relPath, content });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save file content
app.post('/api/files/save', (req: Request, res: Response) => {
  const { path: relPath, content } = req.body as SaveFileRequest;
  if (!relPath) {
    return res.status(400).json({ success: false, error: 'File path required' });
  }

  const safePath = getSanitizedPath(relPath);
  if (!safePath) {
    return res.status(400).json({ success: false, error: 'Invalid path' });
  }

  try {
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, content || '', 'utf-8');
    res.json({ success: true, message: 'File saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create file or folder
app.post('/api/files/create', (req: Request, res: Response) => {
  const { path: relPath, type } = req.body as CreateFileRequest;
  if (!relPath) {
    return res.status(400).json({ success: false, error: 'Path required' });
  }

  const safePath = getSanitizedPath(relPath);
  if (!safePath) {
    return res.status(400).json({ success: false, error: 'Invalid path' });
  }

  try {
    if (type === 'directory') {
      fs.mkdirSync(safePath, { recursive: true });
    } else {
      const dir = path.dirname(safePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(safePath)) {
        fs.writeFileSync(safePath, '', 'utf-8');
      }
    }
    res.json({ success: true, message: `${type} created successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete file or folder
app.delete('/api/files', (req: Request, res: Response) => {
  const relPath = req.query.path as string;
  if (!relPath) {
    return res.status(400).json({ success: false, error: 'Path query param required' });
  }

  const safePath = getSanitizedPath(relPath);
  if (!safePath || !fs.existsSync(safePath)) {
    return res.status(404).json({ success: false, error: 'Path not found' });
  }

  try {
    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      fs.rmSync(safePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(safePath);
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Execute Code Engine
app.post('/api/execute', (req: Request, res: Response) => {
  const { language, code } = req.body as ExecutionRequest;

  if (!code || code.trim() === '') {
    return res.json({
      success: true,
      output: '[No code provided to execute]',
      executionTimeMs: 0,
      exitCode: 0,
    } as ExecutionResponse);
  }

  const startTime = Date.now();
  const tempDir = path.join(__dirname, '../temp_exec');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let command = '';
  let tempFilePath = '';

  const lang = (language || 'javascript').toLowerCase();

  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    tempFilePath = path.join(tempDir, `temp_${Date.now()}.js`);
    fs.writeFileSync(tempFilePath, code, 'utf-8');
    command = `node "${tempFilePath}"`;
  } else if (lang === 'python' || lang === 'py') {
    tempFilePath = path.join(tempDir, `temp_${Date.now()}.py`);
    fs.writeFileSync(tempFilePath, code, 'utf-8');
    command = `python "${tempFilePath}"`;
  } else if (lang === 'html' || lang === 'css') {
    return res.json({
      success: true,
      output: `[HTML/CSS Engine Rendered]\nLength: ${code.length} characters.\nMarkup ready for preview rendering in client iframe.`,
      executionTimeMs: Date.now() - startTime,
      exitCode: 0,
    } as ExecutionResponse);
  } else if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
    tempFilePath = path.join(tempDir, `temp_${Date.now()}.cpp`);
    const exePath = path.join(tempDir, `temp_${Date.now()}.exe`);
    fs.writeFileSync(tempFilePath, code, 'utf-8');
    command = `g++ "${tempFilePath}" -o "${exePath}" && "${exePath}"`;
  } else {
    return res.status(400).json({
      success: false,
      output: '',
      error: `Unsupported execution language: ${language}`,
      executionTimeMs: Date.now() - startTime,
      exitCode: 1,
    } as ExecutionResponse);
  }

  // Execute child process with 5 second timeout limit
  exec(command, { timeout: 5000, cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
    const executionTimeMs = Date.now() - startTime;

    // Clean up temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }

    if (error) {
      const outputMsg = stdout ? `${stdout}\n${stderr || error.message}` : (stderr || error.message);
      return res.json({
        success: false,
        output: outputMsg,
        error: error.message,
        executionTimeMs,
        exitCode: error.code || 1,
      } as ExecutionResponse);
    }

    res.json({
      success: true,
      output: stdout || '(Program executed successfully with no output)',
      executionTimeMs,
      exitCode: 0,
    } as ExecutionResponse);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Code Editor Backend running on http://localhost:${PORT}`);
  console.log(`📁 Workspace directory: ${WORKSPACE_DIR}`);
});
