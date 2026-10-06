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

## OAuth sign-in setup

OAuth credentials are server-side secrets. Put them in the repository-root
`.env` only; do not add them to `NEXT_PUBLIC_*` variables or commit `.env`.
The API can start without OAuth credentials. The login screen queries
`GET /api/auth/providers` and disables providers that are not configured.

### GitHub (local development)

1. Sign in to GitHub and open **Settings → Developer settings → OAuth Apps**.
2. Select **New OAuth App**.
3. Enter:
   - **Application name:** `Devpulse (Dev)`
   - **Homepage URL:** `http://localhost:3000`
   - **Application description:** `Devpulse development`
   - **Authorization callback URL:** `http://localhost:4000/api/auth/github/callback`
4. Select **Register application** and copy the **Client ID** from the app page.
5. Select **Generate a new client secret** and copy it immediately; GitHub
   displays the secret only once.
6. Set the values in the repository-root `.env`:

   ```dotenv
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
   ```

The API requests GitHub's `user:email` scope. For production, create a separate
OAuth App with homepage `https://devpulse.io` and callback
`https://api.devpulse.io/api/auth/github/callback`; use its credentials only in
the production API environment.

### Google (local development)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a
   project named `Devpulse`, or select the existing Devpulse project.
2. Configure the OAuth consent screen (branding, audience, and test users as
   needed for the project).
3. In **APIs & Services → Library**, enable **People API** if the project
   requires it. Google+ API is retired and should not be used.
4. Open **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
5. Select **Web application** and name it `Devpulse Dev`.
6. Add this **Authorized redirect URI**:
   `http://localhost:4000/api/auth/google/callback`
7. Create the client, then copy its **Client ID** and **Client Secret**.
8. Set the values in the repository-root `.env`:

   ```dotenv
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
   ```

The API requests the `profile` and `email` scopes. Restart the API after editing
`.env`; the strategies are registered at API startup. Production must use a
separate Google OAuth client and the production callback URL
`https://api.devpulse.io/api/auth/google/callback`.

### Verify OAuth configuration

With the API running, inspect provider availability:

```bash
curl http://localhost:4000/api/auth/providers
```

The response has boolean `github`, `google`, and `magicLink` fields. An OAuth
provider is enabled only when its client ID, client secret, and callback URL are
all set. When disabled, its `/api/auth/{provider}` endpoint returns HTTP 503
with `OAUTH_NOT_CONFIGURED`.

To verify GitHub end to end:

1. Open the Devpulse login page and select **Continue with GitHub**.
2. Confirm the GitHub authorization page appears.
3. Select **Authorize**.
4. Confirm the browser returns through `/auth/callback` and signs in to Devpulse.
5. Confirm the signed-in user is visible in the app's top bar.

Repeat the flow with **Continue with Google** to verify Google sign-in.

## Generating JWT Keys

Generate an RS256 key pair once before starting the API. From the repository
root, run one of:

```bash
bash apps/api/scripts/generate-keys.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File apps/api/scripts/generate-keys.ps1
```

The scripts create `apps/api/keys/private.pem` and `public.pem`. The paths in
`.env` are resolved from either the API package directory or repository root:

```dotenv
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
```

Verify the private key:

```bash
openssl rsa -in apps/api/keys/private.pem -check -noout
```

The key files are excluded by `.gitignore`. Never commit or share
`private.pem`. Regenerating replaces neither file when both keys already
exist; remove `apps/api/keys/*.pem` first to create a new pair.

Generate a session secret separately:

```bash
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
| PostgreSQL    | localhost:5433               |
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

## Run Playwright E2E tests

Install the workspace dependencies and Chromium:

```bash
pnpm install --filter @devpulse/web --frozen-lockfile
pnpm --dir apps/web exec playwright install chromium
```

On Linux/CI, also install Chromium's system dependencies:

```bash
pnpm --dir apps/web exec playwright install-deps chromium
```

Verify Docker, the test-mode API, environment variables, JWT keys, seeded demo
user, and Chromium before running tests:

```bash
bash scripts/verify-e2e-ready.sh
```

Local runs use one worker by default to avoid overwhelming the Next.js
development server; pass `--workers=N` to override it.

Run one headed smoke test, then the editor suite:

```bash
pnpm --dir apps/web exec playwright test tests/editor/loading-states.spec.ts --grep "project loading skeleton" --headed --timeout 30000
pnpm --filter @devpulse/web test:e2e:editor
```

The local Playwright reporter writes `apps/web/playwright-report`. Open the HTML
report in a browser with:

```bash
pnpm --dir apps/web exec playwright show-report
```

The report lists each test's result and duration. Select a failed test to inspect
its error, screenshot, video, or trace. The `make e2e-report` target opens the
same report.

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
