# Devpulse Project Summary

## Achievements

- Built a monorepo-based platform for web, API, real-time socket, AI, and mobile services under one workspace.
- Configured a full local development stack using Docker Compose with PostgreSQL, Redis, MinIO, and the app services.
- Established a multi-service architecture where each application runs independently but connects through shared environment variables and service health checks.
- Added a project-level setup using Node.js 20, pnpm 9, and Turbo repo orchestration for local development, linting, type-checking, migrations, and builds.
- Prepared the environment for authentication, email, AI integration, storage, and database workflows through service configuration.
- Included a mobile app service in the stack to support cross-platform frontend development alongside the web app.
- Organized the repo for practical developer workflows with migration, seeding, and studio commands.

## Flow

1. Repository setup and bootstrap
   - Install dependencies with pnpm.
   - Enable Corepack for the correct package manager setup.
   - Copy the environment template to a local .env file.

2. Infrastructure startup
   - Start required local services with Docker Compose.
   - Bring up PostgreSQL, Redis, and MinIO before main app services.

3. Database and schema preparation
   - Run Prisma generation and migrations.
   - Seed the database with initial data if needed.

4. Application startup
   - Start the web app, backend API, socket service, and AI service.
   - Each service has its own port and health endpoint.

5. Development and maintenance
   - Use Turbo and package-level scripts to run builds, tests, formatting, and type checks.
   - Continue service development without disrupting the shared monorepo workflow.

## Blockers / Constraints

- External API secrets and environment values are required for production-like integrations such as GitHub, GitLab, Google, Resend, and Anthropic.
- Docker Desktop or equivalent container support is required for local development services.
- The app depends on valid local credentials and service readiness; if the database or Redis start incorrectly, dependent services may fail to boot.
- Some integrations are optional in local development but become required once features are enabled, especially AI and authentication providers.
- A proper .env file must exist for the API and service environment configuration; missing environment values may prevent the stack from starting as expected.
- Local service health checks depend on the Node app endpoints being reachable on the expected ports.

## Requirements

### Core technical requirements
- Node.js 20.10.0 or newer
- pnpm 9 or newer
- Docker Desktop or a compatible Docker environment
- Git for repository management

### Environment requirements
- Local .env file copied from .env.example
- Database credentials and service secrets configured in environment variables
- Optional OAuth credentials for GitHub, GitLab, and Google
- Optional email API key for Resend
- Optional AI API key for Anthropic

### Runtime services required locally
- PostgreSQL on port 5433
- Redis on port 6379
- MinIO on ports 9000 and 9001
- API on port 4000
- Socket on port 4001
- AI on port 4002
- Web on port 3000
- Mobile app via Expo on port 8081 and associated Expo ports

### Project commands
- pnpm install
- pnpm migrate
- pnpm seed
- pnpm dev
- pnpm lint
- pnpm typecheck
- pnpm build
- docker compose up -d postgres redis minio

## Notes

This project is structured for rapid local development and multi-service collaboration. The main success factors are the correct dependency installation, valid environment values, and a healthy local infrastructure foundation.
