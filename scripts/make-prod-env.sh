#!/usr/bin/env bash
# Creates the production env files locally (git-ignored) with fresh random secrets.
# Usage: scripts/make-prod-env.sh <domain> <acme-email>
set -euo pipefail
DOMAIN="$1"; ACME_EMAIL="$2"
for f in .env.production .deploy.env.production; do
  if [ -f "$f" ]; then echo "✗ $f already exists. Delete it first if you really want new secrets."; exit 1; fi
done
rand() { openssl rand -base64 48 | tr -d '/+=\n' | cut -c1-"$1"; }
cat > .deploy.env.production <<ENV
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
ENV

cat > .env.production <<ENV
APP_ENV=production
SITE_URL=https://$DOMAIN
BETTER_AUTH_URL=https://$DOMAIN
BETTER_AUTH_SECRET=$(rand 64)
# Paste the Supabase direct or session pooler connection URI with sslmode=require.
DATABASE_URL=
ANALYTICS_SALT=$(rand 32)

# Production email verification requires a Resend key and a verified sender domain.
EMAIL_PROVIDER=resend
REQUIRE_EMAIL_VERIFICATION=true
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

MODERATION_MODE=all
MODERATION_TRUST_AFTER=3
LOG_LEVEL=info
ENV
chmod 600 .env.production .deploy.env.production
echo "✓ created .env.production,, .deploy.env.production"
