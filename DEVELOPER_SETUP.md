# TabletopSpells — Developer Setup Guide

A Progressive Web App for managing D&D 5e and Pathfinder 1e spells, characters, and party sessions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Running with Docker (LAN / Home Network)](#running-with-docker-lan--home-network)
5. [Deploying to a VPS (Public Hosting)](#deploying-to-a-vps-public-hosting)
6. [Local Development (Without Docker)](#local-development-without-docker)
7. [Database Access (PostgreSQL)](#database-access-postgresql)
8. [EF Core Migrations](#ef-core-migrations)
9. [Admin Account](#admin-account)
10. [API Reference](#api-reference)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend PWA | React 19 + Vite 7 + TypeScript + Tailwind CSS 4 | `5173` (dev) / `443` (Docker via Caddy) |
| Backend API | ASP.NET Core 8 + EF Core 8 + JWT Auth | `8080` (internal Docker only) |
| Database | PostgreSQL 16 | `5432` |
| Reverse proxy | Caddy (auto-HTTPS) | `80` → redirect, `443` → HTTPS |

In Docker, Caddy handles HTTPS and proxies all traffic to the API container, which serves both the API and the built React frontend. In local dev, Vite proxies `/api/*` to `localhost:3000`.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Includes Docker Compose |
| [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) | 8.0+ | Only needed for local dev / running migrations |
| [Node.js](https://nodejs.org/) | 18+ | Only needed for local dev |
| A PostgreSQL client | Any | For direct DB access — see [Database Access](#database-access-postgresql) |

---

## Environment Configuration

The project uses a `.env` file in the **repository root** for all secrets. This file is never committed.

**Copy `.env.example` to create your `.env`:**

```bash
cp .env.example .env   # Linux/Mac
copy .env.example .env  # Windows
```

Then edit `.env` with real values. All four variables are required:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_KEY` | JWT signing key — minimum 32 characters |
| `CHAT_MASTER_KEY` | Chat encryption master key — minimum 32 characters |
| `SERVER_HOSTNAME` | Caddy hostname(s) — comma-separated, no spaces |

**Generate strong secrets** (for production, never reuse dev values):

```bash
# Linux/Mac/WSL
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

**`SERVER_HOSTNAME` examples:**
- LAN: `192.168.1.50,localhost`
- VPS: `yourdomain.com`

The API reads these at runtime via `docker-compose.yml` environment injection — no hardcoded secrets in source code.

---

## Running with Docker (LAN / Home Network)

This runs the full stack on your machine, accessible from any device on your local network over HTTPS.

### Step 1 — Configure `.env`

Set `SERVER_HOSTNAME` to your machine's LAN IP(s):

```env
POSTGRES_PASSWORD=tabletopspells_local
JWT_KEY=local_dev_jwt_secret_key_must_be_at_least_32_chars!
CHAT_MASTER_KEY=local_dev_chat_master_key_change_in_production!
SERVER_HOSTNAME=192.168.1.50,localhost
```

Find your IP:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" }).IPAddress
```

### Step 2 — Start the stack

```bash
docker compose up --build
```

### Step 3 — Trust the Caddy root CA

Caddy generates a private CA and issues TLS certificates automatically. Install the root CA once per device for a green padlock and full PWA install support.

**Export the cert:**
```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

**Install on Windows (PC):**
```powershell
certutil -addstore -f "ROOT" caddy-root.crt
```

**Install on Android:**
1. Copy `caddy-root.crt` to your phone (email it to yourself)
2. Settings → Security → Install from storage → Select the file
3. Name it "TabletopSpells CA" → Install as CA certificate

**Install on iOS / iPadOS:**
1. Email `caddy-root.crt` to yourself and open it → Settings offers to install a profile
2. After installing: **Settings → General → About → Certificate Trust Settings → Toggle on**

**Install on macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-root.crt
```

### Step 4 — Access the app

```
https://<your-server-ip>
```

The app is fully installable as a PWA. Use "Add to Home Screen" in your browser.

**Windows Firewall** — if other devices can't connect, allow ports 80 and 443 inbound (Private profile only):
```powershell
New-NetFirewallRule -DisplayName "TabletopSpells HTTP (80)"  -Direction Inbound -Protocol TCP -LocalPort 80  -Profile Private,Domain -Action Allow
New-NetFirewallRule -DisplayName "TabletopSpells HTTPS (443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Profile Private,Domain -Action Allow
```

| Service | URL |
|---------|-----|
| App | `https://<your-ip>` |
| API | `https://<your-ip>/api/` |
| PostgreSQL | `localhost:5432` (local DB clients only) |

---

## Deploying to a VPS (Public Hosting)

Hosting on a VPS gives you a public URL with a real HTTPS certificate — no CA installation on any device needed.

### Prerequisites

- A VPS running Linux (Ubuntu 22.04+ recommended) with Docker and Docker Compose installed
- A domain name pointed at the VPS IP (A record: `yourdomain.com` → `<VPS-IP>`)
- Ports 80 and 443 open in the VPS firewall

### Step 1 — SSH to the VPS and clone the repo

```bash
ssh user@your-vps-ip
git clone <repo-url>
cd TabletopSpellsWeb
```

### Step 2 — Generate strong secrets and create `.env`

```bash
# Generate each secret separately
openssl rand -base64 32  # run three times: once for each key

# Create your .env
cat > .env << 'EOF'
POSTGRES_PASSWORD=<strong-random-value>
JWT_KEY=<strong-random-value>
CHAT_MASTER_KEY=<strong-random-value>
SERVER_HOSTNAME=yourdomain.com
EOF
```

> ⚠️ **Never reuse LAN/dev secrets in production.** Generate fresh values for each.

### Step 3 — Update the Caddyfile for your domain

Open `Caddyfile` and remove the `tls internal` line (and the `local_certs` global block). With a real domain, Caddy gets a free Let's Encrypt cert automatically:

```caddy
{$SERVER_HOSTNAME} {
    reverse_proxy api:8080
}
```

### Step 4 — Start the stack

```bash
docker compose up --build -d
```

Caddy will automatically obtain a Let's Encrypt certificate for your domain. Give it 30–60 seconds on first start.

### Step 5 — Verify

```bash
docker compose logs caddy   # should show "certificate obtained successfully"
docker compose logs api     # should show "Application started"
```

Then visit `https://yourdomain.com` — you should get a green padlock and the fully installable PWA with no cert warnings on any device.

### Common Docker Compose operations

```bash
docker compose down          # Stop containers, keep database
docker compose down -v       # Stop containers AND delete all data
docker compose up --build -d # Rebuild and restart after code changes
docker compose pull && docker compose up -d  # If using pre-built images
```

### Minimum VPS sizing

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 512 MB | 1 GB |
| CPU | 1 vCPU | 1–2 vCPU |
| Disk | 5 GB | 10 GB |

A standard 1 GB RAM VPS (~15–30 DKK/month from providers like suble.io) is more than sufficient for a personal/small-group deployment.

---

## Local Development (Without Docker)

Use this workflow when you need faster iteration on a single component.

### Step 1 — Start PostgreSQL

The easiest option is still to run only the database in Docker:

```bash
docker compose up -d postgres
```

Alternatively, use a local PostgreSQL 16 installation. Make sure a database named `tabletopspells` exists:

```sql
CREATE DATABASE tabletopspells;
```

### Step 2 — Configure the API

Edit `TabletopSpells.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=tabletopspells;Username=postgres;Password=YOUR_PASSWORD"
  },
  "Jwt": {
    "Key": "local_dev_jwt_secret_key_must_be_at_least_32_chars_long!",
    "Issuer": "TabletopSpellsApi",
    "Audience": "TabletopSpellsWeb"
  },
  "Cors": {
    "AllowedOrigins": [ "http://localhost:5173" ]
  },
  "Chat": {
    "MasterKey": "local_dev_chat_master_key_change_in_production!"
  }
}
```

### Step 3 — Run the API

```bash
cd TabletopSpells.Api
dotnet run
# API starts on http://localhost:5000 (HTTP) and https://localhost:5001 (HTTPS)
```

Migrations run automatically on startup.

### Step 4 — Run the Frontend

```bash
cd tabletopspells-web
npm install
npm run dev
# Vite starts on http://localhost:5173
# /api/* is proxied to http://localhost:3000 (change in vite.config.ts if your API runs elsewhere)
```

> **Note:** The Vite proxy target in `vite.config.ts` is set to `http://localhost:3000`. If running the API locally (not in Docker), change this to `http://localhost:5000`.

---

## Database Access (PostgreSQL)

### Connection details

| Field | Docker default | Local dev default |
|-------|---------------|-------------------|
| Host | `localhost` | `localhost` |
| Port | `5432` | `5432` |
| Database | `tabletopspells` | `tabletopspells` |
| Username | `postgres` | `postgres` |
| Password | Value from `.env` → `POSTGRES_PASSWORD` | As configured |

### Using psql (command line)

```bash
# Connect via Docker exec (no local psql needed)
docker exec -it tabletopspellsweb-postgres-1 psql -U postgres -d tabletopspells

# Or with local psql installed
psql -h localhost -p 5432 -U postgres -d tabletopspells
```

Useful queries once connected:

```sql
-- List all tables
\dt

-- View all users
SELECT id, "UserName", "NormalizedUserName" FROM "AspNetUsers";

-- View all characters
SELECT id, "Name", "CharacterClass", "Level", "UserId" FROM "Characters";

-- Check prepared spells
SELECT c."Name", p."SpellIndex", p."IsPrepared", p."IsAlwaysPrepared"
FROM "PreparedSpells" p
JOIN "Characters" c ON c."Id" = p."CharacterId"
ORDER BY c."Name";

-- Exit
\q
```

### Using pgAdmin (GUI)

1. Download and install [pgAdmin 4](https://www.pgadmin.org/download/)
2. Right-click **Servers** → **Register → Server**
3. Fill in the **General** tab:
   - Name: `TabletopSpells Local`
4. Fill in the **Connection** tab:
   - Host: `localhost`
   - Port: `5432`
   - Maintenance database: `tabletopspells`
   - Username: `postgres`
   - Password: value from your `.env` file
5. Click **Save**

### Using DBeaver or TablePlus

Use the same connection string:
```
postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/tabletopspells
```

---

## EF Core Migrations

Migrations are applied automatically on API startup. To manage them manually:

```bash
cd TabletopSpells.Api

# List existing migrations
dotnet ef migrations list

# Add a new migration
dotnet ef migrations add <MigrationName>

# Apply migrations manually (also done automatically on startup)
dotnet ef database update

# Generate SQL script for a migration (useful for review before applying)
dotnet ef migrations script

# Roll back to a specific migration
dotnet ef database update <PreviousMigrationName>
```

> Requires `dotnet-ef` tool: `dotnet tool install --global dotnet-ef`

---

## Admin Account

On first startup, a seeded admin account is created automatically. The **password is randomly generated** and printed once to the container logs:

```bash
# View the generated admin password
docker compose logs api | grep -A5 "Admin account created"
```

Output will look like:
```
=================================================
  Admin account created
  Username : admin
  Password : Admin-a1b2c3d4e5f6g7h8i9j0k1
  Change this password after first login.
=================================================
```

> If the admin account already exists (e.g., after a container restart), this message will not appear again. The password is **not stored in plaintext anywhere** after initial creation.

---

## Chat Encryption

Chat messages are encrypted at rest using **AES-256-GCM** with a per-conversation key.
Each conversation key is itself wrapped (AES-256-CBC) using a server master key — `Chat:MasterKey` — so that a database breach alone cannot decrypt messages.

### Setting the master key

Add `CHAT_MASTER_KEY` to your `.env` file and `Chat.MasterKey` to `appsettings.Development.json`.

Generate a strong key:
```bash
openssl rand -base64 48
```

> ⚠️ **Never rotate `CHAT_MASTER_KEY` in production without first re-wrapping all existing conversation keys.** Rotating the key invalidates all stored conversation keys, making existing messages permanently unreadable. This tooling does not currently exist; treat the master key as immutable once messages have been sent.

---

## API Reference

All endpoints (except `/api/auth/*`) require a JWT Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ username, password }` | Create account |
| POST | `/api/auth/login` | `{ username, password }` | Returns JWT token |

Password requirements: minimum 8 characters, at least one digit.

### Characters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/characters` | List your characters |
| POST | `/api/characters` | Create a character |
| GET | `/api/characters/{id}` | Get character details |
| PUT | `/api/characters/{id}` | Update character |
| DELETE | `/api/characters/{id}` | Delete character |
| PATCH | `/api/characters/{id}/hp` | Update HP |
| POST | `/api/characters/{id}/avatar` | Upload avatar image (JPEG/PNG/WebP/GIF, max 8 MB) |

### Spells

| Method | Endpoint | Query Params | Description |
|--------|----------|-------------|-------------|
| GET | `/api/spells/{game}` | `search`, `level` | Get all spells (`dnd5e` or `pathfinder1e`) |
| GET | `/api/characters/{id}/preparedspells` | | Get prepared/known spells |
| PUT | `/api/characters/{id}/preparedspells/{spellIndex}` | | Toggle prepared state |
| GET | `/api/characters/{id}/spellsperday` | | Get spell slot config |
| PUT | `/api/characters/{id}/spellsperday` | | Update spell slots |
| POST | `/api/characters/{id}/spelllogs` | | Log a spell cast |
| DELETE | `/api/characters/{id}/spelllogs` | | Clear cast log (long rest) |

### Game Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamerooms` | List your game rooms |
| POST | `/api/gamerooms` | Create a game room (DM) |
| POST | `/api/gamerooms/join` | Join via invite code |
| GET | `/api/gamerooms/{id}` | Room details + party |

### Chat

All chat endpoints require authentication. Messages are encrypted server-side; the API returns plaintext to authenticated participants.

The real-time WebSocket hub is at `/hubs/chat`. Connect using `@microsoft/signalr` and pass the JWT via query string (`?access_token=<token>`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | List your conversations (with unread count) |
| POST | `/api/chat/conversations/direct` | Get-or-create a DM with another user (`{ targetUserId }`) |
| POST | `/api/chat/conversations/group` | Create a named group chat (`{ name, participantUserIds[] }`) |
| GET | `/api/chat/conversations/{id}` | Get conversation details + participant list |
| POST | `/api/chat/conversations/{id}/participants` | Add a participant (Group admin only, `{ userId }`) |
| DELETE | `/api/chat/conversations/{id}/participants/{userId}` | Remove participant or leave |
| GET | `/api/chat/conversations/{id}/messages` | Paginated history (`?before=<msgId>&limit=50`) |
| POST | `/api/chat/conversations/{id}/messages` | Send a message (`{ content }`) |
| DELETE | `/api/chat/conversations/{id}/messages/{msgId}` | Soft-delete own message |
| POST | `/api/chat/conversations/{id}/read` | Mark conversation as read |

**SignalR hub methods (client → server):**
- `JoinConversation(conversationId)` — subscribe to real-time updates
- `LeaveConversation(conversationId)` — unsubscribe
- `SendMessage(conversationId, content)` — send via WebSocket

**SignalR events (server → client):**
- `ReceiveMessage(MessageDto)` — new message
- `ConversationCreated(ConversationDto)` — you were added to a new conversation
- `ParticipantAdded(conversationId, ChatParticipantDto)` — someone joined
- `ParticipantRemoved(conversationId, userId)` — someone left
- `MessageDeleted(conversationId, messageId)` — message was deleted

---

## Troubleshooting

**Container fails to start with "password authentication failed"**
> Your `.env` file is missing or `POSTGRES_PASSWORD` doesn't match. Delete the volume and recreate:
> ```bash
> docker compose down -v && docker compose up --build
> ```

**API returns 401 on all requests**
> Your JWT token has expired (default: 24 hours) or `JWT_KEY` changed. Log in again to get a fresh token.

**Migrations fail on startup**
> Usually means the database isn't ready yet. The Docker healthcheck should prevent this, but if it happens locally, run `dotnet ef database update` manually after ensuring PostgreSQL is running.

**`npm run dev` — `/api` requests fail with connection refused**
> The API isn't running, or the Vite proxy target in `vite.config.ts` doesn't match where the API is listening. Default proxy target is `http://localhost:3000` (Docker port). For local API dev, change to `http://localhost:5000`.

**Avatar upload returns 400 "File must be a valid image"**
> The uploaded file's actual content doesn't match a supported image format. The API validates by magic bytes, not file extension. Supported formats: JPEG, PNG, GIF, WebP.
