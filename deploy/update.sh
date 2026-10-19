#!/usr/bin/env bash
# Update the backend on the server. Run as the foxtutor user:
#   /srv/foxtutor/deploy/update.sh
# (The frontend is built on your laptop and uploaded separately; see deploy/README.md.)
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/foxtutor}"
SERVICE="${SERVICE:-foxtutor}"
ENV_FILE="${ENV_FILE:-/etc/foxtutor/foxtutor.env}"

# Load DATABASE_URL / SECRET_KEY / MEDIA_ROOT etc. for manage.py.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cd "$APP_DIR"

# The server is deploy-only. Discard edits made to tracked deploy files, and
# remove a hand-installed set-ip.sh only when the incoming revision tracks it,
# so `git pull` always applies cleanly.
git checkout -- deploy/ 2>/dev/null || true
git fetch --prune origin
branch="$(git rev-parse --abbrev-ref HEAD)"
if git cat-file -e "origin/$branch:deploy/set-ip.sh" 2>/dev/null &&
   [ -e deploy/set-ip.sh ] &&
   ! git ls-files --error-unmatch deploy/set-ip.sh >/dev/null 2>&1; then
    rm -f deploy/set-ip.sh
fi

git pull --ff-only

PY="$APP_DIR/backend/.venv/bin/python"
PIP="$APP_DIR/backend/.venv/bin/pip"
"$PIP" install -r backend/requirements.txt -r deploy/requirements.txt

# Migrations must run BEFORE the app restarts.
"$PY" backend/manage.py migrate --noinput
"$PY" backend/manage.py collectstatic --noinput

sudo systemctl restart "$SERVICE"
echo "Redraft updated and $SERVICE restarted."
