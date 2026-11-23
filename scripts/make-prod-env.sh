#!/usr/bin/env bash
# Creates the production env files locally (git-ignored) with fresh random secrets.
# Usage: scripts/make-prod-env.sh <domain> <acme-email>
set -euo pipefail
DOMAIN="$1"; ACME_EMAIL="$2"
for f in .env.production .env.db.production .deploy.env.production; do
  if [ -f "$f" ]; then echo "✗ $f already exists. Delete it first if you really want new secrets."; exit 1; fi
done
rand() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-"$1"; }
DB_PW="$(rand 32)"

cat > .env.db.production <<ENV
POSTGRES_USER=shitshpejt
POSTGRES_PASSWORD=$DB_PW
POSTGRES_DB=shitshpejt
ENV

cat > .deploy.env.production <<ENV
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
ENV

cat > .env.production <<ENV
APP_ENV=production
SITE_URL=https://$DOMAIN
BETTER_AUTH_URL=https://$DOMAIN
BETTER_AUTH_SECRET=$(rand 64)
DATABASE_URL=postgresql://shitshpejt:$DB_PW@postgres:5432/shitshpejt
ANALYTICS_SALT=$(rand 32)

# REQUIRED: emails (account verification, password reset). Get a key at resend.com
# and verify your domain there. The app refuses to start in production without it.
EMAIL_PROVIDER=resend
EMAIL_FROM="ShitShpejt <njoftime@$DOMAIN>"
RESEND_API_KEY=

# Images: "local" keeps them on the server's media volume (fine to start).
# Switch to s3 + fill S3_* for Hetzner Object Storage later.
STORAGE_DRIVER=local
S3_ENDPOINT=
S3_REGION=fsn1
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=

# Optional: Google sign-in
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

MODERATION_MODE=first_n
MODERATION_TRUST_AFTER=3
LOG_LEVEL=info
ENV
chmod 600 .env.production .env.db.production .deploy.env.production
echo "✓ created .env.production, .env.db.production, .deploy.env.production"
echo "  Now open .env.production and paste your RESEND_API_KEY."
