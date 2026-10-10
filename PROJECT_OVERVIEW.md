# Devpulse Overview

## Achievements

- Built a monorepo-based platform for the web app, API, real-time socket service, AI service, and mobile client under a single workspace.
- Organized the project with a Turborepo structure for coordinated local development, builds, migrations, and service orchestration.
- Configured a full local infrastructure stack using Docker Compose with PostgreSQL, Redis, and MinIO.
- Established clear service boundaries for the frontend, backend, real-time layer, and AI layer while keeping them connected through shared configuration and health checks.
- Added developer workflow scripts for starting services, applying migrations, seeding demo data, running verification checks, and resetting the local environment.
- Prepared the project structure for production-style integrations such as authentication, email delivery, AI providers, and object storage.
- Included mobile development support with Expo, enabling cross-platform frontend development alongside the web app.
- Documented setup, verification, troubleshooting, and environment configuration to make onboarding and maintenance easier.

## Flow

1. Environment setup
   - Install Node.js and pnpm.
   - Enable Corepack if needed.
   - Copy the environment template to a local `.env` file.

2. Infrastructure startup
   - Start required services with Docker Compose.
   - Bring up PostgreSQL, Redis, and MinIO before the app services rely on them.

3. Database initialization
   - Generate Prisma client artifacts.
   - Run database migrations.
   - Seed the project with demo data when needed.

4. Application startup
   - Start the web app, API, Socket.IO service, and AI service.
   - Use service health checks to confirm each component is running correctly.

5. Development and maintenance
   - Run linting, type checking, tests, and builds through the workspace tooling.
   - Continue working across the monorepo while keeping the shared infrastructure and environment conventions intact.

## Blockers / Constraints

- Production credentials and secrets are required for integrations such as GitHub, Google, Resend, and Anthropic.
- Docker Desktop or an equivalent container runtime is required to run PostgreSQL, Redis, and MinIO locally.
- Missing or invalid environment variables can prevent core services from starting correctly.
- Some identity and email features are optional in local development but become mandatory when enabled in production-like flows.
- Local app health depends on the database, Redis, and service ports being available and responding as expected.
- Without a valid `.env` file, the project may not boot correctly or may run in a reduced feature state.

## Requirements

### Core technical requirements

- Node.js 20.10 or newer
- pnpm 9 or newer
- Docker Desktop or a compatible local container environment
- Git for repository management

### Environment requirements

- A repository-root `.env` file copied from `.env.example`
- Database credentials and service environment values configured correctly
- Optional OAuth credentials for GitHub and Google
- Optional email service credentials for Resend
- Optional AI provider key for Anthropic

### Local runtime services

- PostgreSQL
- Redis
- MinIO
- API on port 4000
- Socket service on port 4001
- AI service on port 4002
- Web app on port 3000
- Mobile development via Expo

### Common project commands

```bash
pnpm install
pnpm migrate
pnpm seed
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
docker compose up -d postgres redis minio
```

## Summary

Devpulse is structured as a multi-service development platform that supports local full-stack development in a single monorepo. The main success factors are a correct environment setup, valid credentials, healthy infrastructure services, and a consistent workflow for running the stack locally.
