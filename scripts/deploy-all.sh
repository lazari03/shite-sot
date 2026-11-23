#!/usr/bin/env bash
# `make deploy` — one command from your laptop to a live site.
# First run asks for server IP, domain, email and Resend key, prepares the server and uploads config.
# Later runs just build and ship. Answers are remembered in .deploy.local / .env.production (git-ignored).
set -euo pipefail
cd "$(dirname "$0")/.."

ask() { local prompt="$1" default="${2:-}" reply; read -r -p "$prompt${default:+ [$default]}: " reply; echo "${reply:-$default}"; }

# --- server IP ---
HOST="${HOST:-}"
[ -z "$HOST" ] && [ -f .deploy.local ] && HOST="$(grep -E '^HOST=' .deploy.local | cut -d= -f2 || true)"
if [ -z "$HOST" ]; then
  HOST="$(ask "Server IP")"
  [ -n "$HOST" ] || { echo "Need a server IP."; exit 1; }
  echo "HOST=$HOST" > .deploy.local
fi
PLATFORM="${PLATFORM:-linux/amd64}"
echo "→ Deploying to $HOST"

# --- can we reach it? ---
if ssh -o BatchMode=yes -o ConnectTimeout=10 "deploy@$HOST" "docker --version" >/dev/null 2>&1; then
  echo "→ Server already prepared"
else
  echo "→ Preparing server (one time)"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "root@$HOST" true 2>/dev/null || {
    echo "✗ Can't SSH into root@$HOST with your key."
    echo "  Add your SSH public key to the server (provider panel) and try again."
    exit 1
  }
  ssh "root@$HOST" 'bash -s' < scripts/bootstrap-server.sh
fi

# --- production config (created once) ---
if [ ! -f .env.production ]; then
  DOMAIN="$(ask "Domain (no domain yet? press Enter)" "$(echo "$HOST" | tr . -).sslip.io")"
  EMAIL="$(ask "Your email (for the HTTPS certificate)")"
  bash scripts/make-prod-env.sh "$DOMAIN" "$EMAIL"
fi
if ! grep -qE '^RESEND_API_KEY=.+' .env.production; then
  read -r -s -p "Resend API key (resend.com, needed for signup emails): " KEY; echo
  [ -n "$KEY" ] || { echo "✗ The site can't run in production without it."; exit 1; }
  sed -i.bak "s|^RESEND_API_KEY=.*|RESEND_API_KEY=$KEY|" .env.production && rm -f .env.production.bak
fi

echo "→ Uploading config"
scp -q .env.production "deploy@$HOST:/opt/shitshpejt/.env"
scp -q .env.db.production "deploy@$HOST:/opt/shitshpejt/.env.db"
scp -q .deploy.env.production "deploy@$HOST:/opt/shitshpejt/.deploy.env"
ssh "deploy@$HOST" 'chmod 600 /opt/shitshpejt/.env /opt/shitshpejt/.env.db /opt/shitshpejt/.deploy.env'

# --- build + ship ---
make --no-print-directory ship HOST="$HOST" PLATFORM="$PLATFORM"

DOMAIN="$(grep -E '^DOMAIN=' .deploy.env.production | cut -d= -f2)"
echo
echo "✓ Live at https://$DOMAIN"
echo "  Next: register on the site, then: make server-admin EMAIL=you@example.com"
