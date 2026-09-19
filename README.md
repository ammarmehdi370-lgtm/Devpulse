# Devpulse

Code. Collaborate. Pulse.

Devpulse is a Turborepo monorepo for the web, API, real-time, AI, and mobile clients.

## Requirements

- Node.js 20+
- pnpm 9+
- Docker Desktop for the local PostgreSQL, Redis, and MinIO services

## Start locally

```bash
corepack enable
pnpm install
copy .env.example .env
docker compose up -d postgres redis minio
pnpm migrate
pnpm seed
pnpm dev
```

Local services:

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- Socket health: http://localhost:4001/health
- AI health: http://localhost:4002/health
- MinIO console: http://localhost:9001

Useful commands:

```bash
make build
make test
make lint
make typecheck
make migrate
make studio
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions. Never commit a real `.env` file or production credentials.