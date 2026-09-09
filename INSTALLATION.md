# DevPulse installation

## Required software

Install these before running the project:

| Tool | Version | Purpose | Check |
| --- | --- | --- | --- |
| Node.js | 20+ (24 recommended) | Frontend, backend, and npm workspaces | `node --version` |
| npm | Included with Node.js | Dependency installation and scripts | `npm --version` |
| PostgreSQL | 15+ | Application database | `psql --version` |
| Python | 3.10+ | Running Python files in the editor | `python --version` |
| Git | Current | Source control | `git --version` |
| g++ / MinGW | Optional | Running C and C++ files | `g++ --version` |
| zrok | Optional | Public tunnel to the frontend or backend | `zrok version` |

On Windows, install Node.js and Git from their official installers. Install Python from python.org and enable **Add Python to PATH**. Install MinGW-w64 if C/C++ execution is needed. Install zrok from `https://zrok.io/download/` and then run `zrok enable <your-account-token>` once.

## Project setup

From the repository root:

```powershell
npm install
npm run build
```

`npm install` installs the frontend, backend, PostgreSQL driver, TypeScript tooling, and the cross-platform process runner.

## Install PostgreSQL on Windows

Install PostgreSQL 17 with WinGet:

```powershell
winget install --id PostgreSQL.PostgreSQL.17 --exact
```

During the installer, remember the password you choose for the `postgres` user and keep the default port `5432`. Then open a new PowerShell window and confirm:

```powershell
psql --version
```

Create the application database. Replace `YOUR_POSTGRES_PASSWORD` with the password you chose during installation:

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE devpulse;"
Remove-Item Env:PGPASSWORD
```

Create a PostgreSQL database named `devpulse`, then set the connection string before starting the backend:

```powershell
$env:DATABASE_URL = "postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/devpulse"
```

The backend creates its application tables automatically when it starts. For persistent local setup, copy `.env.example` to `.env` and replace the password in `DATABASE_URL`.

## Run locally

Start both services with one command:

```powershell
npm run dev:editor
```

Open `http://localhost:5173`. The backend is at `http://localhost:5000`, and its health check is `http://localhost:5000/api/health`.

For separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

## Optional zrok tunnel

With the local services running, expose only the service you need:

```powershell
zrok share public http://localhost:5173
zrok share public http://localhost:5000
```

Do not commit zrok tokens or `.env` files. The tunnel URL is temporary unless configured otherwise in zrok.
