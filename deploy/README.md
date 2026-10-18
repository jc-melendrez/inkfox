# FoxTutor deployment (single AWS EC2 instance, free-credits friendly)

One `t3.micro` Ubuntu instance serving the React build (Nginx) and the Django API
(Gunicorn under systemd), with SQLite and uploads in `/var/lib/foxtutor/`.
No Elastic IP, load balancer, NAT, RDS, Route 53 or snapshots.

- **App code:** `/srv/foxtutor`
- **Backend venv:** `/srv/foxtutor/backend/.venv`
- **Data dir:** `/var/lib/foxtutor` (`db.sqlite3`, `media/`) — back this up
- **Env file:** `/etc/foxtutor/foxtutor.env` (600, `foxtutor:foxtutor`)
- **Service user:** `foxtutor`
- **Backups:** `/var/backups/foxtutor` (3 days on server)

Commands marked **laptop** run on your own computer; everything else runs on the
instance over SSH (`ubuntu@<PUBLIC_IP>`). Replace `<REPO_URL>`, `<PUBLIC_IP>`, and
`your.domain` as you go.

## What you need before starting

- An AWS account (free plan/credits) and permission to create an EC2 instance.
- Your Gemini API key (or another provider; the app works without one too).
- The repo reachable from the instance (public URL, or a deploy key).
- Optional: a domain you control, if you want HTTPS now.
- Your laptop, with Node 20+ and `npm` (to build the frontend) and `scp`/`ssh`.

## 1. AWS console checklist (do this first)

1. **Alerts before anything else.** Billing → *Budgets* → create a $1 budget with
   an email alert, and set a **Free Tier usage alert** (Billing preferences).
2. **Launch instance:** Ubuntu Server 22.04 or 24.04 **LTS**, type **t3.micro**,
   **8 GB gp3** root volume, your existing/new key pair.
3. **Security group (inbound):** SSH **22 from your IP only** (`My IP`), HTTP **80
   from anywhere**. Add HTTPS **443 from anywhere** only if you set up a domain.
4. **No Elastic IP.** The public IP **changes every time you stop/start** the
   instance. When it changes you must update `ALLOWED_HOSTS`,
   `CSRF_TRUSTED_ORIGINS` and `server_name` (steps 4 and 7), then restart. Keeping
   an Elastic IP costs money when the instance is stopped, so we skip it.
5. **Stop/start between demos** (EC2 → Instances → Instance state → Stop/Start) to
   save credits. Nothing else needs to change, except the IP note above and
   re-checking step 8's host values.
6. **The free plan closes after ~6 months.** Before then, download your backups to
   your laptop (step 12). **Terminating the instance deletes the root volume and
   all data unless you keep the volume.**

## 2. Swap file and packages

```bash
# 2 GB swap helps a 1 GB t3.micro stay alive.
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-foxtutor.conf
sudo sysctl --system
free -h

sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-venv python3-pip nginx git sqlite3
```

## 3. Service user, directories, code, dependencies

```bash
sudo adduser --system --group --no-create-home --shell /bin/bash foxtutor
sudo mkdir -p /srv/foxtutor /var/lib/foxtutor /var/backups/foxtutor /etc/foxtutor
sudo chown ubuntu:ubuntu /srv/foxtutor

git clone <REPO_URL> /srv/foxtutor

sudo chown -R foxtutor:foxtutor /srv/foxtutor /var/lib/foxtutor /var/backups/foxtutor

sudo -u foxtutor python3 -m venv /srv/foxtutor/backend/.venv
sudo -u foxtutor /srv/foxtutor/backend/.venv/bin/pip install --upgrade pip
sudo -u foxtutor /srv/foxtutor/backend/.venv/bin/pip install \
    -r /srv/foxtutor/backend/requirements.txt \
    -r /srv/foxtutor/deploy/requirements.txt
```

## 4. Environment file

```bash
PUBLIC_IP=$(curl -s ifconfig.me); echo "$PUBLIC_IP"

sudo cp /srv/foxtutor/deploy/foxtutor.env.example /etc/foxtutor/foxtutor.env
SECRET=$(/srv/foxtutor/backend/.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))")
sudo sed -i "s|REPLACE_WITH_A_LONG_RANDOM_SECRET|$SECRET|" /etc/foxtutor/foxtutor.env

# Set ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS to this instance's public IP, and
# paste your Gemini key. For a plain-HTTP demo also set USE_HTTPS=False.
sudo nano /etc/foxtutor/foxtutor.env

sudo chown foxtutor:foxtutor /etc/foxtutor/foxtutor.env
sudo chmod 600 /etc/foxtutor/foxtutor.env
```

For the IP-only demo, the two host lines are:

```
ALLOWED_HOSTS=<PUBLIC_IP>
CSRF_TRUSTED_ORIGINS=http://<PUBLIC_IP>
USE_HTTPS=False
```

## 5. Database and static files

```bash
sudo -u foxtutor bash -c '
  set -a; . /etc/foxtutor/foxtutor.env; set +a
  cd /srv/foxtutor
  backend/.venv/bin/python backend/manage.py migrate --noinput
  backend/.venv/bin/python backend/manage.py collectstatic --noinput
'
```

Do **not** run `seed_demo` on a public server: it creates a known password. If you
want demo data, run it, then immediately change the password (or delete the user):

```bash
sudo -u foxtutor bash -c 'set -a; . /etc/foxtutor/foxtutor.env; set +a; \
  /srv/foxtutor/backend/.venv/bin/python /srv/foxtutor/backend/manage.py seed_demo'
# then change sam.rivera@university.edu's password or delete that account before sharing the URL.
```

## 6. Gunicorn (systemd)

```bash
sudo cp /srv/foxtutor/deploy/systemd/foxtutor.service /etc/systemd/system/foxtutor.service
sudo systemctl daemon-reload
sudo systemctl enable --now foxtutor
systemctl status foxtutor --no-pager

# Let the foxtutor user restart the service for updates (used by update.sh).
echo 'foxtutor ALL=(root) NOPASSWD: /bin/systemctl restart foxtutor, /bin/systemctl status foxtutor' \
  | sudo tee /etc/sudoers.d/foxtutor-deploy
sudo chmod 440 /etc/sudoers.d/foxtutor-deploy
```

## 7. Nginx

```bash
PUBLIC_IP=$(curl -s ifconfig.me)
sudo cp /srv/foxtutor/deploy/nginx/foxtutor.conf /etc/nginx/sites-available/foxtutor
sudo sed -i "s|REPLACE_WITH_DOMAIN_OR_PUBLIC_IP|$PUBLIC_IP|" /etc/nginx/sites-available/foxtutor
sudo ln -sf /etc/nginx/sites-available/foxtutor /etc/nginx/sites-enabled/foxtutor
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Frontend — build on your laptop, upload the dist

**Laptop.** Build in real API mode (a plain `npm run build` would ship mock mode):

```powershell
powershell -ExecutionPolicy Bypass -File deploy\build-frontend.ps1
```

Or manually, from the repo root:

```powershell
$env:VITE_API_MODE="real"; $env:VITE_ENABLE_GOOGLE_AUTH="false"; $env:VITE_API_BASE_URL="/api"
npm install; npm run build
```

**Server.** One-time dir, then upload from the laptop:

```bash
sudo mkdir -p /srv/foxtutor/frontend
sudo chown ubuntu:ubuntu /srv/foxtutor/frontend
```

```powershell
# laptop
ssh ubuntu@<PUBLIC_IP> "rm -rf /srv/foxtutor/frontend/dist"
scp -r dist ubuntu@<PUBLIC_IP>:/srv/foxtutor/frontend/
ssh ubuntu@<PUBLIC_IP> "chmod -R a+rX /srv/foxtutor/frontend/dist"
```

## 9. Smoke test

```bash
PUBLIC_IP=$(curl -s ifconfig.me)
curl -s "http://$PUBLIC_IP/api/health"; echo          # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/library"   # 200 (SPA deep link)
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/db.sqlite3" # 404
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/.env"       # 404
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/media/"     # 404
```

Then in a browser, over `http://<PUBLIC_IP>`: sign up → upload a TXT → generate
questions → submit an essay → refresh on `/library` (should not 404) → log out.

> **Plain-HTTP warning:** without a domain + certificate, logins and essays travel
> unencrypted. Fine for a private demo; do not use it with real personal data.

## 10. Logs and rotation

```bash
journalctl -u foxtutor -e            # Gunicorn + app logs (journald rotates these)
sudo tail -f /var/log/nginx/access.log
```

Nginx logs rotate via the default `/etc/logrotate.d/nginx`. Gunicorn logs go to the
journal (set `SystemMaxUse=` in `/etc/systemd/journald.conf` if you want a cap). The
app never logs essay text, material text, or API keys.

## 11. Updating

**Backend (server):**

```bash
sudo -u foxtutor /srv/foxtutor/deploy/update.sh
```

It pulls, installs pinned deps, runs **migrations before** restarting, collects
static, then restarts `foxtutor`.

**Frontend:** rebuild on the laptop and re-upload (step 8). No service restart needed.

## 12. Backups and restore

`deploy/backup.sh` makes a WAL-safe SQLite copy, copies `media/`, and keeps the last
**3 days**. It runs daily at 03:15 via `/etc/cron.d/foxtutor-backup`:

```bash
sudo cp /srv/foxtutor/deploy/cron.d/foxtutor-backup /etc/cron.d/foxtutor-backup
sudo chmod 644 /etc/cron.d/foxtutor-backup
sudo -u foxtutor /srv/foxtutor/deploy/backup.sh    # run one now to test
ls -1 /var/backups/foxtutor/
```

**Restore** (replaces current data — stop the app first):

```bash
sudo systemctl stop foxtutor
STAMP=2026-01-01_031500   # pick a folder from ls above
sudo -u foxtutor rm -f /var/lib/foxtutor/db.sqlite3-wal /var/lib/foxtutor/db.sqlite3-shm
sudo -u foxtutor cp /var/backups/foxtutor/$STAMP/db.sqlite3 /var/lib/foxtutor/db.sqlite3
sudo -u foxtutor rm -rf /var/lib/foxtutor/media
sudo -u foxtutor cp -a /var/backups/foxtutor/$STAMP/media /var/lib/foxtutor/media
sudo systemctl start foxtutor
```

**Copy the latest backup to your laptop** (do this before the free plan ends):

```bash
# server: find the newest backup
ls -1dt /var/backups/foxtutor/*/ | head -1
```

```powershell
# laptop
scp -r ubuntu@<PUBLIC_IP>:/var/backups/foxtutor/<STAMP> .\foxtutor-backup-<STAMP>
```

## 13. HTTPS (optional — only with a domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain -d www.your.domain
```

Then update `/etc/foxtutor/foxtutor.env` to the domain and HTTPS mode, and restart:

```
ALLOWED_HOSTS=your.domain,www.your.domain
CSRF_TRUSTED_ORIGINS=https://your.domain,https://www.your.domain
USE_HTTPS=True
```

```bash
sudo sed -i "s|REPLACE_WITH_DOMAIN_OR_PUBLIC_IP|your.domain|" /etc/nginx/sites-available/foxtutor
# uncomment the Strict-Transport-Security add_header line in the same file
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl restart foxtutor
```

Certbot installs a renewal timer automatically (`systemctl list-timers | grep certbot`).
Verify no config issues with:

```bash
sudo -u foxtutor bash -c 'set -a; . /etc/foxtutor/foxtutor.env; set +a; \
  /srv/foxtutor/backend/.venv/bin/python /srv/foxtutor/backend/manage.py check --deploy'
```

## Notes

- **Single instance only.** SQLite and the in-memory throttle counters do not share
  across machines. Running a second instance requires PostgreSQL (set `DATABASE_URL`)
  and a shared cache.
- **Secrets** live only in `/etc/foxtutor/foxtutor.env`; never commit them.
- **Access** `/admin/` only if you need it; create a superuser with
  `manage.py createsuperuser`.
