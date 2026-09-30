# Running Devpulse Servers

Run these commands from the repository root:

```powershell
cd D:\Devpulse
```

## 1. Install dependencies

```powershell
pnpm install
```

If `pnpm` is not recognized, use `corepack pnpm` instead.

## 2. Configure environment variables

Create `.env` from the example if needed:

```powershell
Copy-Item .env.example .env
```

Set a valid `ANTHROPIC_API_KEY` in `.env` before starting the AI service. Never commit `.env` or expose the API key.

## Quick infrastructure startup

The infrastructure startup scripts check the Docker daemon, start PostgreSQL,
Redis, and MinIO, wait for their health checks, then apply migrations and seed
the database. From the repository root, run one of:

```powershell
.\scripts\start-services.ps1
```

```bash
bash scripts/start-services.sh
```

The scripts keep the existing host mappings: PostgreSQL is `localhost:5433`
(inside Compose it is `postgres:5432`), Redis is `localhost:6379`, and MinIO is
`localhost:9000` with its console on `localhost:9001`.

Start all app services after infrastructure is ready:

```bash
pnpm --parallel --filter @devpulse/api --filter @devpulse/socket --filter @devpulse/ai --filter @devpulse/web dev
```

Check running containers with `docker compose ps`, or run the HTTP/container
health checks with:

```bash
bash scripts/verify-services.sh
```

On Windows, use PowerShell to check each URL:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4001/health
Invoke-RestMethod http://localhost:4002/health
Invoke-WebRequest http://localhost:3000
```

## 3. Start PostgreSQL, Redis, and MinIO

Make sure Docker Desktop is running, then execute:

```powershell
docker compose up -d postgres redis minio
```

Check their status:

```powershell
docker compose ps
```

## 4. Prepare the database

Run these commands once, or after database schema changes:

```powershell
pnpm --filter @devpulse/database db:generate
pnpm migrate
pnpm seed
```

## 5. Start the servers

Open a separate terminal for each command.

### API server

```powershell
pnpm --filter @devpulse/api dev
```

URL: `http://localhost:4000`

### Socket server

```powershell
pnpm --filter @devpulse/socket dev
```

URL: `http://localhost:4001`

### AI server

```powershell
pnpm --filter @devpulse/ai dev
```

URL: `http://localhost:4002`

### Web server

```powershell
pnpm --filter @devpulse/web dev
```

URL: `http://localhost:3000`

Open the web application at `http://localhost:3000`.

## 6. Check server health

Run these commands from another terminal:

```powershell
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4001/health
Invoke-RestMethod http://localhost:4002/health
```

The AI service should return:

```json
{
  "status": "ok",
  "service": "ai"
}
```

## 7. Test AI chat

PowerShell does not use the same quoting syntax as `cmd.exe`. Use this PowerShell example:

```powershell
$body = @{
  messages = @(
    @{
      role = "user"
      content = "Write hello world in Python"
    }
  )
} | ConvertTo-Json -Compress

Invoke-RestMethod `
  -Uri "http://localhost:4002/v1/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## 8. Start everything with Docker

Docker can start the complete development stack:

```powershell
docker compose up
```

Run it in the background:

```powershell
docker compose up -d
```

## 9. Stop services

Stop local infrastructure:

```powershell
docker compose stop postgres redis minio
```

Stop and remove containers and volumes:

```powershell
docker compose down -v
```

`docker compose down -v` deletes database, Redis, and MinIO volumes. Use it
only when you intend to erase local data. `make stop` stops containers while
preserving volumes; `make clean` deletes volumes, and `make reset` deletes
volumes then recreates infrastructure.

Stop a development server running in a terminal with `Ctrl+C`.

## Service URLs

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Socket | http://localhost:4001 |
| AI | http://localhost:4002 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |

## Troubleshooting

### Docker is not running

Start Docker Desktop and wait for its engine to finish starting. On Linux:

```bash
sudo systemctl start docker
docker info
```

If Docker still cannot connect, check Docker Desktop's WSL 2 integration on
Windows or the active Docker context with `docker context ls`.

### Port already in use

Find the process listening on the port before stopping it. For Windows
PowerShell, replace `4000` with the affected port:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID>
Stop-Process -Id <PID>
```

For Linux/macOS:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
kill <PID>
```

If the process is another Compose project, stop only that service/project with
`docker compose stop <service>` or `docker compose down`. Alternatively, change
the host-side port in `docker-compose.yml`; keep the container-side port and
internal service URLs unchanged.

### Volume permission denied

- On Docker Desktop, confirm the drive containing the repository is shared and
  WSL integration is enabled when using WSL.
- On Linux, check ownership of the specific bind-mounted directory and grant
  access to the user/container that needs it; avoid broad `chmod 777` changes.
- For a named-volume issue, inspect `docker compose logs <service>` and the
  volume with `docker volume inspect <volume>` before changing ownership.
- Do not use `docker compose down -v` as a permissions fix unless you intend to
  delete all local database/object-store data.

### Image not found or pull failure

Refresh the configured images and recreate the affected containers:

```bash
docker compose pull
docker compose up -d --force-recreate postgres redis minio api socket ai web
```

Inspect resolved image names with `docker compose config --images`. If an image
tag is unavailable for the machine architecture, choose a supported tag rather
than using `latest` for a production deployment.

### API health check is unreachable

First check container state and logs:

```bash
docker compose ps
docker compose logs --tail=200 postgres redis minio api
```

The API waits for PostgreSQL and Redis, and now waits for MinIO health as well.
The local API health endpoint is `http://localhost:4000/health`. If the
container is healthy but the host cannot connect, check port `4000` conflicts,
firewall rules, and whether the API was started outside Compose with a
host-accessible `DATABASE_URL` (`localhost:5433`, not `postgres:5432`).
