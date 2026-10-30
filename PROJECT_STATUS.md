# Devpulse Project Status

## Overview

Devpulse is a Turborepo monorepo for a cloud development platform that combines a Next.js web application, Express API, Socket.IO collaboration service, Anthropic-powered AI service, and Expo mobile foundation. The project is designed to support repository management, dev environments, AI-assisted coding, collaboration, deployments, and browser-based development workflows.

## Achievements

### Platform foundation
- Built a full monorepo structure using pnpm workspaces and Turbo.
- Organized the codebase into web, API, socket, AI, mobile, database, UI, utility, and config packages.
- Set up a shared TypeScript and tooling foundation for the workspace.
- Established local development infrastructure with Docker Compose and service orchestration.

### Core application features
- Created the Devpulse login and onboarding experience with GitHub, GitLab, SSO/SAML, and work-email options.
- Added development authentication support via magic links and provider bypass flows.
- Implemented a global application shell with navigation, repository context, profile access, status indicators, and command palette support.
- Added theme selection and design-token-driven UI personalization.
- Built repository listing, creation, deletion, starring, and clone URL handling.
- Added workspace provisioning templates for common development stacks.

### Editor and AI workflow
- Built a VS Code-inspired browser editor workbench with Monaco.
- Added file explorer, tabs, dirty states, folder navigation, file creation, deletion, and rename actions.
- Added browser-local and API-backed file support with revision tracking.
- Implemented autosave and revision-backed saves via API file patches.
- Added code execution support for JavaScript, Python, Rust, and Go in isolated Docker-backed execution.
- Added terminal, output, and problems views with runtime status reporting.
- Added AI-assisted coding with an in-editor assistant panel and streamed responses.
- Implemented slash commands such as `/fix`, `/explain`, `/test`, `/comment`, `/refactor`, and `/optimize`.
- Added apply-to-editor functionality with diff previews and save confirmation.
- Added AI usage tracking and limit-aware UX.

### Collaboration and operations
- Added team channels and direct messaging interfaces.
- Added real-time presence, typing, cursor, and selection collaboration through Socket.IO.
- Added remote-control workspace flows with shared code and session control features.
- Added deployment cards, release flows, environment variables, logs, and operational metrics.
- Added deploy-on-push and preview environment capabilities.

### Data and infrastructure
- Added Prisma-based PostgreSQL persistence for users, workspaces, files, revisions, messages, and related platform entities.
- Added Redis-backed presence and session state support.
- Integrated MinIO object storage for artifacts and file-related storage.
- Prepared the environment for authentication, email, AI, and storage-related integrations.

## Browser-Native Target Architecture

The browser-native architecture is being introduced alongside the existing server-backed application. The current UI still calls the Express API and Socket.IO service; the new browser services are foundations, not yet a complete replacement for every existing workflow.

```text
                         Static hosting / CDN
                                  |
  +------------------------- One browser tab --------------------------+
  |                                                                    |
  |  Next.js static UI -> DevpulseServices -> Drizzle -> PGlite WASM  |
  |                                          (IndexedDB persistence)  |
  |                                                                    |
  |  FileService -> OPFS (IndexedDB file fallback)                    |
  |  CollabService -> Yjs + BroadcastChannel                          |
  |  RealtimeService -> BroadcastChannel <-> SharedWorker              |
  |  AuthService -> session access token; auth/OAuth via Edge identity  |
  |  AIService -> HTTPS -> Cloudflare AI Worker -> Anthropic           |
  +--------------------------------------------------------------------+

  Other same-origin tabs <-> BroadcastChannel / SharedWorker
```

The static web output is `apps/web/out/`. Next.js static export cannot contain Next.js Route Handlers or Middleware, including Edge-runtime handlers. Therefore AI runs as the separately deployed `apps/ai-worker` Cloudflare Worker; it is not an `app/api/.../route.ts` inside the exported site.

Browser storage is local to the browser profile and origin. It is not shared across devices or users and is not a substitute for a hosted multi-tenant database. BroadcastChannel and SharedWorker coordinate same-origin tabs only; cross-device or cross-browser collaboration needs an external signaling/sync service. Do not store provider API keys, refresh tokens, or other server credentials in PGlite, OPFS, or IndexedDB. Access tokens in `sessionStorage` remain exposed to same-origin script execution; prefer short-lived tokens and an HttpOnly refresh cookie owned by the auth Edge service.

### Browser-native modules

- `apps/web/src/lib/db.ts` opens PGlite on its IndexedDB VFS, runs versioned SQL migrations, and exposes the typed Drizzle database. `seedIfEmpty()` is repeatable and runs during browser-service initialization, adding demo data only to a database with no users.
- `apps/web/src/lib/db/schema.ts` contains Drizzle definitions for the requested Prisma entities plus workspace membership, AI conversations/messages, and AI usage.
- `apps/web/src/lib/db/examples.ts` demonstrates querying a user, loading a project with files, inserting a message, and transactionally updating a file and recording its previous revision.
- `apps/web/src/lib/state-store.ts` provides asynchronous IndexedDB state with an in-memory cache, TTLs, atomic local rate-limit counters, and browser-local presence records. Cross-tab cache invalidation uses BroadcastChannel. It is not a server-session store or a security boundary for rate limiting.
- `apps/web/src/lib/storage.ts` (re-exported from `apps/web/src/lib/file-storage.ts`) uses OPFS and falls back to IndexedDB for files; `FileService` synchronizes file metadata and revisions.
- `apps/web/src/lib/browser-services.ts` initializes the state store, file storage, PGlite database, demo seed, auth facade, file service, realtime service, and message service behind one retryable singleton.
- `apps/web/src/services/auth.service.ts` provides a local development identity only; it creates no JWT and is disabled in production. It is not a replacement for hosted authentication or authorization.
- `apps/web/src/services/file.service.ts` stores file content in OPFS and keeps PGlite metadata and revisions in sync. `apps/web/src/services/message.service.ts` persists channel messages and publishes same-origin events.
- `apps/web/src/hooks/useBrowserServices.ts`, `useAuth.ts`, `useFiles.ts`, and `useRealtime.ts` expose initialization state and browser services to client components.
- `apps/web/src/lib/realtime.ts` and `apps/web/public/workers/devpulse-shared.js` coordinate same-origin events and presence; `CollabService` broadcasts Yjs document updates between tabs.
- `apps/web/src/services/index.ts` exposes the browser service singleton and DB, file, auth, AI, and collaboration services.
- `apps/ai-worker/src/index.ts` validates the API's RS256 access tokens against the public key, constrains chat requests, and streams Anthropic responses without exposing the provider key. The browser `AIService` sends only to the configured Worker URL and records request/token counts in that browser's PGlite; its displayed 100-request monthly limit is a local UX limit, not a cross-device or abuse-prevention control.
- `apps/web/src/hooks/useAI.ts` exposes `chat`, `usage`, `refreshUsage`, and `isStreaming`. The existing editor and AI page still call the legacy Express endpoints and have not been migrated to this hook.

The AI proxy is a separate Cloudflare Worker, not a Next.js Route Handler: `output: "export"` produces static assets and cannot host Edge or Node Route Handlers. Do not add `app/api/ai/*/route.ts` or a Vercel Edge Route Handler to this static-export app. For local development, run the web app and `pnpm --filter @devpulse/ai-worker dev` in separate terminals; set `NEXT_PUBLIC_AI_PROXY_URL` to the Worker URL and place `ANTHROPIC_API_KEY` and `JWT_PUBLIC_KEY` in the Worker-only `apps/ai-worker/.dev.vars` file. The Worker validates the same RS256 `issuer: "devpulse"` access tokens issued by the API. For production, configure Worker secrets and replace the example `ALLOWED_ORIGIN` in the production Wrangler environment with the deployed site's exact origin. Never use `NEXT_PUBLIC_*` for provider or signing secrets.

AI usage in PGlite is browser-local and is not an authoritative quota. A production usage endpoint and global quota enforcement require trusted shared server-side storage; this Worker currently has no durable usage database. `pnpm dev` starts the Next.js web development server only; run the AI Worker separately when testing the browser proxy. Some current UI/API paths still need the legacy server stack, which is available through `pnpm dev:stack`.

#### Initializing and using browser services

```tsx
"use client";

import { useBrowserServices } from "../hooks/useBrowserServices";

export function LocalFileExample() {
  const { services, loading, error } = useBrowserServices();

  async function writeExample(): Promise<void> {
    if (!services) return;
    await services.storage.writeFile("examples/test.ts", "hello");
    await services.store.set("last-opened-file", "examples/test.ts");
  }

  if (loading) return <p>Initializing local services…</p>;
  if (error) return <p role="alert">{error.message}</p>;
  return <button onClick={() => void writeExample()}>Write example</button>;
}
```

Service initialization invokes `seedIfEmpty()` once the database is ready; it seeds only if there are no users. Remove that call from `BrowserServices.initialize()` if a product build should start empty instead of creating demo data. Browser-side rate-limit counters only coordinate this browser's IndexedDB origin; enforce actual abuse limits at the trusted Edge/API boundary.

#### Browser storage support

Browser compatibility should be determined by runtime feature detection because browser version support varies by platform, private-browsing mode, and storage policy.

| Feature | Chrome / Chromium | Firefox | Safari | Fallback |
| --- | --- | --- | --- | --- |
| PGlite IndexedDB VFS | Supported | Supported | Supported | In-memory PGlite only if the app explicitly chooses to support non-persistent sessions |
| OPFS project-file storage | Feature-detect `navigator.storage.getDirectory` | Feature-detect `navigator.storage.getDirectory` | Feature-detect; support varies | IndexedDB file store |

Current PGlite documentation recommends IndexedDB for browser persistence and lists it for Chrome, Firefox, and Safari; its OPFS AHP database VFS has narrower support and is not used by Devpulse. OPFS is only used for project files here. In Chrome DevTools, open **Application → Storage** to inspect IndexedDB and Origin Private File System data for the site. Browser tools may require reloading the application after clearing storage.

#### Using and resetting the local database

```ts
import { getDB, seedIfEmpty } from "./lib/db";
import {
  getUserByEmail,
  getProjectWithFiles,
  insertMessage,
  updateFileContent,
} from "./lib/db/examples";

const db = await getDB();
await seedIfEmpty(); // seeds only an otherwise-empty DB; safe to call repeatedly
const user = await getUserByEmail(db, "demo@devpulse.local");
```

The remaining query examples are in `apps/web/src/lib/db/examples.ts`. The Drizzle insert/update APIs return promises; PGlite's IndexedDB VFS loads the database files on initialization and persists changed files to IndexedDB. It survives refreshes in the same browser profile and origin, but browser site-data eviction, clearing site data, or using a different profile/device removes or isolates that data. It is local storage, not a remote multi-user database.

For an application-driven reset, call `await DevpulseServices.clearLocalData()` and reload the page. It closes PGlite, removes the `idb://devpulse` database and the browser file store (OPFS or fallback IndexedDB), then clears the in-memory service singleton. Close other Devpulse tabs first; an open tab may keep the IndexedDB database deletion blocked. For manual troubleshooting, use the browser's site-data controls to clear IndexedDB and Origin Private File System for the Devpulse origin.

PGlite's [upstream filesystem support table](https://github.com/electric-sql/pglite/blob/main/docs/docs/filesystems.md) lists its IndexedDB filesystem for Chrome, Safari, and Firefox. It recommends IndexedDB for browser persistence; the OPFS AHP database filesystem is currently not supported in Safari. Devpulse uses OPFS only for project files and falls back to IndexedDB; its database uses PGlite's IndexedDB VFS. Deploy over HTTPS (or localhost for development) and validate target browser versions, storage quotas, and browser-private mode. See also the [PGlite browser and IndexedDB overview](https://github.com/electric-sql/pglite#browser).

The web package dependencies are declared in `apps/web/package.json`. To add them in a fresh checkout:

```sh
pnpm --filter @devpulse/web add @electric-sql/pglite drizzle-orm
pnpm --filter @devpulse/web add -D drizzle-kit
pnpm install
```

### Migration plan

1. **Keep the current services running while consumers move.** Export/import existing PostgreSQL data into the browser database; verify relationships, timestamps, file revisions, and offline recovery. Existing data does not automatically appear in a user's browser.
2. **Move UI data flows.** Migrate AppContext, editor saves/revisions, chat, repository/workspace screens, and auth calls to the browser services or purpose-built Edge endpoints. Replace hard-coded localhost API/socket URLs and update e2e setup.
3. **Move collaboration and editing.** Wire Yjs updates to Monaco using `y-monaco`; validate multi-tab edits and conflict recovery. BroadcastChannel alone cannot provide collaboration between different users' devices.
4. **Move identity and remote capabilities.** Implement hosted Edge OAuth/magic-link/session endpoints and authorization. Deploy the AI Worker with `ANTHROPIC_API_KEY` and the API's RS256 `JWT_PUBLIC_KEY` configured in the Worker environment, and set its allowed site origin. Never put provider or private signing keys in `NEXT_PUBLIC_*` variables.
5. **Cut over deployment.** Build and host only the static `out/` directory; deploy the AI/auth Edge functions separately. Then remove Express, Socket.IO, Prisma, PostgreSQL, Redis, MinIO, their Docker Compose services, and obsolete package scripts after a repository-wide consumer check and data export verification. The new foundation alone is not yet grounds to delete these production dependencies.

The web dependency set for the browser architecture is `@electric-sql/pglite`, `drizzle-orm`, `drizzle-kit`, `jose`, `yjs`, and `y-monaco`. The separately deployed Worker uses `jose` and Wrangler for deployment tooling.

## End-to-End Flow

1. Install dependencies and set up the environment.
   - Enable Corepack.
   - Run pnpm install.
   - Copy .env.example to a local .env file.

2. Start the required infrastructure.
   - Bring up PostgreSQL, Redis, and MinIO using Docker Compose.
   - Confirm service health and port accessibility.

3. Prepare the database and generated artifacts.
   - Run Prisma generation.
   - Apply migrations.
   - Seed data if required.

4. Start service processes.
   - Launch the web app, API, socket service, and AI service.
   - Check health endpoints for each service.

5. Use the platform.
   - Sign in or authenticate through supported providers.
   - Select a theme and complete onboarding.
   - Browse repositories and create or connect workspaces.
   - Open the editor, create or edit files, and save revisions.
   - Run code and inspect output.
   - Use the AI assistant for code help or editing assistance.
   - Manage deployments, environment variables, and collaboration tools.

6. Maintain the app.
   - Run linting, type checking, builds, and tests.
   - Apply migrations and database updates when needed.
   - Monitor service health and environment readiness.

## Blockers and Constraints

- Docker Desktop or equivalent Docker support is required for local PostgreSQL, Redis, and MinIO services.
- A valid .env file is required for service configuration and startup.
- External API credentials are required for production-like integrations, including GitHub, GitLab, Google, Resend, and Anthropic.
- Database and Redis readiness directly affect dependent application services; failing infrastructure can prevent startup.
- Some features are optional in local development but become required when those integrations are enabled.
- Secure production deployment and orchestration still require additional hardening and platform-level work.
- Production-grade OAuth, SAML, email delivery, billing, deployment orchestration, and workspace isolation need further implementation or integration.
- Browser-based local workflows depend on correct file handling and environment health.

## Requirements

### Core technical requirements
- Node.js 20.10.0 or newer
- pnpm 9 or newer
- Git
- Docker Desktop or a compatible Docker environment

### Environment requirements
- Local .env file created from .env.example
- Valid database credentials and service configuration
- Optional OAuth credentials for GitHub, GitLab, and Google
- Optional email provider credentials for Resend
- Optional AI provider credentials for Anthropic

### Required local services
- PostgreSQL on port 5433
- Redis on port 6379
- MinIO on ports 9000 and 9001
- API on port 4000
- Socket service on port 4001
- AI service on port 4002
- Web app on port 3000
- Mobile app via Expo (local development target)

### Project commands
- pnpm install
- pnpm run bootstrap
- pnpm migrate
- pnpm seed
- pnpm dev
- pnpm lint
- pnpm typecheck
- pnpm build
- docker compose up -d postgres redis minio

## Current Status

The project has a strong platform foundation and a substantial implementation across the editor, AI workflow, collaboration features, and deployment tooling. The remaining work is primarily in production hardening, authentication integration, infrastructure maturity, deployment automation, and full end-to-end operational readiness.

## Summary

Devpulse is positioned as a broad cloud development platform with a working monorepo foundation and a highly complete prototype-level feature set. Its success depends on correct environment configuration, healthy local services, and continued integration work for production-ready security and orchestration.
