# Devpulse Troubleshooting Guide

Start with the health check to identify the failing dependency:

```bash
make verify
```

On Windows PowerShell, use `make verify-win` or run
`powershell -ExecutionPolicy Bypass -File scripts/verify-services.ps1`.

## Quick Recovery Commands

- Restart infrastructure without deleting data: `docker compose up -d postgres redis minio`
- Reset infrastructure and delete its local data: `make reset` (**destructive**; removes PostgreSQL, Redis, and MinIO volumes)
- Clear Turbo's local task cache: `make clean-cache`
- Reinstall workspace dependencies: `make clean-all`
- Force Turbo to rebuild without using cached results: `pnpm exec turbo run build --force`

To confirm the local Turbo cache is gone after `make clean-cache`:

```bash
test ! -d .turbo && echo "Turbo cache cleared"
```

In Windows PowerShell:

```powershell
if (-not (Test-Path .turbo)) { "Turbo cache cleared" }
```

## Specific Problems and Fixes

### Cannot connect to the database

**Cause:** PostgreSQL is stopped, still starting, or the connection URL has the
wrong port. **Symptoms:** API startup reports `ECONNREFUSED` or Prisma
`P1001`.

1. Start PostgreSQL and wait for its readiness check:

   ```bash
   docker compose up -d postgres
   docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
   ```

2. Check `DATABASE_URL` in `.env`. The host-side URL should use port `5433`
   (for example `localhost:5433`), not the container port `5432`.
3. Inspect `docker compose logs --tail=100 postgres` if it does not become
   healthy.

### Prisma client not found

**Cause:** Prisma Client has not been generated for the current schema or
dependency install. **Symptom:** `Cannot find module '.prisma/client'` or
`Cannot find module '@prisma/client'`. `@prisma/client` includes the runtime;
`prisma generate` creates the schema-specific client code that the runtime
imports, so installing packages alone does not generate it on a fresh clone.

Generate the client:

```bash
pnpm generate
ls packages/database/node_modules/.prisma/
```

The directory should contain `client`. `pnpm migrate` also generates the
client before applying migrations. If generation fails, check the schema with:

```bash
pnpm --filter @devpulse/database validate
```

If `pnpm dev` reports that PostgreSQL, Redis, MinIO, or the Prisma client is
not ready, run `make dev` (or the PowerShell startup script on Windows) to
complete the ordered startup before launching app services.

### Migration failed

**Cause:** The database is unavailable, the schema changed, or migration
history conflicts with the database. **Symptom:** `pnpm migrate` or
`prisma migrate deploy` exits with an error.

1. Confirm PostgreSQL is healthy and inspect migration state:

   ```bash
   make verify
   make db-status
   ```

2. For pending migrations, apply them safely:

   ```bash
   pnpm migrate
   ```

3. For a local development database with conflicting data, reset only if its
   data can be discarded:

   ```bash
   make db-reset
   ```

   **This deletes the development database contents and reseeds it.** Never
   use this option for data that must be preserved or on production.

### Seed failed with a unique constraint

**Cause:** Seed data conflicts with an existing record or an incomplete prior
seed. **Symptom:** Prisma reports `Unique constraint failed`.

The project seed uses upserts for its demo records, so retry once and inspect
the first reported model/constraint if it still fails:

```bash
pnpm seed
```

If a disposable local database needs a clean seed state, use `make db-reset`.
This removes the database contents before applying migrations and reseeding;
do not use it when data must be retained.

### `pnpm install` fails with EACCES or permission denied

**Cause:** Files in the dependency directory are locked or owned by another
user. **Symptoms:** `EACCES`, `EPERM`, or permission-denied errors mentioning
`node_modules`.

1. Close running Node/Expo processes that may be using the affected files.
2. On macOS/Linux, correct ownership only for the dependency directory named
   in the error, then retry:

   ```bash
   sudo chown -R "$(id -un):$(id -gn)" node_modules
   pnpm install
   ```

3. On Windows PowerShell, close processes using dependencies, then reinstall:

   ```powershell
   Remove-Item -Recurse -Force node_modules
   pnpm install
   ```

Do not change ownership or permissions recursively across the whole repository.

### Port already in use

**Cause:** Another process is listening on a development port. **Symptom:**
`EADDRINUSE`.

Find the process using the affected port (shown here for API port 4000):

```bash
# macOS/Linux
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID>
```

Stop only the process you identified and confirmed is safe to close:

```bash
kill <PID>
```

```powershell
Stop-Process -Id <PID>
```

Replace `4000` with the affected port (for example 3000, 4001, 4002, 8081,
5433, 6379, or 9000). Avoid terminating every Node process, since that can stop
unrelated applications.

### Turbo appears to serve stale output

**Cause:** A previous build output was restored from Turbo's task cache.
**Symptoms:** A build does not reflect a source change, especially in a shared
package.

Development tasks are configured with caching disabled. Clear task results,
then rebuild:

```bash
make clean-cache
pnpm build
```

To bypass the cache for a single Turbo run:

```bash
pnpm exec turbo run build --force
```

### MinIO bucket does not exist

**Cause:** Bucket initialization did not complete. **Symptom:** Upload requests
report `NoSuchBucket`.

Check MinIO and initialize the configured bucket:

```bash
docker compose ps minio minio-init
docker compose logs --tail=100 minio minio-init
docker compose run --rm minio-init
```

The default bucket is `devpulse-files`; the console is at
http://localhost:9001. Credentials are configured by `MINIO_ACCESS_KEY` /
`MINIO_SECRET_KEY` or `S3_MINIO_ROOT_USER` / `S3_MINIO_ROOT_PASSWORD` in `.env`.
See [DEVELOPMENT.md](DEVELOPMENT.md#minio-object-storage) for manual console
setup.

### OAuth login does not work

**Cause:** Provider credentials or callback URLs are missing or do not match
the OAuth application. **Symptoms:** The provider is disabled or redirects
fail.

1. Check provider availability:

   ```bash
   curl http://localhost:4000/api/auth/providers
   ```

2. Set the provider's client ID, secret, and callback URL in `.env`.
3. Ensure the provider's registered callback exactly matches the configured
   callback URL, then restart the API.

See [DEVELOPMENT.md](DEVELOPMENT.md#oauth-sign-in-setup) for provider setup.

### AI chat returns an error

**Cause:** The AI service is stopped or `ANTHROPIC_API_KEY` is missing/invalid.
**Symptoms:** AI requests fail or `/health` reports `configured: false`.

```bash
curl http://localhost:4002/health
```

Set a valid `ANTHROPIC_API_KEY` in `.env`, then restart the AI service:

```bash
pnpm --filter @devpulse/ai dev
```

### Email is not sending

**Cause:** `RESEND_API_KEY` is not configured or the sender is not verified.
**Symptoms:** In development, magic-link requests return a one-time token; in
production, the API responds with `503 EMAIL_NOT_CONFIGURED`.

Development's one-time token response is expected when email is not configured.
For production, set a valid `RESEND_API_KEY` and verified `EMAIL_FROM` in the
API environment, then restart the API.

### A service refuses to start

**Cause:** A dependency is unhealthy, its port is occupied, or service
configuration is invalid. **Symptoms:** Container exits/restarts or a
development process exits on startup.

Run the checks and inspect the relevant service logs:

```bash
make verify
docker compose ps
docker compose logs --tail=150 <service>
```

Use the failing check's suggested command, verify `.env`, and retry. For
services run directly by pnpm, inspect the terminal where `pnpm dev` is running.

## Full Stack Reset

Use this only when other recovery steps fail and all local database, Redis, and
MinIO data can be discarded:

```bash
docker compose down -v
make clean-all
make dev
```

`docker compose down -v` permanently deletes the local PostgreSQL, Redis, and
MinIO named volumes. It is not a routine cache or dependency repair command.
