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
git pull --ff-only

PY="$APP_DIR/backend/.venv/bin/python"
PIP="$APP_DIR/backend/.venv/bin/pip"
"$PIP" install -r backend/requirements.txt -r deploy/requirements.txt

# Migrations must run BEFORE the app restarts.
"$PY" backend/manage.py migrate --noinput
"$PY" backend/manage.py collectstatic --noinput

sudo systemctl restart "$SERVICE"
echo "Backend updated and $SERVICE restarted."
