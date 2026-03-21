# TabletopSpells — VPS Deployment Guide

A complete, step-by-step guide for deploying TabletopSpells to a public VPS.
When done, you'll have a fully HTTPS-secured, publicly accessible PWA with a free
Let's Encrypt certificate — no certificate installation needed on any device.

---

## Prerequisites

Before you start, you need:

- [ ] A **VPS** running Ubuntu 22.04+ (e.g. suble.io BXS s0 or larger)
- [ ] A **domain name** with an A record pointing to your VPS IP  
      e.g. `tabletopspells.yourdomain.com` → `<VPS-IP>`  
      DNS changes can take up to 24 hours to propagate (usually minutes)
- [ ] **SSH access** to the VPS (password or SSH key)
- [ ] A **Git remote** for this repo (GitHub, GitLab, etc.)

> **Minimum VPS spec:** 1 vCPU, 1 GB RAM, 10 GB disk.  
> Recommended: 1 vCPU, 2 GB RAM (e.g. suble.io BXS s0 at 30 DKK/month).

---

## Step 1 — SSH into the VPS

```bash
ssh root@<your-vps-ip>
# or if you created a non-root user:
ssh youruser@<your-vps-ip>
```

---

## Step 2 — Install Docker and Docker Compose

```bash
# Update package list
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (skip if running as root)
usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

> If you added yourself to the docker group, log out and back in for it to take effect.

---

## Step 3 — Configure the firewall (UFW)

Only allow SSH, HTTP, and HTTPS:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verify
ufw status
```

Expected output:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

> PostgreSQL (5432) is intentionally not opened — the database is internal-only.

---

## Step 4 — Clone the repository

```bash
cd /opt
git clone <your-repo-url> tabletopspells
cd tabletopspells
```

---

## Step 5 — Generate strong secrets

Run this command **three times** — once for each secret. Copy each output.

```bash
openssl rand -base64 32
```

You'll get values like:
```
K3mP9xQz7vL2wN8rT4yH6jF0bC1dA5eI
```

---

## Step 6 — Create the `.env` file

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```env
POSTGRES_PASSWORD=<paste first openssl output>
JWT_KEY=<paste second openssl output>
CHAT_MASTER_KEY=<paste third openssl output>
SERVER_HOSTNAME=tabletopspells.yourdomain.com
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

> ⚠️ Never share or commit this file. It stays on the server only.

---

## Step 7 — Update the Caddyfile for production

On a VPS with a real domain, Caddy gets a free Let's Encrypt certificate automatically.
You need to remove the two lines that force local/internal certificates.

```bash
nano Caddyfile
```

The file currently looks like this:

```caddy
{
    local_certs
}

{$SERVER_HOSTNAME} {
    tls internal   # <-- remove this line for VPS / real domain
    reverse_proxy api:8080
}
```

**Change it to this** (remove the `local_certs` block and `tls internal` line):

```caddy
{$SERVER_HOSTNAME} {
    reverse_proxy api:8080
}
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

---

## Step 8 — Build and start the stack

```bash
docker compose up --build -d
```

This will:
1. Build the .NET API + React frontend into a single container
2. Start PostgreSQL, the API, and Caddy
3. Automatically run database migrations
4. Request a Let's Encrypt certificate for your domain

First build takes 3–5 minutes. Watch progress with:

```bash
docker compose logs -f
```

Press `Ctrl+C` to stop watching logs (containers keep running).

---

## Step 9 — Verify the deployment

### Check all containers are running

```bash
docker compose ps
```

Expected output:
```
NAME                          STATUS
tabletopspells-postgres-1     Up (healthy)
tabletopspells-api-1          Up
tabletopspells-caddy-1        Up
```

### Check Caddy got a Let's Encrypt certificate

```bash
docker compose logs caddy | grep "certificate obtained"
```

Expected output:
```
certificate obtained successfully  identifier=tabletopspells.yourdomain.com  issuer=acme-v02.api.letsencrypt.org
```

### Check the API started correctly

```bash
docker compose logs api | grep "Application started"
```

### Open the app in a browser

```
https://tabletopspells.yourdomain.com
```

You should see a green padlock and the TabletopSpells login page.

---

## Step 10 — Get the admin password

On first startup, the API creates an admin account with a randomly generated password
and prints it to the logs **once**:

```bash
docker compose logs api | grep -A5 "Admin account"
```

Expected output:
```
=================================================
  Admin account created
  Username : admin
  Password : Admin-a1b2c3d4e5f6g7h8i9j0k1
  Change this password after first login.
=================================================
```

> **Write this password down.** It is not stored in plaintext anywhere and won't appear again.

Log in at `https://tabletopspells.yourdomain.com` with `admin` and the password above.
Change the password in the app after first login.

---

## Ongoing Maintenance

### Update to a new version

```bash
cd /opt/tabletopspells
git pull
docker compose up --build -d
```

### View live logs

```bash
docker compose logs -f          # all services
docker compose logs -f api      # API only
docker compose logs -f caddy    # Caddy only
```

### Restart a service

```bash
docker compose restart api
docker compose restart caddy
```

### Stop everything

```bash
docker compose down             # stops containers, keeps database
docker compose down -v          # stops containers AND deletes all data ⚠️
```

### Access the database (from the VPS)

```bash
docker exec -it tabletopspells-postgres-1 psql -U postgres -d tabletopspells
```

---

## Backup and Restore

### Backup the database

```bash
docker exec tabletopspells-postgres-1 \
  pg_dump -U postgres tabletopspells \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from backup

```bash
# Stop the API first (keep postgres running)
docker compose stop api

# Restore
docker exec -i tabletopspells-postgres-1 \
  psql -U postgres tabletopspells < backup_YYYYMMDD_HHMMSS.sql

# Restart the API
docker compose start api
```

### Copy a backup to your local machine

```bash
# Run this on your LOCAL machine
scp root@<your-vps-ip>:/opt/tabletopspells/backup_*.sql ./
```

---

## Troubleshooting

### Let's Encrypt certificate not issued

```bash
docker compose logs caddy | tail -30
```

Common causes:
- **DNS not propagated yet** — wait a few minutes and try `nslookup tabletopspells.yourdomain.com` until it returns your VPS IP
- **Port 80/443 blocked** — verify `ufw status` shows both ports as `ALLOW`
- **Rate limited** — Let's Encrypt allows 5 cert requests per domain per week; if you hit the limit, wait before retrying

### API container keeps restarting

```bash
docker compose logs api | tail -50
```

Common causes:
- **Missing or wrong `.env` values** — check all four variables are set correctly
- **Database not ready** — usually self-resolving; the healthcheck retries 10 times

### "502 Bad Gateway" from Caddy

The API hasn't started yet or crashed. Check:
```bash
docker compose ps
docker compose logs api | tail -20
```

### Forgot the admin password

Reset it via psql (the API uses ASP.NET Identity — hash the new password):
```bash
# Easiest: use the API's register endpoint to create a new account,
# then promote it to admin via psql if needed.
# Or: delete the admin user and restart the API to re-seed it.
docker exec -it tabletopspells-postgres-1 psql -U postgres -d tabletopspells
```
```sql
-- Delete the admin user (will be re-created with a new password on next restart)
DELETE FROM "AspNetUsers" WHERE "UserName" = 'admin';
\q
```
Then restart the API:
```bash
docker compose restart api
docker compose logs api | grep -A5 "Admin account"
```

---

## Security Checklist

- [ ] All three secrets in `.env` generated with `openssl rand -base64 32`
- [ ] `.env` file permissions restricted: `chmod 600 .env`
- [ ] UFW firewall enabled with only SSH/80/443 open
- [ ] PostgreSQL port (5432) **not** in UFW rules
- [ ] Admin password changed after first login
- [ ] `tls internal` removed from `Caddyfile` (Let's Encrypt in use)
- [ ] VPS SSH access secured (SSH key preferred over password)

---

*Generated for TabletopSpells — see `DEVELOPER_SETUP.md` for local development instructions.*
