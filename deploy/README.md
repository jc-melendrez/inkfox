# Redraft deployment (single AWS EC2 instance, free-credits friendly)

One **Amazon Linux 2023** `t3.micro` instance serving the React build (Nginx) and
the Django API (Gunicorn under systemd), with SQLite and uploads in
`/var/lib/foxtutor/`. No Elastic IP, load balancer, NAT, RDS, Route 53 or snapshots.

> **Naming:** **Redraft** is the product name. Server paths and service names keep
> the original project name `foxtutor` on purpose (`/srv/foxtutor`,
> `foxtutor.service`, `foxtutor` user, and so on).

- **App code:** `/srv/foxtutor`
- **Backend venv:** `/srv/foxtutor/backend/.venv` (Python 3.12)
- **Data dir:** `/var/lib/foxtutor` (`db.sqlite3`, `media/`) — back this up
- **Env file:** `/etc/foxtutor/foxtutor.env` (600, `foxtutor:foxtutor`)
- **Service user:** `foxtutor`
- **Backups:** `/var/backups/foxtutor` (3 days on the server)

Commands marked **laptop** run on your own computer; everything else runs on the
instance over SSH (`ec2-user@<PUBLIC_IP>`). Replace `<REPO_URL>`, `<PUBLIC_IP>`,
and `your.domain` as you go.

## What you need before starting

- An AWS account (free plan/credits) and permission to create an EC2 instance.
- Your Gemini API key (or another provider; the app works without one too).
- The repo reachable from the instance (public URL, or a deploy key).
- Optional: a domain you control, if you want HTTPS now.
- Your laptop, with Node 20+ and `npm` (to build the frontend) and `scp`/`ssh`.

## 1. AWS console checklist (do this first)

1. **Alerts before anything else.** Billing → *Budgets* → create a $1 budget with
   an email alert, and set a **Free Tier usage alert** (Billing preferences).
2. **Launch instance:** **Amazon Linux 2023** (x86_64), type **t3.micro**,
   **8 GB gp3** root volume, your existing/new key pair.
3. **Security group (inbound):** SSH **22 from your IP only** (`My IP`), HTTP **80
   from anywhere**. Add HTTPS **443 from anywhere** only if you set up a domain.
4. **No Elastic IP.** Avoids the charge while the instance is stopped. The public
   IPv4 **changes on every stop/start**; the boot unit in step 6 updates the app
   automatically (see step 13).
5. **Stop/start between demos** (EC2 → Instances → Instance state → Stop/Start) to
   save credits. The database stays on the EBS volume.
6. **The free plan closes after ~6 months.** Before then, download your backups to
   your laptop (step 12). **Terminating the instance deletes the root volume and
   all data** (unless you disable *Delete on termination* first).

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

sudo dnf update -y
sudo dnf install -y python3.12 python3.12-pip nginx git sqlite \
    cronie policycoreutils-python-utils
sudo systemctl enable --now crond
```

Amazon Linux 2023 uses the system Python 3.9; the app runs on **Python 3.12**.

**SELinux:** AL2023 ships with SELinux **enforcing**. Check it and leave it that
way (this guide includes the required booleans and file labels):

```bash
getenforce        # must print Enforcing
```

## 3. Service user, directories, code, dependencies

```bash
sudo useradd --system --user-group --create-home --shell /bin/bash foxtutor
sudo mkdir -p /srv/foxtutor /var/lib/foxtutor /var/backups/foxtutor /etc/foxtutor

sudo git clone <REPO_URL> /srv/foxtutor
sudo chown -R foxtutor:foxtutor /srv/foxtutor /var/lib/foxtutor /var/backups/foxtutor
sudo chmod +x /srv/foxtutor/deploy/*.sh

sudo -u foxtutor python3.12 -m venv /srv/foxtutor/backend/.venv
sudo -u foxtutor /srv/foxtutor/backend/.venv/bin/pip install --upgrade pip
sudo -u foxtutor /srv/foxtutor/backend/.venv/bin/pip install \
    -r /srv/foxtutor/backend/requirements.txt \
    -r /srv/foxtutor/deploy/requirements.txt
```

## 4. Environment file

```bash
PUBLIC_IP=$(curl -s https://checkip.amazonaws.com); echo "$PUBLIC_IP"

sudo cp /srv/foxtutor/deploy/foxtutor.env.example /etc/foxtutor/foxtutor.env
SECRET=$(/srv/foxtutor/backend/.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))")
sudo sed -i "s|REPLACE_WITH_A_LONG_RANDOM_SECRET|$SECRET|" /etc/foxtutor/foxtutor.env

# Set ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS to this instance's public IP, and
# paste your Gemini key. For a plain-HTTP demo also set USE_HTTPS=False and
# SECURE_HSTS_SECONDS=0.
sudo nano /etc/foxtutor/foxtutor.env

sudo chown foxtutor:foxtutor /etc/foxtutor/foxtutor.env
sudo chmod 600 /etc/foxtutor/foxtutor.env
```

For the IP-only demo, the two host lines are:

```
ALLOWED_HOSTS=<PUBLIC_IP>
CSRF_TRUSTED_ORIGINS=http://<PUBLIC_IP>
USE_HTTPS=False
SECURE_HSTS_SECONDS=0
```

`deploy/set-ip.sh` (step 6) rewrites only those two host lines on boot.

## 5. Database and static files

```bash
sudo -u foxtutor bash -c '
  set -a; . /etc/foxtutor/foxtutor.env; set +a
  cd /
  /srv/foxtutor/backend/.venv/bin/python /srv/foxtutor/backend/manage.py migrate --noinput
  /srv/foxtutor/backend/.venv/bin/python /srv/foxtutor/backend/manage.py collectstatic --noinput
'

# Let Nginx read the admin assets under SELinux.
sudo semanage fcontext -a -t httpd_sys_content_t '/srv/foxtutor/backend/staticfiles(/.*)?'
sudo restorecon -Rv /srv/foxtutor/backend/staticfiles
```

Do **not** run `seed_demo` on a public server: it creates a known password. If you
want demo data, run it, then immediately change the password (or delete the user):

```bash
sudo -u foxtutor bash -c 'set -a; . /etc/foxtutor/foxtutor.env; set +a; \
  cd /; /srv/foxtutor/backend/.venv/bin/python /srv/foxtutor/backend/manage.py seed_demo'
# then change sam.rivera@university.edu's password or delete that account before sharing the URL.
```

## 6. Gunicorn and the boot-time IP sync (systemd)

```bash
sudo cp /srv/foxtutor/deploy/systemd/foxtutor.service /etc/systemd/system/foxtutor.service
sudo cp /srv/foxtutor/deploy/systemd/redraft-set-ip.service /etc/systemd/system/redraft-set-ip.service
sudo systemctl daemon-reload
sudo systemctl enable --now redraft-set-ip.service
sudo systemctl enable --now foxtutor
systemctl status foxtutor --no-pager

# Let the foxtutor user restart the service for updates (used by update.sh).
echo 'foxtutor ALL=(root) NOPASSWD: /usr/bin/systemctl restart foxtutor, /usr/bin/systemctl status foxtutor' \
  | sudo tee /etc/sudoers.d/foxtutor-deploy
sudo chmod 440 /etc/sudoers.d/foxtutor-deploy
```

`redraft-set-ip.service` is a one-shot unit that runs **before** `foxtutor`. It
reads the instance's public IP and updates `ALLOWED_HOSTS` /
`CSRF_TRUSTED_ORIGINS`, so stopping and starting the instance needs no manual
edits. Run it by hand (with a restart) if the address ever changes while the app
is running:

```bash
sudo -u foxtutor /srv/foxtutor/deploy/set-ip.sh --restart
```

## 7. Nginx

```bash
sudo cp /srv/foxtutor/deploy/nginx/foxtutor.conf /etc/nginx/conf.d/foxtutor.conf

# Amazon Linux's stock nginx.conf contains a default server block that conflicts
# with our default_server. Back it up, then comment out the stock `server { ... }`
# block (the one with `root /usr/share/nginx/html;`).
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
sudo nano /etc/nginx/nginx.conf

sudo nginx -t
sudo setsebool -P httpd_can_network_connect 1
sudo systemctl enable --now nginx
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
sudo chown ec2-user:ec2-user /srv/foxtutor/frontend
```

```powershell
# laptop
ssh ec2-user@<PUBLIC_IP> "rm -rf /srv/foxtutor/frontend/dist"
scp -r dist ec2-user@<PUBLIC_IP>:/srv/foxtutor/frontend/
ssh ec2-user@<PUBLIC_IP> "chmod -R a+rX /srv/foxtutor/frontend/dist"
```

```bash
# server: let Nginx read the SPA under SELinux
sudo semanage fcontext -a -t httpd_sys_content_t '/srv/foxtutor/frontend/dist(/.*)?'
sudo restorecon -Rv /srv/foxtutor/frontend/dist
```

## 9. Smoke test

```bash
PUBLIC_IP=$(curl -s https://checkip.amazonaws.com)
curl -s "http://$PUBLIC_IP/api/health"; echo          # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/library"    # 200 (SPA deep link)
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/db.sqlite3" # 404
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/.env"       # 403 (Nginx denies dotfiles)
curl -s -o /dev/null -w "%{http_code}\n" "http://$PUBLIC_IP/media/"     # 404
```

Then in a browser, over `http://<PUBLIC_IP>`: sign up → upload a TXT → generate
questions → submit an essay → refresh on `/library` (should not 404) → log out.

> **Plain-HTTP warning:** without a domain + certificate, logins and essays travel
> unencrypted. Fine for a private demo; do not use it with real personal data.
>
> If Chrome rewrites the address to `https://`, either turn off *Settings →
> Security → Always use secure connections* or use a different browser.

## 10. Logs and rotation

```bash
journalctl -u foxtutor -e            # Gunicorn + app logs (journald rotates these)
journalctl -u redraft-set-ip -e      # boot-time IP sync
sudo tail -f /var/log/nginx/access.log
```

Nginx logs rotate via the default `/etc/logrotate.d/nginx`. Gunicorn logs go to the
journal (set `SystemMaxUse=` in `/etc/systemd/journald.conf` if you want a cap). The
app never logs essay text, material text, or API keys.

## 11. Updating

**Backend (server):**

```bash
sudo -u foxtutor bash /srv/foxtutor/deploy/update.sh
```

It pulls, installs pinned deps, runs **migrations before** restarting, collects
static, then restarts `foxtutor`.

If a release changes the systemd units, reinstall them once:

```bash
sudo cp /srv/foxtutor/deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart foxtutor
```

**Frontend:** rebuild on the laptop and re-upload (step 8). No service restart needed.

## 12. Backups and restore

`deploy/backup.sh` makes a WAL-safe SQLite copy, copies `media/`, and keeps the last
**3 days**. It runs daily at 03:15 via `/etc/cron.d/foxtutor-backup`:

```bash
sudo cp /srv/foxtutor/deploy/cron.d/foxtutor-backup /etc/cron.d/foxtutor-backup
sudo chmod 644 /etc/cron.d/foxtutor-backup
sudo -u foxtutor bash /srv/foxtutor/deploy/backup.sh    # run one now to test
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
scp -r ec2-user@<PUBLIC_IP>:/var/backups/foxtutor/<STAMP> .\foxtutor-backup-<STAMP>
```

## 13. Stop/start (how to save credits)

Stopping an EC2 instance **does not delete data**: the root EBS volume and
everything in `/var/lib/foxtutor` persist. Compute billing stops; the 8 GB
volume is still billed (pennies, and covered by the free tier). **Terminating**
deletes the volume.

What changes on stop/start:

| What | Effect | Action |
|---|---|---|
| Instance public IPv4 | A new address is assigned | None *on the server* — the boot unit updates the app. Connect to the new address. |
| Your own ISP address | May change over time | Update the security group **SSH → My IP** only when it does. |
| Services | Start automatically (`foxtutor`, `nginx`, `crond`, `redraft-set-ip`) | None |
| Database/uploads | Persist on EBS | None |

If you ever need to fix the host values manually:

```bash
sudo -u foxtutor /srv/foxtutor/deploy/set-ip.sh --restart
```

## 14. HTTPS (optional — only with a domain)

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain -d www.your.domain
```

Then update `/etc/foxtutor/foxtutor.env` to the domain and HTTPS mode, set
`server_name` in `/etc/nginx/conf.d/foxtutor.conf`, and restart:

```
ALLOWED_HOSTS=your.domain,www.your.domain
CSRF_TRUSTED_ORIGINS=https://your.domain,https://www.your.domain
USE_HTTPS=True
SECURE_HSTS_SECONDS=3600
```

```bash
sudo sed -i 's/server_name _;/server_name your.domain www.your.domain;/' \
  /etc/nginx/conf.d/foxtutor.conf
# uncomment the Strict-Transport-Security add_header line in the same file
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl restart foxtutor
```

`set-ip.sh` only rewrites the IP-based host lines; after moving to a domain, stop
using it (it will overwrite `ALLOWED_HOSTS` on the next boot).

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
- **SELinux** must stay `Enforcing`. If a file is unreadable after an upload, the
  fix is a label (`semanage fcontext` + `restorecon`), never `setenforce 0`.
- **Access** `/admin/` only if you need it; create a superuser with
  `manage.py createsuperuser`.
