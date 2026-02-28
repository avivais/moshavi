# MoshAvi deployment guide

Step-by-step guide to deploy MoshAvi to production on EC2, including the exact commands used for the production server.

---

## Deploy with script (recommended)

After committing your changes in **small, logical commits** (one per fix or feature — do not bundle everything into one huge commit), run from the repo root:

```bash
./scripts/deploy.sh
```

The script:

- Bumps the patch version in `package.json`, commits and pushes it (single release commit).
- SSHs to EC2, pulls latest, runs `npm ci && npm run build`, restarts PM2.
- If `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` are set (see below), purges the Cloudflare cache for moshavi.com.
- Prints the new version and verification URL.

**Optional — Cloudflare cache purge:** Create a **local** `.env` in the repo root (do not commit it; `.env` is in `.gitignore`). Copy from the example and fill in:

```bash
cp .env.example .env
# Edit .env and set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN
```

```env
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token
```

- **Zone ID:** Cloudflare dashboard → moshavi.com → Overview (right side, “API” / Zone ID).
- **API token:** [Create Token](https://dash.cloudflare.com/profile/api-tokens) with permission **Zone → Cache Purge → Purge** for the zone. If these are unset, the script skips purge and continues.

**Test Cloudflare purge:** After filling `.env`, run `./scripts/test-cloudflare-purge.sh` to verify the purge API works.

**Verify after deploy:**

- `https://moshavi.com/api/version` — version and `gitSha` should match the deployed commit.
- `https://moshavi.com` — spot-check the site.
- On the server: `pm2 status` — `moshavi` should be **online**.

**Options:** `./scripts/deploy.sh --dry-run` (version bump + push only; prints what would run). `--force` allows running with uncommitted changes (not recommended).

---

## Production EC2 details

| Item | Value |
|------|--------|
| **Host** | `ec2-98-84-90-118.compute-1.amazonaws.com` |
| **SSH user** | `ubuntu` |
| **SSH key** | `~/.ssh/VaisenKey.pem` |
| **App path on server** | `/var/www/moshavi` |
| **Site** | https://moshavi.com |

---

## Deploy to production (step-by-step)

Use this flow whenever you have new code to deploy (e.g. after adding a feature like the YouTube sync).

### Step 1: Commit and push from your machine

Commit your work in **small, logical commits** (e.g. one per feature or fix). Then ensure everything is pushed so the server can pull it.

```bash
cd /path/to/moshavi
git status
git add -A
git commit -m "Your message"
git push origin main
```

If push asks for credentials, use SSH for the remote:

```bash
git remote set-url origin git@github.com:avivais/moshavi.git
git push origin main
```

### Step 2: SSH into the EC2 server

```bash
ssh -i ~/.ssh/VaisenKey.pem ubuntu@ec2-98-84-90-118.compute-1.amazonaws.com
```

### Step 3: Go to the app directory and pull latest code

```bash
cd /var/www/moshavi
git pull
```

If you see an error like “Your local changes would be overwritten” (e.g. for `package.json` or `package-lock.json`), stash and pull:

```bash
git stash push -m 'pre-deploy' -- package.json package-lock.json
git pull
```

### Step 4: Install dependencies and build

```bash
npm ci
npm run build
```

### Step 5: Restart the app with PM2

```bash
pm2 restart moshavi
```

### Step 6: Verify

- Check process: `pm2 status` — `moshavi` should be **online**.
- Check version: open https://moshavi.com/api/version — version and `gitSha` should match the deployed commit.
- Check site: open https://moshavi.com and confirm the new behavior (e.g. admin YouTube sync, new page).

Optional: stream logs while you test:

```bash
pm2 logs moshavi
```

---

## One-line deploy (from your machine)

After you’ve pushed to `main`, you can run everything on the server in one SSH command:

```bash
ssh -i ~/.ssh/VaisenKey.pem ubuntu@ec2-98-84-90-118.compute-1.amazonaws.com "cd /var/www/moshavi && git pull && npm ci && npm run build && pm2 restart moshavi"
```

If pull fails due to local changes on the server, use:

```bash
ssh -i ~/.ssh/VaisenKey.pem ubuntu@ec2-98-84-90-118.compute-1.amazonaws.com "cd /var/www/moshavi && git stash push -m 'pre-deploy' -- package.json package-lock.json 2>/dev/null; git pull && npm ci && npm run build && pm2 restart moshavi"
```

---

## First-time server setup (only once)

If the app has never been deployed to this EC2 instance, do the following once before using the steps above.

### 1. SSH in and install Node.js (if needed)

```bash
ssh -i ~/.ssh/VaisenKey.pem ubuntu@ec2-98-84-90-118.compute-1.amazonaws.com
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### 2. Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 3. Install yt-dlp (for admin YouTube playlist sync)

```bash
sudo apt update
sudo apt install -y yt-dlp
which yt-dlp
```

### 4. Clone the repo and deploy

```bash
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone git@github.com:avivais/moshavi.git
cd moshavi
```

(If the server doesn’t have GitHub SSH keys, use `git clone https://github.com/avivais/moshavi.git` and configure credentials as needed.)

### 5. Environment variables

Create a `.env` file on the server (do not commit it):

```bash
cd /var/www/moshavi
nano .env
```

Add at least:

```env
ADMIN_PASSWORD=your-secure-admin-password
NODE_ENV=production
PORT=3000
```

Optional: `NEXT_PUBLIC_GA_ID`, `YOUTUBE_CHANNEL_PLAYLISTS_URL`. Save and exit.

### 6. Database and first run

```bash
cd /var/www/moshavi
npx ts-node db/setup.ts
npm ci
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Run the command that `pm2 startup` prints so PM2 starts on reboot.

### 7. Confirm yt-dlp and app

```bash
which yt-dlp
pm2 status
curl -I http://127.0.0.1:3000
```

The site is served by Nginx (or your reverse proxy) in front of port 3000; ensure the proxy points at this server and that the domain (e.g. moshavi.com) resolves to the EC2 IP.

---

## Useful commands on the server

| Task | Command |
|------|---------|
| App status | `pm2 status` |
| Logs | `pm2 logs moshavi` |
| Restart | `pm2 restart moshavi` |
| Check yt-dlp | `which yt-dlp` |
| Check port 3000 | `curl -I http://127.0.0.1:3000` |

---

## Troubleshooting

### `git pull` refuses (local changes)

Stash and pull:

```bash
cd /var/www/moshavi
git stash push -m 'pre-deploy' -- package.json package-lock.json
git pull
```

### YouTube sync “Fetch preview” fails

- Check: `which yt-dlp`. If missing: `sudo apt install -y yt-dlp`.
- Ensure the server can reach YouTube.

### App not responding / 502

- `pm2 status` — restart with `pm2 restart moshavi` if needed.
- `pm2 logs moshavi` — look for errors.
- Ensure `.env` has `ADMIN_PASSWORD` and that `moshavi.db` exists under `/var/www/moshavi`.

### Push from local asks for username/password

Use SSH for Git:

```bash
git remote set-url origin git@github.com:avivais/moshavi.git
git push origin main
```

---

## Summary: deploy to production

1. **Local:** Commit in small, logical commits; push (`git push origin main`). Or use `./scripts/deploy.sh` (handles version bump, push, server deploy, optional Cloudflare purge).
2. **Server:** SSH → `cd /var/www/moshavi` → `git pull` (stash if needed) → `npm ci` → `npm run build` → `pm2 restart moshavi`.
3. **Verify:** https://moshavi.com/api/version (version + git SHA), https://moshavi.com and admin features (e.g. YouTube sync).
