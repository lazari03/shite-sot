#!/usr/bin/env bash
# `make deploy` — one command from your laptop to a live site.
# First run asks for server IP, domain and email, prepares the server and uploads config.
# Later runs just build and ship. Answers are remembered in .deploy.local / .env.production (git-ignored).
set -euo pipefail
cd "$(dirname "$0")/.."

ask() { local prompt="$1" default="${2:-}" reply; read -r -p "$prompt${default:+ [$default]}: " reply; echo "${reply:-$default}"; }

# No Resend key? Run without emails (signup logs users in directly).
no_email_fallback() {
  if grep -qE '^EMAIL_PROVIDER=resend' .env.production && ! grep -qE '^RESEND_API_KEY=.+' .env.production; then
    sed -i.bak 's|^EMAIL_PROVIDER=resend|EMAIL_PROVIDER=console|' .env.production && rm -f .env.production.bak
  fi
  if grep -qE '^EMAIL_PROVIDER=console' .env.production && ! grep -q '^REQUIRE_EMAIL_VERIFICATION=' .env.production; then
    echo "REQUIRE_EMAIL_VERIFICATION=false" >> .env.production
  fi
}

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

# Running ON the server itself? Then deploy locally, no SSH.
IS_LOCAL=0
if [ "$HOST" = "localhost" ] || [ "$HOST" = "127.0.0.1" ] || hostname -I 2>/dev/null | tr ' ' '\n' | grep -qx "$HOST"; then
  IS_LOCAL=1
elif command -v curl >/dev/null && [ "$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)" = "$HOST" ]; then
  IS_LOCAL=1
fi

if [ "$IS_LOCAL" = 1 ]; then
  echo "→ This machine is the server: deploying locally"
  command -v docker >/dev/null || { echo "→ Installing Docker"; curl -fsSL https://get.docker.com | sh; }
  APP_DIR=/opt/shitshpejt
  mkdir -p "$APP_DIR/docker"
  if [ ! -f .env.production ]; then
    DOMAIN="$(ask "Domain (no domain yet? press Enter)" "$(echo "$HOST" | tr . -).sslip.io")"
    EMAIL="$(ask "Your email (for the HTTPS certificate)")"
    bash scripts/make-prod-env.sh "$DOMAIN" "$EMAIL"
  fi
  no_email_fallback
  install -m 600 .env.production "$APP_DIR/.env"
  install -m 600 .env.db.production "$APP_DIR/.env.db"
  install -m 600 .deploy.env.production "$APP_DIR/.deploy.env"
  cp compose.prod.yaml scripts/deploy.sh "$APP_DIR/"
  # Another site's proxy already on port 80? Sit behind it instead of starting our own Caddy.
  PROXY="$(docker ps --filter publish=80 --format '{{.Names}}' | grep -v '^shitshpejt-' | head -1 || true)"
  if [ -n "$PROXY" ]; then
    DOMAIN="$(grep -E '^DOMAIN=' .deploy.env.production | cut -d= -f2)"
    bash scripts/use-existing-proxy.sh "$PROXY" "$DOMAIN" "$APP_DIR"
  fi
  cp docker/Caddyfile "$APP_DIR/docker/Caddyfile"
  REPO="${REPO:-lazari03/shite-sot}"
  TAG="$(git describe --always --dirty 2>/dev/null || echo local)"
  echo "→ Building image (first time takes a few minutes)"
  docker build -f docker/Dockerfile -t "ghcr.io/$REPO:$TAG" .
  (cd "$APP_DIR" && SKIP_PULL=1 IMAGE_REPO="$REPO" bash deploy.sh "$TAG")
  DOMAIN="$(grep -E '^DOMAIN=' .deploy.env.production | cut -d= -f2)"
  echo
  echo "✓ Live at https://$DOMAIN"
  echo "  Next: register on the site, then make yourself admin:"
  echo "  cd $APP_DIR && TAG=\$(cat .current_tag) docker compose -f compose.prod.yaml run --rm migrate admin-grant you@example.com"
  exit 0
fi

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
no_email_fallback

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
