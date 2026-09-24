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
