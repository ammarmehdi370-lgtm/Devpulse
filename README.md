# DevPulse

DevPulse is an all-in-one developer workspace for browser-based coding, AI assistance, team communication, and remote collaboration.

## Documentation

- [Architecture and development handbook](docs/DEVPULSE-ARCHITECTURE.md)
- [Local installation](INSTALLATION.md)

The architecture handbook contains the target folder structure, technology decisions, dependency installation commands, environment variables, API and Socket.io contracts, data model, security checklist, deployment plan, and build phases.

## Run locally

Install dependencies from the repository root:

```powershell
npm install
```

Start the current editor services:

```powershell
npm run dev:editor
```

The current frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:5000`.
