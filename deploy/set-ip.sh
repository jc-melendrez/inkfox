#!/usr/bin/env bash
# Point ALLOWED_HOSTS / CSRF_TRUSTED_ORIGINS at this instance's current public IP.
# Run as the foxtutor user:
#   /srv/foxtutor/deploy/set-ip.sh             # write only (used by the boot unit)
#   /srv/foxtutor/deploy/set-ip.sh --restart   # write, then restart the service
#
# The instance public IPv4 is released on stop and reassigned on start, so the
# boot unit runs this before foxtutor starts. A plain reboot keeps the address,
# so the script is a no-op unless the value actually changed.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/foxtutor/foxtutor.env}"
SERVICE="${SERVICE:-foxtutor}"
RESTART=0
[ "${1:-}" = "--restart" ] && RESTART=1

fetch_ip() {
    local ip tok i

    # Primary: public echo service (the documented method). Retry briefly: on a
    # fresh boot, DNS/egress can lag behind network-online.target.
    for i in 1 2 3; do
        ip="$(curl -fsS --max-time 8 https://checkip.amazonaws.com 2>/dev/null || true)"
        ip="${ip//[[:space:]]/}"
        if [ -n "$ip" ]; then
            printf '%s' "$ip"
            return
        fi
        sleep 2
    done

    # Fallback: EC2 instance metadata (IMDSv2), link-local and DNS-independent.
    tok="$(curl -sS --max-time 3 -X PUT \
        -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
        http://169.254.169.254/latest/api/token 2>/dev/null || true)"
    ip="$(curl -sS --max-time 3 \
        -H "X-aws-ec2-metadata-token: $tok" \
        http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
    ip="${ip//[[:space:]]/}"

    printf '%s' "$ip"
}

IP="$(fetch_ip)"
if ! [[ "$IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "set-ip: could not determine public IPv4 (got: '${IP}')" >&2
    exit 1
fi

CURRENT="$(grep -E '^ALLOWED_HOSTS=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
if [ "$CURRENT" = "$IP" ]; then
    echo "set-ip: ALLOWED_HOSTS already $IP (no change)"
else
    tmp="$(mktemp)"
    trap 'rm -f "$tmp"' EXIT

    awk -v ip="$IP" '
        /^ALLOWED_HOSTS=/        { print "ALLOWED_HOSTS=" ip;              seen_host = 1; next }
        /^CSRF_TRUSTED_ORIGINS=/ { print "CSRF_TRUSTED_ORIGINS=http://" ip; seen_csrf = 1; next }
        { print }
        END {
            if (!seen_host) print "ALLOWED_HOSTS=" ip
            if (!seen_csrf) print "CSRF_TRUSTED_ORIGINS=http://" ip
        }
    ' "$ENV_FILE" > "$tmp"

    if ! grep -qx "ALLOWED_HOSTS=$IP" "$tmp" ||
       ! grep -qx "CSRF_TRUSTED_ORIGINS=http://$IP" "$tmp"; then
        echo "set-ip: generated config failed its sanity check; $ENV_FILE left untouched" >&2
        exit 1
    fi

    # Keep a copy in the data dir: /etc/foxtutor itself is root-owned and not
    # writable by foxtutor, so the backup cannot live next to the original.
    cp -p "$ENV_FILE" /var/lib/foxtutor/foxtutor.env.bak

    # Overwrite in place instead of sed -i/mv: those need write access to the
    # /etc/foxtutor directory, which foxtutor does not have.
    cat "$tmp" > "$ENV_FILE"
    echo "set-ip: host set to http://$IP"
fi

if [ "$RESTART" = "1" ] && systemctl is-active --quiet "$SERVICE"; then
    if [ "$(id -u)" = "0" ]; then
        systemctl restart "$SERVICE"
    else
        sudo -n systemctl restart "$SERVICE"
    fi
    echo "set-ip: $SERVICE restarted"
fi
