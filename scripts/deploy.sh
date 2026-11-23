#!/usr/bin/env bash
# Runs ON the server (/opt/shitshpejt). Usage: deploy.sh <image-tag>
# Pull → migrate → restart → health check. Rolls back to the previous tag if unhealthy.
set -euo pipefail
NEW_TAG="$1"
cd /opt/shitshpejt
mkdir -p docker
PREV_TAG="$(cat .current_tag 2>/dev/null || true)"
export IMAGE_REPO="${IMAGE_REPO:-lazari03/shite-sot}"
# shellcheck disable=SC1091
set -a; [ -f .deploy.env ] && . ./.deploy.env; set +a   # DOMAIN, ACME_EMAIL

if [ -n "${GHCR_TOKEN:-}" ]; then echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null; fi

compose() { TAG="$1" docker compose -f compose.prod.yaml "${@:2}"; }

if [ "${SKIP_PULL:-0}" = 1 ]; then
  echo "→ using local image (shipped with make ship)"
else
  echo "→ pulling $NEW_TAG"
  compose "$NEW_TAG" pull web
fi
echo "→ migrating + starting $NEW_TAG"
# Migrations must be backward compatible (expand → migrate → contract) so a rollback stays safe.
compose "$NEW_TAG" up -d --remove-orphans --wait web worker caddy || true

healthy=0
for _ in $(seq 1 30); do
  if docker compose -f compose.prod.yaml exec -T web curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then healthy=1; break; fi
  sleep 3
done

if [ "$healthy" != 1 ]; then
  echo "✗ $NEW_TAG unhealthy"
  if [ -n "$PREV_TAG" ]; then
    echo "→ rolling back to $PREV_TAG"
    compose "$PREV_TAG" up -d --remove-orphans web worker caddy
  fi
  exit 1
fi

echo "$NEW_TAG" > .current_tag
[ -n "$PREV_TAG" ] && echo "$PREV_TAG" > .previous_tag
# Remove dangling images and unused images older than 7 days. Images used by running
# containers are never removed; the previous tag is kept for a week for rollbacks. Volumes untouched.
docker image prune -f >/dev/null
docker image prune -af --filter "until=168h" >/dev/null
echo "✓ deployed $NEW_TAG"
