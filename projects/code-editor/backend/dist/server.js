"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
const WORKSPACE_DIR = path_1.default.resolve(__dirname, '../demo_workspace');
// Ensure workspace directory exists
if (!fs_1.default.existsSync(WORKSPACE_DIR)) {
    fs_1.default.mkdirSync(WORKSPACE_DIR, { recursive: true });
}
// Helper: Scan workspace folder recursively
function readDirectoryRecursive(dirPath, relativePath = '') {
    if (!fs_1.default.existsSync(dirPath))
        return [];
    const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
    const nodes = [];
    for (const entry of entries) {
        // Skip hidden files/directories like node_modules or .git
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
        }
        const fullPath = path_1.default.join(dirPath, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const extension = entry.isFile() ? path_1.default.extname(entry.name).slice(1) : undefined;
        if (entry.isDirectory()) {
            nodes.push({
                id: relPath,
                name: entry.name,
                path: relPath,
                type: 'directory',
                children: readDirectoryRecursive(fullPath, relPath),
            });
        }
        else {
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
        if (a.type === b.type)
            return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
    });
}
// Sanitize requested file path against path traversal attacks
function getSanitizedPath(relPath) {
    const normalized = path_1.default.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
    const absolute = path_1.default.join(WORKSPACE_DIR, normalized);
    if (!absolute.startsWith(WORKSPACE_DIR)) {
        return null;
    }
    return absolute;
}
// Routes
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Get file tree
app.get('/api/files', (_req, res) => {
    try {
        const tree = readDirectoryRecursive(WORKSPACE_DIR);
        res.json({ success: true, tree });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Get file content
app.get('/api/files/content', (req, res) => {
    const relPath = req.query.path;
    if (!relPath) {
        return res.status(400).json({ success: false, error: 'Path query param required' });
    }
    const safePath = getSanitizedPath(relPath);
    if (!safePath || !fs_1.default.existsSync(safePath)) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }
    try {
        const content = fs_1.default.readFileSync(safePath, 'utf-8');
        res.json({ success: true, path: relPath, content });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Save file content
app.post('/api/files/save', (req, res) => {
    const { path: relPath, content } = req.body;
    if (!relPath) {
        return res.status(400).json({ success: false, error: 'File path required' });
    }
    const safePath = getSanitizedPath(relPath);
    if (!safePath) {
        return res.status(400).json({ success: false, error: 'Invalid path' });
    }
    try {
        const dir = path_1.default.dirname(safePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(safePath, content || '', 'utf-8');
        res.json({ success: true, message: 'File saved successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Create file or folder
app.post('/api/files/create', (req, res) => {
    const { path: relPath, type } = req.body;
    if (!relPath) {
        return res.status(400).json({ success: false, error: 'Path required' });
    }
    const safePath = getSanitizedPath(relPath);
    if (!safePath) {
        return res.status(400).json({ success: false, error: 'Invalid path' });
    }
    try {
        if (type === 'directory') {
            fs_1.default.mkdirSync(safePath, { recursive: true });
        }
        else {
            const dir = path_1.default.dirname(safePath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            if (!fs_1.default.existsSync(safePath)) {
                fs_1.default.writeFileSync(safePath, '', 'utf-8');
            }
        }
        res.json({ success: true, message: `${type} created successfully` });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Delete file or folder
app.delete('/api/files', (req, res) => {
    const relPath = req.query.path;
    if (!relPath) {
        return res.status(400).json({ success: false, error: 'Path query param required' });
    }
    const safePath = getSanitizedPath(relPath);
    if (!safePath || !fs_1.default.existsSync(safePath)) {
        return res.status(404).json({ success: false, error: 'Path not found' });
    }
    try {
        const stat = fs_1.default.statSync(safePath);
        if (stat.isDirectory()) {
            fs_1.default.rmSync(safePath, { recursive: true, force: true });
        }
        else {
            fs_1.default.unlinkSync(safePath);
        }
        res.json({ success: true, message: 'Deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Execute Code Engine
app.post('/api/execute', (req, res) => {
    const { language, code } = req.body;
    if (!code || code.trim() === '') {
        return res.json({
            success: true,
            output: '[No code provided to execute]',
            executionTimeMs: 0,
            exitCode: 0,
        });
    }
    const startTime = Date.now();
    const tempDir = path_1.default.join(__dirname, '../temp_exec');
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    let command = '';
    let tempFilePath = '';
    const lang = (language || 'javascript').toLowerCase();
    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
        tempFilePath = path_1.default.join(tempDir, `temp_${Date.now()}.js`);
        fs_1.default.writeFileSync(tempFilePath, code, 'utf-8');
        command = `node "${tempFilePath}"`;
    }
    else if (lang === 'python' || lang === 'py') {
        tempFilePath = path_1.default.join(tempDir, `temp_${Date.now()}.py`);
        fs_1.default.writeFileSync(tempFilePath, code, 'utf-8');
        command = `python "${tempFilePath}"`;
    }
    else if (lang === 'html' || lang === 'css') {
        return res.json({
            success: true,
            output: `[HTML/CSS Engine Rendered]\nLength: ${code.length} characters.\nMarkup ready for preview rendering in client iframe.`,
            executionTimeMs: Date.now() - startTime,
            exitCode: 0,
        });
    }
    else if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
        tempFilePath = path_1.default.join(tempDir, `temp_${Date.now()}.cpp`);
        const exePath = path_1.default.join(tempDir, `temp_${Date.now()}.exe`);
        fs_1.default.writeFileSync(tempFilePath, code, 'utf-8');
        command = `g++ "${tempFilePath}" -o "${exePath}" && "${exePath}"`;
    }
    else {
        return res.status(400).json({
            success: false,
            output: '',
            error: `Unsupported execution language: ${language}`,
            executionTimeMs: Date.now() - startTime,
            exitCode: 1,
        });
    }
    // Execute child process with 5 second timeout limit
    (0, child_process_1.exec)(command, { timeout: 5000, cwd: WORKSPACE_DIR }, (error, stdout, stderr) => {
        const executionTimeMs = Date.now() - startTime;
        // Clean up temporary files
        if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
            try {
                fs_1.default.unlinkSync(tempFilePath);
            }
            catch (_) { }
        }
        if (error) {
            const outputMsg = stdout ? `${stdout}\n${stderr || error.message}` : (stderr || error.message);
            return res.json({
                success: false,
                output: outputMsg,
                error: error.message,
                executionTimeMs,
                exitCode: error.code || 1,
            });
        }
        res.json({
            success: true,
            output: stdout || '(Program executed successfully with no output)',
            executionTimeMs,
            exitCode: 0,
        });
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Code Editor Backend running on http://localhost:${PORT}`);
    console.log(`📁 Workspace directory: ${WORKSPACE_DIR}`);
});
