`# Devpulse

Devpulse is a production-style developer platform prototype built as a monorepo. It combines a web workspace dashboard, project orchestration screens, code editor, AI assistant, deployment management, and team collaboration UI into a single cohesive product experience.

This repository is designed to feel like a real cloud developer platform, even though some parts are intentionally mocked or front-end driven for rapid prototyping.

## Overview

Devpulse aims to provide developers with a single control surface for:

- managing repositories and workspaces
- launching isolated devboxes
- reviewing deployments and logs
- editing code in a built-in editor
- collaborating through chat and remote support
- asking AI for code assistance
- managing billing and plans

The platform is structured as a Turborepo workspace with separate apps for the web client, API, socket layer, AI service, and mobile shell.

---

## Core product flow

The user journey in the current app is intentionally guided and linear:

1. Login screen
   - user starts at the authentication flow
   - the app supports quick launch, GitHub, GitLab, SSO, and email-based login
   - in development mode, auth is bypassed for rapid local testing

2. Theme palette and design system landing
   - after login, the user can select a theme/style preset
   - this establishes the product branding and visual identity

3. Repositories page
   - the user browses project cards
   - repos can be searched, filtered, starred, created, deleted, and launched into devboxes

4. Workspaces page
   - developers see active devboxes and cloud environments
   - workspaces can be started, toggled, or removed
   - this is the operational center for ephemeral developer environments

5. Deployments page
   - release states, target domains, commit metadata, and deployment pipeline status are displayed
   - users can trigger new releases or rerun pipelines

6. Editor workbench
   - a code editor view loads files and project structure
   - files can be opened, edited, saved, created, and removed
   - this simulates a real project workspace with local in-memory content

7. AI studio
   - user can ask questions, receive assistant suggestions, and apply diff-based code improvements directly to the active file
   - model selection, temperature, and generation controls are exposed in the UI

8. Remote control and support
   - the product includes a remote help interface with camera, mic, and code session controls

9. Team chat and collaboration
   - messaging and team communication screens are included for collaboration workflows

10. Pricing and billing

- plans and billing cycle toggles are part of the product experience

This flow is mapped in the frontend state machine through the central app context, especially in the page navigation logic and screen switching model.

---

## Achievements and implemented product value

The project already demonstrates several meaningful outcomes:

### Product UX and design system

- polished dark-mode developer tool aesthetic
- consistent workspace design language across screens
- custom theme presets and configurable product branding
- solid visual hierarchy for technical tooling screens

### Monorepo architecture

- workspace-based repository setup with shared packages for config, database, UI, utilities, and types
- app separation for web, API, socket, AI, and mobile
- clean multi-package project layout for scaling the platform

### Frontend interaction modeling

- full navigation state handling across multiple screen types
- reusable context-based global state for user, projects, workspaces, deployment data, editor files, and AI actions
- command palette and quick action patterns similar to IDE and SaaS tools

### Developer productivity simulation

- repository creation and filtering flow
- pseudo-devbox provisioning workflow
- file tree and code editing workflow
- AI-assisted patching lifecycle
- environment variable management and deployment status tracking

### Platform feel

- live telemetry widgets and status indicators
- responsive layout for a SaaS style internal platform
- realistic microservice naming and workflow language used throughout the UI

---

## Current app architecture

### Monorepo layout

- apps/web: Next.js app containing the primary dashboard and product screens
- apps/api: Express-based API service
- apps/socket: real-time socket server
- apps/ai: AI service boundary
- apps/mobile: mobile app shell
- packages/database: Prisma database layer
- packages/ui: shared UI package
- packages/utils: utility helpers
- packages/types: shared types
- packages/config: config base for tooling

### Main frontend flow

The main navigation is controlled from the web app root and app context layer.

The app uses a central page model such as:

- login
- theme
- repositories
- workspaces
- deployments
- chat
- editor
- remote-control
- ai-studio
- pricing

The actual screen routing is handled in the main page component with conditional rendering based on the active page state.

### State model

The app context contains rich mock data and functions for:

- authentication simulation
- repository operations
- workspace provisioning
- deployment actions
- environment variable management
- log generation
- editor file state and save behavior
- AI diff application
- remote control toggles
- billing cycle management

This is a strong prototype architecture because it centralizes all expected product behavior behind a single application state layer.

---

## Dependencies and technology stack

### Core runtime

- Node.js >= 20.10
- pnpm workspace manager
- Turbo monorepo orchestration
- TypeScript

### Web app

- Next.js 14
- React 18
- Tailwind CSS
- Monaco editor integration
- Lucide React icons
- Socket.IO client
- Zod validation

### Backend and services

- Express
- CORS
- Helmet
- Pino HTTP logging
- Prisma ORM
- PostgreSQL via database package
- Redis and MinIO expected for local infrastructure

### Tooling and quality

- ESLint
- Prettier
- TypeScript compiler
- Vitest for tests
- Docker Compose for local infrastructure

### Package structure dependencies

The workspace uses shared packages for:

- @devpulse/config
- @devpulse/types
- @devpulse/ui
- @devpulse/utils
- @devpulse/database

---

## Detailed UI blueprint

### 1. Login / on-boarding shell

- brand section with product name and status chip
- marketing headline: “Build at the speed of thought.”
- provider authentication options: GitHub, GitLab, SSO, email
- instant launch button for local developer access
- ambient gradient background and dashboard-like telemetry accents

### 2. Theme selector screen

- theme presets with names such as Cyber Mint, Devpulse Purple, Emerald Cyber, Synthwave Sunset, Tokyo Neon, Electric Amber
- color swatches and style metadata
- theme details include primary color, font family, mode, and border radius

### 3. Platform sidebar navigation

- left navigation with sections like Platform and System
- actions for workspaces, projects, editor, deployments, AI, pricing, chat
- top header with branding, theme shortcut, search, cluster health, and user avatar

### 4. Workspaces page

- workspace cards with repository, branch, template, status, uptime, and hardware specs
- devbox state indicators and URL links
- actions for lifecycle changes and project context switching

### 5. Repositories page

- project list with search and language filters
- star/fork metadata, branch, deployment state, and commit information
- repository creation modal
- launch-to-devbox flow

### 6. Editor workbench

- file explorer tree
- code tabs and active file view
- syntax-aware editor behavior
- save and diff-oriented workflow
- AI action integration and file system simulation

### 7. AI assistant studio

- model selector
- generation controls for temperature and top-p
- message thread for user + assistant interactions
- code snippets with copy and apply actions
- request/response flow against the AI service endpoint

### 8. Remote support screen

- remote access UI with camera/microphone state
- terminal-like control surface
- instructions and live assistance mode

### 9. Team chat

- group or team conversation area
- message list, user status, and collaboration patterns
- suitable for internal developer communication

### 10. Deployment and release screen

- domain and release target display
- deployment statuses: Ready, Building, Failed
- pipeline rerun and release action controls
- commit history details and author context

### 11. Pricing and billing page

- monthly vs annual billing selector
- plan cards and value proposition blocks
- product usage and package details

---

## Operational flow and product logic

The app currently follows this practical developer experience flow:

- sign in
- pick a theme
- browse or create a repository
- spin up a workspace
- open the editor
- inspect logs and deployment actions
- ask AI for code help
- move through remote support or collaboration tasks
- manage pricing and environment settings

This flow feels coherent and maps well to a full developer workflow platform; it is not just a collection of unrelated mock screens.

---

## Blockers and constraints in the current flow

This is the honest part of the project: several parts are still incomplete or simulated.

### 1. Real backend integration is partial

- authentication endpoints are referenced in the frontend but not fully implemented for production
- the app uses dev bypasses for login in development to keep the product usable locally
- API routes for real repositories, deployment actions, and editor persistence are not fully wired to durable services

### 2. AI workflow is mock-oriented

- the AI page sends requests to a service URL, but the complete AI backend orchestration is not fully connected
- code diff application is simulated in the frontend state rather than backed by a complete execution engine

### 3. Database and persistence are not fully connected to the product workflow

- Prisma is configured, but the user-facing flows still rely heavily on in-memory mock data
- repository, workspace, and deployment state are not all persisted end-to-end

### 4. Real deployment orchestration is not live

- deployment actions show realistic UI states but are not yet connected to a full CI/CD pipeline executor
- status transitions are mostly mock-driven and designed for demonstration

### 5. Local environment needs external infrastructure

- Docker services such as Postgres, Redis, and MinIO are expected for a full dev environment
- without those services, some workflows and service health checks will fail or remain incomplete

### 6. UI is heavily polished but still product-prototype oriented

- screen flow is strong and visually coherent
- business logic and persistence layer still need more production-grade implementation to match the ambitious UI

### 7. Mobile app is scaffolded but not deeply integrated

- the mobile app exists, but the full product flow is mostly centered on the web interface

---

## Suggested next milestone roadmap

### Phase 1: Stabilize product core

- connect real auth flow
- persist user and workspace state in database
- move project/workspace state from mock arrays to real API-backed data

### Phase 2: Real runtime orchestration

- integrate repository syncing and devbox creation
- connect deploy pipeline status
- implement log streaming and health checks

### Phase 3: AI and editor productionization

- connect real AI request service
- validate patches before applying them
- persist file state and project snapshots

### Phase 4: Collaboration and ops maturity

- integrate chat, notifications, and remote support events
- finalize concurrency and access control
- support production deployment and monitoring

---

## Local development quick start

```bash
corepack enable
pnpm install
copy .env.example .env
docker compose up -d postgres redis minio
pnpm migrate
pnpm seed
pnpm dev
```

### Main local endpoints

- Web UI: http://localhost:3000
- API health: http://localhost:4000/health
- Socket health: http://localhost:4001/health
- AI health: http://localhost:4002/health
- MinIO console: http://localhost:9001

### Useful repo commands

```bash
make build
make test
make lint
make typecheck
make migrate
make studio
```

---

## Summary

Devpulse is a highly polished developer platform prototype with a convincing end-to-end UX, strong monorepo architecture, and a well-defined product flow. It already demonstrates how a modern engineering workspace could look and operate from login to AI-assisted coding, deployment, and team collaboration.

The biggest opportunity now is to move from the productized mock experience into a real operational system by connecting backend services, persistence, AI orchestration, and deployment execution to the front-end flow.

This makes Devpulse not just a UI demo, but a strong foundation for a real cloud-native developer platform.
