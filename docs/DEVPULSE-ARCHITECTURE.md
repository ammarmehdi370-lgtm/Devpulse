# DevPulse Architecture and Development Handbook

DevPulse is an all-in-one developer workspace combining a browser code editor, AI assistance, team communication, and remote collaboration.

This document is the canonical technical plan for the repository. It distinguishes the current repository from the target production architecture so that setup instructions remain honest while the product is being built.

## 1. Product Scope

### Core features

1. VS Code-style browser editor powered by Monaco Editor.
2. AI coding assistant powered by the Anthropic Claude API.
3. Team communication with channels, direct messages, presence, and notifications.
4. Remote collaboration with shared editing, cursors, and screen sharing.

### Product name

- Display name: `DevPulse`
- npm/package name: `devpulse`
- Internal package scope: `@devpulse/*`

## 2. Current Repository

The repository currently contains:

- A Next.js application under `src/app`.
- Root npm workspace configuration.
- A shared TypeScript package under `packages/shared-types`.
- Reserved editor workspaces under `projects/code-editor/frontend` and `projects/code-editor/backend`.
- PostgreSQL, JWT, email verification, and local development settings documented in `INSTALLATION.md`.

The target structure below is the recommended destination. Existing paths may be migrated incrementally; do not move working code solely for naming consistency.

## 3. Target Folder Structure

```text
Devpulse/
├── apps/
│   ├── web/                              # Next.js browser application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/               # Login, registration, OAuth callback UI
│   │   │   │   ├── (dashboard)/          # Authenticated product routes
│   │   │   │   │   ├── workspace/[id]/   # Editor workspace
│   │   │   │   │   ├── chat/             # Team chat
│   │   │   │   │   └── settings/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── editor/               # Monaco, tabs, tree, status bar
│   │   │   │   ├── chat/                 # Channels and messages
│   │   │   │   ├── collaboration/        # Cursors, presence, screen share
│   │   │   │   └── ui/                   # Reusable visual primitives
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── socket.ts
│   │   │   └── stores/                   # Zustand client state
│   │   └── package.json
│   │
│   └── api/                              # Express and Socket.io server
│       ├── src/
│       │   ├── config/                   # Environment and service configuration
│       │   ├── controllers/              # HTTP request orchestration
│       │   ├── middleware/               # Auth, validation, errors, rate limits
│       │   ├── routes/                   # REST route declarations
│       │   ├── services/                 # Business logic and external APIs
│       │   ├── sockets/
│       │   │   ├── chat.socket.ts
│       │   │   ├── editor.socket.ts
│       │   │   └── signaling.socket.ts  # WebRTC offer/answer/ICE
│       │   ├── app.ts
│       │   └── server.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── package.json
│
├── packages/
│   ├── shared-types/                     # Shared request/event/domain types
│   ├── validation/                       # Shared Zod schemas
│   └── config/                           # Shared non-secret constants
│
├── docs/
│   └── DEVPULSE-ARCHITECTURE.md
├── public/
├── .env.example
├── docker-compose.yml                    # Local PostgreSQL and Redis, if needed
├── package.json
└── tsconfig.json
```

## 4. Technology Decisions

| Area | Technology | Responsibility |
| --- | --- | --- |
| Browser UI | React, Next.js, TypeScript | Routing, rendering, client application shell |
| Styling | Tailwind CSS | Layout, tokens, responsive UI |
| Code editor | `monaco-editor`, `@monaco-editor/react` | Editing, syntax highlighting, IntelliSense, folding |
| Client state | Zustand | Tabs, open files, editor preferences, optimistic UI |
| HTTP API | Node.js, Express, TypeScript | Authentication, workspaces, files, messages, AI requests |
| Database | PostgreSQL, Prisma | Durable users, workspaces, files, messages, permissions |
| Validation | Zod | Runtime validation at API and client boundaries |
| Authentication | JWT plus Google OAuth | Short-lived access tokens and OAuth login |
| Realtime events | Socket.io | Chat, presence, notifications, WebRTC signaling |
| Shared editing | Yjs and `y-monaco` | Conflict-free collaborative document state |
| Screen sharing | WebRTC | Peer media transport; never send video through Socket.io |
| AI | Anthropic Claude API | Code explanations, edits, debugging, generation |
| File storage | S3-compatible object storage | Large uploads, snapshots, and workspace assets |
| Frontend hosting | Vercel | Next.js application and static assets |
| Backend hosting | Railway | Express API, Socket.io, database connection |
| Database hosting | Railway PostgreSQL or managed PostgreSQL | Production relational database |

## 5. Runtime Architecture

```text
Browser
  ├── Next.js UI on Vercel
  ├── Monaco Editor
  ├── Socket.io client
  └── WebRTC peer connection
          │
          ├── HTTPS REST ───────────────> Express API on Railway
          │                                  ├── JWT/OAuth
          │                                  ├── Prisma
          │                                  ├── Claude API
          │                                  └── S3-compatible storage
          │
          ├── Socket.io ─────────────────> Realtime event server
          │                                  ├── Chat
          │                                  ├── Presence
          │                                  ├── Collaboration signaling
          │                                  └── Redis adapter when scaled
          │
          └── WebRTC media/data ─────────> Other collaborators
```

### Important boundaries

- The browser never receives `ANTHROPIC_API_KEY`, database credentials, or JWT signing secrets.
- The API authorizes every workspace, file, channel, and collaboration-room action.
- PostgreSQL is the source of truth for durable data.
- Socket.io carries events, not durable message history or screen-share media.
- Yjs owns concurrent document updates; the API persists snapshots or file content at controlled checkpoints.

## 6. Recommended Data Model

Core Prisma entities:

```text
User
  id, email, name, avatarUrl, googleId, createdAt

Workspace
  id, name, ownerId, createdAt

WorkspaceMember
  workspaceId, userId, role

ProjectFile
  id, workspaceId, path, type, language, content, version, updatedById, updatedAt

Channel
  id, workspaceId, name, isPrivate, createdAt

ChannelMember
  channelId, userId

Message
  id, channelId, authorId, body, createdAt, editedAt

RefreshToken
  id, userId, tokenHash, expiresAt, revokedAt

AiConversation
  id, workspaceId, userId, title, createdAt

AiMessage
  id, conversationId, role, content, createdAt
```

Use composite unique constraints for membership tables, such as `(workspaceId, userId)`. Store refresh-token hashes, not raw refresh tokens.

## 7. HTTP API Contract

Base URL: `http://localhost:5000/api` in development.

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/google
GET  /auth/google/callback
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### Workspaces and files

```text
GET    /workspaces
POST   /workspaces
GET    /workspaces/:workspaceId
GET    /workspaces/:workspaceId/files
POST   /workspaces/:workspaceId/files
PATCH  /workspaces/:workspaceId/files/:fileId
DELETE /workspaces/:workspaceId/files/:fileId
```

Save-file request:

```json
{
  "path": "src/index.ts",
  "content": "export const ready = true;",
  "language": "typescript",
  "version": 12
}
```

The API should reject stale versions with `409 Conflict` rather than silently overwriting another collaborator's changes.

### AI

```text
GET  /workspaces/:workspaceId/ai/conversations
POST /workspaces/:workspaceId/ai/conversations
POST /workspaces/:workspaceId/ai/conversations/:conversationId/messages
```

The message request should include the user prompt, file path, selected code, and relevant editor context. Enforce request size limits and rate limits before calling Claude.

## 8. Socket.io Events

### Chat

```text
client -> server: chat:join-channel
client -> server: chat:send-message
server -> clients: chat:message-created
server -> clients: chat:typing
server -> clients: chat:presence-changed
```

### Editor collaboration

```text
client -> server: editor:join-room
client -> server: editor:awareness-update
server -> room: editor:awareness-update
```

Yjs updates should use a dedicated collaboration transport or a Yjs-compatible WebSocket server. Do not invent a second conflict-resolution algorithm inside ordinary chat events.

### WebRTC signaling

```text
client -> server: rtc:offer
client -> server: rtc:answer
client -> server: rtc:ice-candidate
server -> target: rtc:offer | rtc:answer | rtc:ice-candidate
```

Production screen sharing requires a TURN server because direct peer-to-peer connections are not reliable across all networks.

## 9. Dependencies

### Root development dependencies

```powershell
npm install -D concurrently typescript
```

### Web application dependencies

```powershell
npm install --workspace=apps/web `
  next react react-dom `
  @monaco-editor/react monaco-editor `
  socket.io-client `
  zustand `
  yjs y-monaco y-websocket `
  axios zod `
  clsx tailwind-merge lucide-react `
  react-hook-form

npm install --workspace=apps/web -D `
  @types/node @types/react @types/react-dom `
  @tailwindcss/postcss tailwindcss postcss `
  eslint eslint-config-next
```

### API dependencies

```powershell
npm install --workspace=apps/api `
  express cors helmet cookie-parser dotenv `
  @prisma/client `
  jsonwebtoken bcryptjs `
  passport passport-google-oauth20 `
  socket.io `
  @anthropic-ai/sdk `
  zod express-rate-limit

npm install --workspace=apps/api -D `
  prisma tsx typescript `
  @types/node @types/express @types/cors `
  @types/cookie-parser @types/jsonwebtoken `
  @types/passport @types/passport-google-oauth20 `
  vitest supertest
```

### Optional production dependencies

```powershell
npm install --workspace=apps/api `
  @aws-sdk/client-s3 @aws-sdk/lib-storage `
  ioredis pino pino-pretty
```

Use Redis only when multiple API instances require shared Socket.io state, distributed rate limits, or presence coordination. PostgreSQL remains the durable store.

## 10. Environment Variables

Create `.env` from `.env.example`. Never commit `.env`.

```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:5173

# API
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/devpulse

# Authentication
JWT_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6

# Email verification
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=DevPulse <no-reply@example.com>

# S3-compatible object storage
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=devpulse
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=

# WebRTC TURN server
TURN_SERVER_URL=
TURN_SERVER_USERNAME=
TURN_SERVER_CREDENTIAL=
```

Only `NEXT_PUBLIC_*` variables may be referenced by browser code. All secrets belong to the API deployment.

## 11. Scripts

Recommended root scripts:

```json
{
  "scripts": {
    "dev": "concurrently --kill-others-on-fail \"npm run dev --workspace=apps/web\" \"npm run dev --workspace=apps/api\"",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "db:generate": "npm run db:generate --workspace=apps/api",
    "db:migrate": "npm run db:migrate --workspace=apps/api",
    "db:seed": "npm run db:seed --workspace=apps/api"
  }
}
```

For the current repository, use the existing `npm run dev:editor` command until the workspace paths are migrated.

## 12. Build Order

### Phase 1: foundation

- Authentication and email verification.
- Google OAuth.
- User, workspace, and membership records.
- Protected API middleware.
- Shared request and response types.

### Phase 2: primary editor loop

- Workspace file tree.
- Monaco Editor.
- Tabs and unsaved state.
- Save, rename, create, and delete file APIs.
- Keyboard shortcuts and status bar.

### Phase 3: AI assistant

- Conversation persistence.
- Claude API service on the backend.
- Streaming responses.
- Selected-code and current-file context.
- Rate limits and usage logging.

### Phase 4: team communication

- Channels and direct messages.
- Durable message history.
- Socket.io delivery.
- Presence, typing, mentions, and unread counts.

### Phase 5: collaboration

- Shared editor documents with Yjs.
- Remote cursors and selections.
- WebRTC signaling through Socket.io.
- Screen sharing with TURN fallback.
- Reconnection, permissions, and audit events.

## 13. Solo Time Estimates

| Capability | MVP | Production quality |
| --- | ---: | ---: |
| Auth and workspaces | 1-2 weeks | 3-4 weeks |
| Monaco editor and file APIs | 2-3 weeks | 5-7 weeks |
| Claude assistant | 1-2 weeks | 3-4 weeks |
| Team chat | 2-3 weeks | 4-6 weeks |
| Shared editing | 3-5 weeks | 8-12 weeks |
| Screen sharing | 2-3 weeks | 5-8 weeks |
| Testing, monitoring, deployment | 1-2 weeks | 3-5 weeks |

A credible solo MVP is approximately 10-16 weeks. A hardened production product is approximately 6-9 months.

## 14. Security and Reliability Checklist

- Validate every request with Zod at the API boundary.
- Apply workspace authorization before loading or mutating any resource.
- Hash passwords and refresh tokens with a modern password/token hashing strategy.
- Keep access tokens short-lived and revoke refresh tokens on logout.
- Use HTTP-only, Secure, SameSite cookies for refresh tokens in production.
- Configure CORS to the exact frontend origin, not `*`.
- Add Helmet, request limits, rate limits, and structured error handling.
- Never execute arbitrary user code inside the API process.
- Run code execution in isolated containers with CPU, memory, filesystem, and network limits.
- Add audit logs for workspace membership and file access changes.
- Test reconnects, duplicate events, stale saves, and permission failures.
- Add database backups before production launch.

## 15. Deployment

### Vercel

- Root directory: `apps/web` after migration, or the current repository root before migration.
- Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, and `NEXT_PUBLIC_APP_URL`.
- Configure the production API URL in Google OAuth redirect settings.

### Railway

- Deploy `apps/api` as a Node service.
- Set all API-only environment variables.
- Run `prisma migrate deploy` during deployment.
- Configure health endpoint: `GET /api/health`.
- Use a persistent Redis adapter when running more than one API instance.

### Database

- Use SSL in production.
- Run migrations from CI or the Railway deploy command.
- Do not use `prisma migrate dev` against production.

## 16. Definition of Done for the First Release

The first release is complete when a user can:

1. Register or sign in with Google.
2. Create or join a workspace.
3. Create, open, edit, and save files.
4. Switch between multiple tabs without losing content.
5. Ask Claude about the current file or selected code.
6. Send and retrieve team messages.
7. Reconnect after a temporary network interruption without corrupting state.

Screen sharing and multi-user live editing should follow after this workflow is stable because they have the highest infrastructure and reliability cost.
