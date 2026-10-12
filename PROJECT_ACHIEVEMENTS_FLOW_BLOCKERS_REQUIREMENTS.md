# Devpulse: Achievements, Flow, Blockers, and Requirements

## Overview
Devpulse is a browser-first workspace platform that began as a full-stack monorepo with a web app, API, socket layer, AI service, and mobile client, and is now being reshaped to run entirely in the browser without Docker, Node.js server processes, or localhost service ports except the dev server itself.

## Achievements

### Product and platform foundation
- Built a monorepo-based platform for the web app, API, real-time socket service, AI service, and mobile client.
- Organized the codebase into dedicated packages for app logic, database, UI, storage, configuration, and shared utilities.
- Established a shared TypeScript toolchain and workspace scripts for setup, verification, migration, build, lint, and maintenance.
- Added Docker-based local infrastructure for Postgres, Redis, and MinIO during the legacy stack phase.
- Created a developer-oriented workflow for local startup, health checks, environment preparation, and resets.

### Core user experience
- Implemented onboarding and authentication experiences with GitHub, GitLab, SSO/SAML, and work-email options.
- Added support for magical link and bypass authentication flows for development.
- Built a global application shell with navigation, repository context, profile access, command palette, and workspace status.
- Added theme switching and token-based UI customization.
- Implemented repository listing, creation, deletion, starring, and clone URL handling.
- Added workspace templates for common development environments.

### Editor, AI, and collaboration workflow
- Built a VS Code-inspired browser editor workbench with Monaco.
- Added file explorer, tabs, dirty states, folder navigation, creation, deletion, and rename flows.
- Added browser-local and API-backed file handling with revision tracking.
- Implemented autosave and revision-backed save actions through file patching.
- Added terminal, output, and problems views with runtime status reporting.
- Added AI-assisted coding with in-editor assistance and streamed responses.
- Implemented slash commands such as `/fix`, `/explain`, `/test`, `/comment`, `/refactor`, and `/optimize`.
- Added AI usage tracking, diff previews, and apply-to-editor flows.
- Added team channels, direct messaging, real-time presence, typing, cursor, selection sync, and remote collaboration patterns.

### Data and infra integration
- Added Prisma-backed PostgreSQL persistence for users, workspaces, files, messages, revisions, and related records.
- Added Redis-backed presence and session state support.
- Integrated MinIO object storage for artifacts and file-related storage.
- Prepared the app for auth, email delivery, AI services, billing, and deployment tooling.

### Browser-native target architecture
- Introduced the browser-only target architecture using PGlite, IndexedDB, OPFS, BroadcastChannel, and SharedWorker.
- Added a browser-local database with versioned SQL migrations and repeatable seed logic.
- Added a browser state store with in-memory caching, TTL support, atomic counters, and same-origin cache invalidation.
- Added file storage using OPFS with IndexedDB fallback for resilience.
- Added a real-time layer based on BroadcastChannel and SharedWorker for same-origin tab collaboration.
- Added an AI Edge Route Handler pattern to proxy requests without exposing provider secrets.
- Planned a single `pnpm dev` startup path that avoids Docker and server daemons.

## Flow

### Legacy local development flow
1. Install Node.js and pnpm.
2. Enable Corepack if needed.
3. Copy `.env.example` to `.env`.
4. Start Docker services for PostgreSQL, Redis, and MinIO.
5. Generate Prisma client and run migrations.
6. Start the web app, API, socket service, and AI service.
7. Verify each service with health checks.
8. Run lint, typecheck, test, and build commands.

### Browser-native target flow
1. Install browser-native packages in `apps/web`:
   - `@electric-sql/pglite`
   - `drizzle-orm`
   - `drizzle-kit`
   - `yjs`
   - `y-monaco`
   - `jose`
   - `idb`
2. Remove server-only dependencies such as Express, Socket.IO, Redis, MinIO, Prisma, and passport-based auth packages.
3. Create a browser services singleton that initializes:
   - PGlite database
   - IndexedDB state store
   - OPFS file storage
   - BroadcastChannel-based realtime service
   - seed data if empty
4. Run SQL migrations in the browser through PGlite.
5. Use `next.config.ts` with COOP/COEP headers to allow WebAssembly and shared-memory features.
6. Proxy AI requests via an Edge Route Handler rather than a Node server process.
7. Run the app using a single pnpm dev flow without Docker or Node worker services.

## Blockers and Constraints

### Current blockers in the legacy stack
- Docker is required for PostgreSQL, Redis, and MinIO.
- Node.js server processes are required for Express, Socket.IO, and AI workers.
- Localhost ports are used for multiple service boundaries.
- Missing or invalid `.env` values can prevent services from booting correctly.
- Production secrets are required for OAuth, AI, email, and billing integrations.

### Architectural constraints for the browser-only target
- Everything must run in the browser; no Docker, no Node.js server processes, and no localhost service ports except the dev server.
- Browser storage is local to the browser profile and origin; it is not a replacement for secure multi-user server-side storage.
- OPFS and IndexedDB are browser-scoped and not shared across devices or users.
- BroadcastChannel and SharedWorker only coordinate same-origin tabs, not cross-device collaboration.
- Provider API keys, refresh tokens, and secrets must never be stored in PGlite, OPFS, or IndexedDB.
- Next.js static export cannot include route handlers or middleware, so AI must be handled in a separate Edge route or worker pattern.
- COOP/COEP headers are required to allow browser capabilities such as WebAssembly and cross-origin isolation.
- Local-only debugging must rely on browser DevTools, IndexedDB, and the app runtime rather than server logs.

## Requirements

### Core technical requirements
- Node.js 20+ or newer
- pnpm 9+ or newer
- Git for repository management
- Browser-compatible environment for local development
- Ability to run the app without Docker-based infrastructure

### Required project changes for the browser-first architecture
- Move database logic to PGlite in the browser
- Move state persistence to IndexedDB
- Move file persistence to OPFS with IndexedDB fallback
- Move collaboration to BroadcastChannel + SharedWorker
- Move API logic to TypeScript service classes
- Move AI proxy to Edge Route Handler or worker-based serverless flow
- Remove server-only infrastructure and Prisma config from the runtime path
- Configure browser security headers for COOP/COEP

### Required environment values
The app expects a repo-root `.env` containing required settings, including:
- `NODE_ENV`, `APP_URL`, `FRONTEND_URL`, `API_URL`, `SOCKET_URL`, `AI_URL`
- `DATABASE_URL`, `DIRECT_DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`
- `SESSION_SECRET`
- OAuth values for GitHub, Google, GitLab, and SAML
- Email values for Resend
- AI values for Anthropic
- S3/MinIO config for object storage
- Stripe billing variables

### Required browser stack
- Database: PGlite (PostgreSQL WASM in browser)
- Cache/state: IndexedDB + in-memory Map
- Files: OPFS (Origin Private File System)
- API logic: TypeScript service classes
- Real-time: BroadcastChannel + SharedWorker
- AI proxy: Next.js Edge route or worker-based proxy
- Web app: Next.js static export + Edge functions

### Required package additions
```bash
cd apps/web
pnpm add @electric-sql/pglite
drizzle-orm
drizzle-kit
yjs
y-monaco
jose
idb
```

### Required package removals
```bash
pnpm remove express
pnpm remove socket.io
pnpm remove ioredis
pnpm remove minio
pnpm remove @prisma/client prisma
pnpm remove passport passport-github2
pnpm remove passport-google-oauth20
pnpm remove passport-gitlab2
```

### Required deletion targets
- `apps/api/`
- `apps/socket/`
- `apps/ai/`
- `docker-compose.yml`
- All Prisma configuration and Prisma-based migration setup

### Required configuration change
```ts
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  webpack(config, { isServer }) {
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      }
    }
    return config
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      ],
    }]
  },
}

export default config
```

### Verification checklist
- Open DevTools → Application → IndexedDB
- Check `devpulse-v1` exists
- Confirm seeded data appears in the database store
- Ensure no Docker containers are required to run the app
- Ensure main app runs via a single `pnpm dev` command

## Summary
Devpulse has already achieved a strong full-stack platform foundation, but the current strategic requirement is to move the product toward a browser-native architecture. The final state is a single browser-run experience using PGlite, IndexedDB, OPFS, BroadcastChannel, and Edge AI routing, with all legacy Docker and server-based dependencies removed from the runtime path.
