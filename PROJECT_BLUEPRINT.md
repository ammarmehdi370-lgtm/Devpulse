# Devpulse Project Blueprint

## 1. Project at a glance

Devpulse is a pnpm/Turborepo monorepo for a collaborative developer workspace. Its product UI combines project and workspace management, a code editor, AI assistance, deployments, team chat, and account flows.

The repository is in a **hybrid transition state**:

- The web app has browser-native persistence code using PGlite, IndexedDB, and OPFS.
- The existing web UI still calls the Express API and Socket.IO in several important flows.
- The API and legacy services still use Prisma/PostgreSQL, Redis, and object storage.
- A separate Cloudflare Worker provides an edge AI proxy.
- The mobile workspace is an Expo starter rather than a fully featured mobile client.

Consequently, the browser-only architecture is partly implemented; it is not yet accurate to describe every feature as independent of server services.

## 2. Workspace structure

This is a source-oriented map. Generated files, dependencies, build output, and caches are omitted.

```text
Devpulse/
├── apps/
│   ├── web/                     # Next.js web client and browser services
│   │   ├── app/                 # App Router routes, screens, context, styles
│   │   ├── src/
│   │   │   ├── hooks/           # React hooks for browser services and features
│   │   │   ├── lib/             # Browser DB, storage, realtime, API client
│   │   │   ├── services/        # Feature service classes
│   │   │   └── test/            # Vitest setup and smoke tests
│   │   └── tests/editor/        # Playwright editor scenarios
│   ├── api/                     # Express REST API; legacy server backend
│   │   └── src/
│   │       ├── lib/             # Env, JWT, Redis, OAuth, bootstrap, email
│   │       └── routes/          # Authentication routes
│   ├── socket/                  # Socket.IO realtime server
│   ├── ai/                      # Legacy Express AI service
│   ├── ai-worker/               # Cloudflare Worker AI proxy
│   └── mobile/                  # Expo / React Native client starter
├── packages/
│   ├── config/                  # Shared TypeScript, ESLint, Tailwind config
│   ├── database/                # Prisma schema, migrations, seed, DB client
│   ├── types/                   # Shared TypeScript types
│   ├── ui/                      # Shared React UI primitives
│   └── utils/                   # Shared utility functions
├── scripts/                     # Setup, development, and maintenance scripts
├── package.json                 # Workspace-level commands and dependencies
├── pnpm-workspace.yaml          # Workspace package discovery
├── turbo.json                  # Task graph and caching configuration
├── .env.example                 # Environment template
└── DEVELOPMENT.md              # Browser and legacy development guidance
```

### Main web routes and screens

`apps/web/app/` uses the Next.js App Router:

- `/` — single-page product shell; page selection is managed by `AppContext`.
- `/login` — login screen.
- `/auth/callback` and `/auth/verify` — authentication callback/verification.
- `/editor` — editor route.
- `components/` — product screens and shared page chrome.
- `context/AppContext.tsx` — current UI state, user-facing actions, themes, editor state.
- `globals.css` — global theme variables, Tailwind layers, and application styles.

The root layout currently wraps its children in the HTML/body shell; the `/` page separately mounts `AppProvider` and `CommandPalette`.

## 3. Runtime architecture

```text
Browser
  ├── Next.js web UI (:3000)
  │     ├── AppContext and page components
  │     ├── BrowserServices singleton
  │     │     ├── PGlite + Drizzle → IndexedDB-backed browser database
  │     │     ├── BrowserStateStore → IndexedDB + in-memory cache
  │     │     ├── BrowserFileStorage → OPFS, with IndexedDB fallback
  │     │     └── RealtimeService → BroadcastChannel + optional SharedWorker
  │     └── API client / editor network calls
  │
  ├── REST API (:4000, legacy)
  │     ├── Prisma → PostgreSQL
  │     ├── Redis → sessions and rate-limit/state use
  │     └── S3-compatible object storage
  │
  ├── Socket.IO service (:4001, legacy)
  │     └── Redis-backed cross-client presence/session data
  │
  ├── AI service (:4002, legacy)
  └── Cloudflare AI Worker (edge deployment)
        └── validates origin and RS256 access token; streams provider response
```

The Next.js development server is the browser app's local web origin. Browser-native PGlite, IndexedDB, OPFS, BroadcastChannel, and SharedWorker features run in the browser, not as separate local servers.

## 4. Browser app initialization and request flows

### Current browser service initialization

1. A React feature hook such as `useBrowserServices` calls `BrowserServices.getInstance()`.
2. The singleton verifies it is running in a browser.
3. It initializes `BrowserStateStore` and `BrowserFileStorage`.
4. It opens PGlite through `getDB()`, runs the versioned SQL migrations, and seeds the demo data if appropriate.
5. It creates `RealtimeService` and wires file-change notifications.
6. The hook exposes loading, success, or error state to its component.

The UI currently has several distinct state/service entry points: `AppContext`, `BrowserServices`, and service classes under `src/services`. There is also a second services module at `src/lib/services.ts` with its own PGlite setup. These should be consolidated before treating initialization as one application-wide provider contract.

### Authentication

- `AuthService` contains a browser-local development login backed by the PGlite user table and `sessionStorage`.
- The API has server-side GitHub/Google OAuth and magic-link flows, and issues signed access/refresh credentials.
- Some UI code uses `authenticatedFetch` and server API routes; browser-local demo identity is not equivalent to a verified production identity.

### Editor and file flow

1. The user opens the editor and selects a project or imports local files.
2. Monaco renders text files; the editor has separate handling for binary/large files and previews.
3. The UI tracks open tabs, active file, dirty state, versions, session positions, and AI selection context.
4. In browser-native services, file metadata/revisions use Drizzle/PGlite and file bytes use OPFS with IndexedDB fallback.
5. Existing editor code also calls the API for project/file/revision/execution operations and uses Socket.IO for collaborative events.

### AI flow

1. The user submits a prompt, optionally with file/language/selection/command context.
2. The client checks for a user/token and configured AI endpoint.
3. The client sends a bounded chat request and reads a server-sent event stream.
4. The Cloudflare Worker validates CORS origin and RS256 token, calls the AI provider with its server-held API key, and forwards the stream.
5. The client renders chunks and records local usage in the browser DB where the browser AI service is used.

The provider API key must remain on the Worker/server side; it must not be bundled into client-side `NEXT_PUBLIC_*` variables.

### Realtime flow

- Browser-local `RealtimeService` broadcasts typed events between same-origin tabs with `BroadcastChannel` and can use a `SharedWorker` for presence snapshots.
- The legacy Socket.IO service handles workspace rooms, presence, file-editing notices, code changes, cursors, and typing across clients.
- These are separate realtime implementations; browser-local events do not automatically synchronize with Socket.IO clients.

## 5. Product UI map

The root page switches screens using a `PageType` value in `AppContext`. The app shell provides shared navigation and command-palette access for authenticated/product screens.

| Screen | Main UI responsibility |
|---|---|
| Login | Sign-in entry point and authentication actions |
| Theme Palette | Choose visual theme and personalization settings |
| Workspaces | Devbox/workspace list, template selection, clone/import flow, start/stop/delete actions |
| Repositories | Search/filter repositories, create/delete, star, clone URL, open a devbox |
| Editor | File explorer, Monaco tabs, code editing, save/revisions, AI drawer, execution/output, binary previews |
| Deployments | Deployment list, release/pipeline actions, environment-related controls |
| Team Chat | Workspace/channel messaging UI |
| Remote Control | Remote collaboration/control UI |
| AI Studio | Full-screen AI workspace |
| Pricing & Plans | Plan and billing presentation |
| Command Palette | Cross-app command/search surface |

The visual system uses a dark background, purple primary accent, teal secondary accent, theme CSS variables, Tailwind utilities, and Lucide icons. Additional theme presets are represented in `AppContext` and global CSS.

Some displayed features are currently presentation/state-driven and should not be assumed to provision real cloud compute or deployments unless their service integration is explicitly implemented.

## 6. Data and persistence

### Browser database

`apps/web/src/lib/db.ts` owns a PGlite database persisted using the browser's IndexedDB integration. It applies versioned SQL migrations and can seed a demo user/workspace/project/file/channel/message.

The Drizzle schema in `apps/web/src/lib/db/schema.ts` models:

- Users and workspaces
- Workspace memberships
- Projects
- Files and revisions
- Channels and messages
- AI conversations and messages
- AI usage
- Execution and editor-session records (where defined in the schema)

### Browser state and files

- `BrowserStateStore` uses IndexedDB for durable key/value state and an in-memory `Map` for a local cache; `BroadcastChannel` invalidates cache entries across tabs.
- `BrowserFileStorage` prefers OPFS and uses an IndexedDB-backed file store when OPFS is unavailable.
- `RealtimeService` is for same-origin tab/window events and presence coordination.

### Legacy server database and object storage

- `packages/database/prisma/schema.prisma` is the server-side Prisma schema.
- Prisma migrations and the seed script live under `packages/database/prisma/`.
- The Express API uses the shared Prisma client and retains server-backed files, AI history, editor sessions, and product data routes.
- Redis and S3-compatible object storage are dependencies of the legacy server stack.

### Important duplication to resolve

There are multiple schema/runtime representations:

1. `apps/web/src/lib/db/schema.ts` plus `apps/web/src/lib/db.ts` (Drizzle + PGlite).
2. `apps/web/src/lib/services.ts` (a separate PGlite initializer with a second SQL schema/database name).
3. `packages/database/prisma/schema.prisma` (Prisma/PostgreSQL).

They do not automatically share data or migrations. A full browser-only migration needs one authoritative browser schema and a deliberate data/import strategy.

## 7. Service and shared-package responsibilities

### Applications

- **`apps/web`** — Next.js 14, React, TypeScript, UI, editor, browser persistence, browser auth helpers, and API clients.
- **`apps/api`** — Express REST API, OAuth/magic-link authentication, JWTs, project/file/revision APIs, AI endpoints, execution and product routes.
- **`apps/socket`** — Socket.IO event server with workspace rooms and Redis integration.
- **`apps/ai`** — older Express-based AI service.
- **`apps/ai-worker`** — Cloudflare Worker that proxies streaming AI requests and verifies tokens.
- **`apps/mobile`** — Expo React Native starter with environment-aware API URL guidance.

### Shared packages

- **`packages/database`** — Prisma client exports, schema, migrations, and seed logic.
- **`packages/types`** — shared cross-package TypeScript declarations.
- **`packages/ui`** — shared React UI primitives.
- **`packages/utils`** — shared helpers.
- **`packages/config`** — shared compiler/linter/Tailwind configuration.

## 8. Configuration and developer workflow

### Important configuration locations

- Root `.env.example` and `.env` — root/legacy service configuration.
- `apps/web/.env.local.example` — Next.js browser-safe/public configuration.
- `apps/ai-worker/.dev.vars.example` — local Cloudflare Worker secrets template.
- `packages/database/prisma/` — server database schema and migration history.
- `apps/web/next.config.*`, `apps/web/tsconfig.json`, and `apps/web/vitest.config.*` — web build/test configuration.
- `pnpm-workspace.yaml` and `turbo.json` — workspace/package task configuration.

Only public configuration belongs in browser-exposed variables. Database passwords, JWT private keys, and AI provider keys must not be exposed to client bundles.

### Browser web quick start

The documented browser-web workflow is:

```text
Step 1: pnpm install
Step 2: pnpm run bootstrap
Step 3: pnpm dev
Step 4: open http://localhost:3000
```

`pnpm dev` starts the web app. The local database initializes in browser storage when the browser service opens. This makes the web shell available without starting the legacy services, but it does **not** guarantee all current UI flows work without the API/socket dependencies that remain in the hybrid implementation.

### Current root commands

The root `package.json` also retains separate commands for:

- Web, API, Socket.IO, AI, and mobile development.
- Browser web build and monorepo builds.
- Unit/e2e testing, linting, and type checking.
- Prisma generation/migration/seed/studio.
- Legacy stack setup and infrastructure.

The presence of these commands reflects the transition state. Browser PGlite migrations run at browser initialization; Prisma migration scripts are for the legacy server database and are not a replacement for browser migrations.

## 9. Tests and validation

- Web unit tests: Vitest, including `apps/web/src/test/` and component-level tests.
- Editor browser tests: Playwright scenarios under `apps/web/tests/editor/`.
- API tests: Vitest under `apps/api/src/`.
- Shared packages and services: package-level Vitest, lint, and TypeScript scripts.
- Web checks are available from `apps/web/package.json` as `test`, `typecheck`, `lint`, `build`, and Playwright scripts.

## 10. Known migration gaps / next engineering steps

1. **Choose one browser service entry point.** Consolidate the two browser service singletons and make provider/hook usage consistent.
2. **Unify browser schema and migration ownership.** Avoid competing PGlite database names and SQL table conventions; keep Drizzle schema and migrations aligned.
3. **Migrate UI data calls.** Replace API-specific calls for projects, files, deployments, chat, and editor sessions with browser service calls where a local-only workflow is intended.
4. **Choose collaboration semantics.** Decide whether multi-user collaboration is local-tab only, server-mediated, or uses a deployed realtime provider; BroadcastChannel alone only spans same-origin browser contexts on the same device/profile.
5. **Keep secrets off the client.** Deploy the AI Worker for AI calls and pass only safe endpoint configuration to the web app.
6. **Clarify the product scope.** A browser-only editor can persist code locally, but remote compute, remote deployment, OAuth, and cross-user collaboration require trusted external services.
7. **Align onboarding documentation and commands.** Ensure root scripts, `.env.example`, `DEVELOPMENT.md`, and `README.md` describe the same supported browser and legacy workflows.

## 11. Glossary

- **PGlite** — PostgreSQL-compatible database compiled to WebAssembly and run locally in the browser.
- **OPFS** — Origin Private File System, browser-managed storage for file-like data.
- **Drizzle** — TypeScript SQL toolkit used by the browser database layer.
- **Prisma** — ORM used by the legacy server database package.
- **BroadcastChannel** — browser API for messaging between same-origin tabs/contexts.
- **SharedWorker** — worker instance that can be shared by multiple same-origin browsing contexts.
- **Edge Worker** — deployed request handler used to keep AI provider credentials outside the browser and stream responses.
