# Devpulse Development Commands

## Requirements

- Node.js 20.10+
- pnpm 9.15+
- Docker Desktop

Enable pnpm through Corepack if needed:

```bash
corepack enable
```

If PowerShell reports that `pnpm` is not recognized, or Corepack cannot write to
`C:\Program Files\nodejs`, use the Corepack-prefixed command instead. It does
not require administrator permissions:

```powershell
corepack pnpm install
```

Use `corepack pnpm` in place of `pnpm` for the remaining commands in this file.

## First-time setup

From the repository root:

```bash
pnpm install
copy .env.example .env
```

On macOS/Linux, use:

```bash
cp .env.example .env
```

Update `.env` with real credentials before using Anthropic, Stripe, OAuth, email, or AWS features.

For local GitHub authentication, configure `GITHUB_CLIENT_ID` and
`GITHUB_CLIENT_SECRET` in `.env`. Register this callback URL on the GitHub OAuth
App and use the `user:email` scope (requested by Devpulse):

```text
http://localhost:4000/api/auth/github/callback
```

Create an OAuth App at GitHub **Settings → Developer settings → OAuth Apps →
New OAuth App**. Set its homepage URL to `http://localhost:3000`. The client ID
and secret belong only in the API environment, never in frontend variables.
Google OAuth uses the callback
`http://localhost:4000/api/auth/google/callback` and requests `profile` and
`email` scopes.

Generate an RS256 keypair and a session secret from the repository root:

```bash
bash apps/api/scripts/generate-keys.sh
openssl rand -hex 32
```

Set the generated value as `SESSION_SECRET`. Keep the private key and OAuth
client secrets out of version control. Apply the checked-in OAuth account
migration and regenerate the client:

```bash
pnpm --filter @devpulse/database exec prisma migrate deploy
pnpm --filter @devpulse/database db:generate
```

For magic-link email delivery, sign up at [Resend](https://resend.com), verify
the sending domain in the Resend dashboard, create an API key, and set
`RESEND_API_KEY`, `EMAIL_FROM`, and `EMAIL_FROM_NAME` in `.env`. Production
magic-link requests fail closed if Redis or Resend is unavailable. Development
and test responses include a one-time token and do not send email.

OAuth access tokens are held in browser memory and delivered in a URL fragment;
the frontend removes the fragment immediately. Refresh tokens are httpOnly
cookies. The Redis-backed OAuth state session expires after ten minutes. The
development magic-link flow returns a verification token in the API response;
production email delivery still requires an email provider integration.

## Database and infrastructure

Start PostgreSQL, Redis, and MinIO:

```bash
docker compose up -d postgres redis minio
```

Check service status:

```bash
docker compose ps
```

View infrastructure logs:

```bash
docker compose logs -f postgres redis minio
```

Generate the Prisma client:

```bash
pnpm --filter @devpulse/database db:generate
```

Create and apply a development migration:

```bash
pnpm migrate
```

Seed demo data:

```bash
pnpm seed
```

Open Prisma Studio:

```bash
pnpm studio
```

Reset the development database and rerun migrations:

```bash
pnpm --filter @devpulse/database exec prisma migrate reset
```

Stop infrastructure:

```bash
docker compose stop postgres redis minio
```

Remove infrastructure containers and local volumes:

```bash
docker compose down -v
```

## Run all applications locally

Start every workspace that has a development script:

```bash
pnpm dev
```

Equivalent Make command:

```bash
make dev
```

The local services use these URLs:

| Service       | URL                          |
| ------------- | ---------------------------- |
| Web frontend  | http://localhost:3000        |
| API           | http://localhost:4000        |
| API health    | http://localhost:4000/health |
| Socket server | http://localhost:4001        |
| Socket health | http://localhost:4001/health |
| AI service    | http://localhost:4002        |
| AI health     | http://localhost:4002/health |
| PostgreSQL    | localhost:5432               |
| Redis         | localhost:6379               |
| MinIO API     | http://localhost:9000        |
| MinIO console | http://localhost:9001        |

## Run the frontend only

```bash
pnpm --filter @devpulse/web dev
```

Open http://localhost:3000.

Production-style frontend build and start:

```bash
pnpm --filter @devpulse/web build
pnpm --filter @devpulse/web start
```

## Run the backend API only

```bash
pnpm --filter @devpulse/api dev
```

Check the API:

```bash
curl http://localhost:4000/health
```

Build and start the API:

```bash
pnpm --filter @devpulse/api build
pnpm --filter @devpulse/api start
```

## Run the real-time Socket.IO server

```bash
pnpm --filter @devpulse/socket dev
```

Build and start it:

```bash
pnpm --filter @devpulse/socket build
pnpm --filter @devpulse/socket start
```

## Run the AI service

Set `ANTHROPIC_API_KEY` in `.env`, then run:

```bash
pnpm --filter @devpulse/ai dev
```

Build and start it:

```bash
pnpm --filter @devpulse/ai build
pnpm --filter @devpulse/ai start
```

## Run the mobile app

Start Expo:

```bash
pnpm --filter @devpulse/mobile dev
```

Run on Android:

```bash
pnpm --filter @devpulse/mobile android
```

Run on iOS:

```bash
pnpm --filter @devpulse/mobile ios
```

Run the Expo web target:

```bash
pnpm --filter @devpulse/mobile web
```

## Run the complete Docker development stack

This starts PostgreSQL, Redis, MinIO, web, API, Socket.IO, AI, and Expo containers with development commands and mounted source files:

```bash
docker compose up
```

Run it in the background:

```bash
docker compose up -d
```

Follow all application logs:

```bash
docker compose logs -f web api socket ai mobile
```

Stop the full stack:

```bash
docker compose down
```

## Validation commands

Run the complete build:

```bash
pnpm build
```

Run all tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Check formatting:

```bash
pnpm format:check
```

Automatically format files:

```bash
pnpm format
```

Equivalent Make commands:

```bash
make build
make test
make lint
make typecheck
make migrate
make seed
make studio
```

## Clean generated output

```bash
pnpm clean
```

To reinstall dependencies completely on Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
pnpm install
```

## Useful logs and shutdown commands

View logs for one service:

```bash
docker compose logs -f api
```

Restart one service:

```bash
docker compose restart api
```

Stop all running containers without removing them:

```bash
docker compose stop
```
