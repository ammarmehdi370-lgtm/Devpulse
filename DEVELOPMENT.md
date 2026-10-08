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

Start infrastructure, run its health checks, and start the web, API,
Socket.IO, and AI services:

```bash
make dev
```

To start just those application services without infrastructure setup, use
`pnpm dev`. Mobile/Expo is intentionally separate; use `pnpm dev:mobile` as
described below. `pnpm dev:all` starts every workspace including mobile.

To run the full service health check independently after starting services:

```bash
make verify
bash scripts/verify-services.sh
```

On Windows, run the PowerShell checker with:

```powershell
make verify-win
```

The verification script exits with status 1 when a required check fails.
Warnings for optional services or credentials do not prevent development.
It checks Docker, PostgreSQL, Redis, MinIO and its bucket, then (for the full
check) the API, Socket.IO, AI service, and web app. It also checks required
environment values and JWT key files. Passing checks appear in green; required
missing/unhealthy dependencies and configuration appear in red with a suggested
command or action. Optional services or features that are stopped or not
configured appear in yellow.

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

## MinIO Object Storage

MinIO provides S3-compatible object storage for uploaded project artifacts.
The bucket is created automatically by Docker Compose when the API starts, and
by `scripts/start-services.sh` during infrastructure setup. The default bucket
is `devpulse-files`; set `MINIO_BUCKET` to use another name.

### Access the MinIO Console

- URL: http://localhost:9001
- Username: `devpulse` by default, or the configured
  `MINIO_ACCESS_KEY` / `S3_MINIO_ROOT_USER`
- Password: `devpulse123` by default, or the configured
  `MINIO_SECRET_KEY` / `S3_MINIO_ROOT_PASSWORD`

### Verify the bucket

With the MinIO Client (`mc`) installed, set an alias and list the bucket:

```bash
mc alias set devpulse-local http://localhost:9000 devpulse devpulse123
mc ls devpulse-local/devpulse-files
```

Replace the credentials and bucket name when using custom environment values.
You can also verify it in the console by opening **Buckets** and confirming
`devpulse-files` is listed.

### Create the bucket manually

1. Open http://localhost:9001.
2. Sign in with the credentials above (or the configured MinIO credentials).
3. Select **Buckets** in the sidebar, then choose **Create Bucket**.
4. Enter `devpulse-files` (or the value of `MINIO_BUCKET`).
5. Choose **Create Bucket** to finish.

### Test an artifact upload

The API stores project artifacts at
`POST /v1/projects/:projectId/artifacts` as JSON with base64-encoded content
(not as a multipart `POST /v1/files`). Use the ID of an existing project:

```bash
curl -X POST http://localhost:4000/v1/projects/<project-id>/artifacts \
  -H "Content-Type: application/json" \
  -d '{"name":"test.txt","contentBase64":"SGVsbG8gRGV2cHVsc2UhCg==","contentType":"text/plain"}'
```

A successful upload returns HTTP 201 with the bucket, object key, and size.

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

## Mobile Development (Expo)

Mobile is excluded from the default `pnpm dev` command and starts separately.
Start the web, API, Socket.IO, and AI services with `pnpm dev`, then start Expo
in another terminal with `pnpm dev:mobile`. `pnpm dev:all` starts every
workspace, including mobile.

### Prerequisites

- Expo CLI is provided by the Expo SDK through `npx expo`; a global Expo CLI
  installation is not required.
- For iOS: Xcode 14+ and an iOS simulator on macOS, or the Expo Go app on a
  physical iPhone.
- For Android: Android Studio with an Android Virtual Device, or the Expo Go
  app on a physical Android device.
- For web: a modern browser.

Install Expo Go from the App Store (iOS) or Google Play (Android) for the
quickest physical-device setup.

### Quick start with Expo Go

1. Start infrastructure and the web/API/Socket.IO/AI application services with
   `make dev`. If infrastructure is already running, `pnpm dev` starts just the
   application services. Wait for the API on port 4000 and Socket.IO on port
   4001.
2. Find your computer's LAN IP:

   ```bash
   bash scripts/get-local-ip.sh
   ```

   On Windows PowerShell, run `ipconfig` and use the IPv4 address of your
   active Wi-Fi or Ethernet adapter.
3. Create `apps/mobile/.env` and replace `<IP>` with the computer's LAN IP:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://<IP>:4000
   EXPO_PUBLIC_SOCKET_URL=http://<IP>:4001
   EXPO_PUBLIC_AI_URL=http://<IP>:4002
   ```

4. Start Expo:

   ```bash
   pnpm dev:mobile
   ```

5. On the phone, open `http://<IP>:4000/health` in a browser and confirm the
   API responds. If it does not load, check the phone and computer are on the
   same network and allow ports 4000-4002 through the computer's firewall.
6. Scan the QR code in the terminal with the iOS Camera app or the Expo Go
   app on Android. Keep the phone and development computer on the same network.

Do not use `localhost` or `127.0.0.1` for a physical phone: those addresses
refer to the phone itself. The app displays a warning on native platforms when
its API URL is set to localhost. Android Emulator can reach the development
computer at `10.0.2.2`; iOS Simulator can usually use `localhost`.

### Android emulator

1. Install Android Studio and create an Android Virtual Device (AVD).
2. Start the emulator.
3. Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`,
   `EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:4001`, and
   `EXPO_PUBLIC_AI_URL=http://10.0.2.2:4002` in `apps/mobile/.env`.
4. Run:

   ```bash
   pnpm --filter @devpulse/mobile android
   ```

### iOS simulator (macOS only)

1. Install Xcode 14+ and start an iOS simulator.
2. Run:

   ```bash
   pnpm --filter @devpulse/mobile ios
   ```

### Web browser

Run:

```bash
pnpm --filter @devpulse/mobile web
```

Expo starts the web target and prints its local URL in the terminal.

### Common issues

- **“Network request failed” on a phone:** confirm the phone and computer share
  a network, set the three `EXPO_PUBLIC_*_URL` values to the computer's LAN IP,
  and make sure the OS firewall allows ports 4000-4002.
- **Metro bundler does not start:** run
  `pnpm --filter @devpulse/mobile dev -- --clear`.
- **Module not found:** run `pnpm install`, then `pnpm dev:mobile`.
- **Expo Go version mismatch:** update Expo Go on the phone. This project uses
  Expo SDK 52; a native development build may be needed if the installed Expo Go
  no longer supports that SDK.

## Run the complete Docker development stack

This explicitly starts PostgreSQL, Redis, MinIO, web, API, Socket.IO, AI, and
the Expo mobile container with development commands and mounted source files:

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
