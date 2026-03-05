# TabletopSpells Web

A Progressive Web App for managing D&D 5e and Pathfinder 1e spells, with user accounts and cross-device sync.

## Projects

| Folder | Description |
|--------|-------------|
| `TabletopSpells.Api/` | ASP.NET Core 8 Web API backend |
| `tabletopspells-web/` | Vite + React + TypeScript PWA frontend |

## Tech Stack

- **Frontend**: TypeScript, Vite, React, Tailwind CSS, React Router v6, TanStack Query, Zustand, vite-plugin-pwa
- **Backend**: ASP.NET Core 8, EF Core 8, ASP.NET Core Identity, JWT Bearer auth
- **Database**: PostgreSQL

## Getting Started

### Prerequisites
- Docker Desktop (includes Docker Compose)
- .NET 8 SDK *(only needed for local dev without Docker)*
- Node.js 18+ *(only needed for local dev without Docker)*

### Run with Docker (recommended)

```bash
cd C:\code\TabletopSpellsWeb

# Start everything (postgres + api + web)
docker compose up --build
```

Open **http://localhost:3000** — the app is running.

| Service | URL |
|---------|-----|
| React PWA | http://localhost:3000 |
| PostgreSQL | localhost:5432 (for DB tools like TablePlus/pgAdmin) |

The database migrates automatically on first start. To stop:

```bash
docker compose down          # stop containers (data preserved)
docker compose down -v       # stop + delete database volume
```

To rebuild after code changes:
```bash
docker compose up --build
```

### Secrets

Secrets live in `.env` at the project root (never committed):

```env
POSTGRES_PASSWORD=tabletopspells_local
JWT_KEY=local_dev_jwt_secret_key_must_be_at_least_32_chars!
```

Change `JWT_KEY` to a long random string for any non-local deployment.

### Local Dev (without Docker)

**Backend:**
1. Update `TabletopSpells.Api/appsettings.Development.json` with your PostgreSQL connection string and JWT key
2. `cd TabletopSpells.Api && dotnet run`

**Frontend:**
```bash
cd tabletopspells-web && npm install && npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to `http://localhost:5000`.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET/POST/PUT/DELETE | `/api/characters` | Character CRUD |
| GET | `/api/spells/{game}` | Get spells (dnd5e \| pathfinder1e) |
| GET/PUT/DELETE | `/api/characters/{id}/preparedspells` | Prepared spells |
| GET/PUT | `/api/characters/{id}/spellsperday` | Daily spell slots |
| GET/POST/DELETE | `/api/characters/{id}/spelllogs` | Cast log |
| GET/PUT | `/api/characters/{id}/themes` | Character themes |

## Security

- Passwords are hashed with PBKDF2 + random salt via ASP.NET Core Identity
- All endpoints (except register/login) require a valid JWT Bearer token
- Each user can only access their own characters and related data

## Deployment

- **Backend**: Azure App Service, Railway, Render, or any Docker host
- **Frontend**: Vercel, Netlify, or any static host
- **Database**: Supabase, Railway, or managed PostgreSQL
