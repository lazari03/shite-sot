#!/usr/bin/env bash
# One-time server setup. Runs ON a fresh Ubuntu 22.04/24.04 server as root (make server-setup does this).
# Idempotent: safe to run again.
set -euo pipefail
APP_DIR=/opt/shitshpejt

echo "→ packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl ufw fail2ban unattended-upgrades zstd >/dev/null

if ! command -v docker >/dev/null; then
  echo "→ installing Docker"
  curl -fsSL https://get.docker.com | sh >/dev/null
fi
systemctl enable --now docker >/dev/null

echo "→ Docker log rotation"
mkdir -p /etc/docker
[ -f /etc/docker/daemon.json ] || echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"5"}}' > /etc/docker/daemon.json

echo "→ firewall (22, 80, 443)"
ufw allow 22/tcp >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null && ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

echo "→ deploy user (same SSH keys as root)"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy >/dev/null
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys

echo "→ app directory"
install -d -o deploy -g deploy "$APP_DIR" "$APP_DIR/docker" /var/backups/shitshpejt

echo "✓ server ready. Next: make prod-env, then make server-env and make ship"
