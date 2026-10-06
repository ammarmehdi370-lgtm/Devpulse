# Editor preview adapters

The editor's backend-dependent UI actions are routed through `editorMocks.ts`.
Replace these functions with typed API adapters while keeping the components and
their event contracts unchanged:

| Adapter | Current preview result | Backend connection point |
| --- | --- | --- |
| `runEditorPreview({ path, language, code })` | Returns a successful preview-only result and explains that execution is not connected. | Replace with the isolated execution API; return `EditorRunResult`. |
| `sendAssistantPreview({ prompt, projectName, activePath, code })` | Returns a clearly labeled assistant-preview response. | Replace with the AI chat API; return `AssistantReply`. |
| `saveEditorPreview({ path, content })` | Acknowledges a preview save; the editor updates its local saved snapshot. | Replace with workspace persistence; preserve the `{ saved: true }`-shaped result or adapt the interface deliberately. |
| `reconnectTerminalPreview()` | Returns `connected: false` and a user-facing disconnected message. | Replace with terminal session create/reconnect and stream events to the xterm panel. |

TODO comments in the adapter identify each replacement seam. Local file and
folder picking continues to use the browser File System Access API when the user
explicitly chooses a local file or folder; it does not require a server.
