# ShitShpejt — convenience targets. pnpm scripts in package.json remain the source of truth.
# Run `make` (or `make help`) to list targets.
SHELL := /bin/bash
.RECIPEPREFIX := >
.DEFAULT_GOAL := help

IMAGE ?= shitshpejt
TAG   ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo local)
COMPOSE_PROD := docker compose -f compose.prod.yaml

.PHONY: help
help: ## Show this help
> @grep -hE '^[a-zA-Z0-9_.-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n",$$1,$$2}'

# ---------- setup ----------
.PHONY: install env setup
install: ## Install dependencies (frozen lockfile)
> pnpm install --frozen-lockfile

env: ## Create .env from .env.example if missing
> @test -f .env || (cp .env.example .env && echo "Created .env: set BETTER_AUTH_SECRET (>=32 chars)")

setup: install env db-up db-deploy db-seed ## First-time local setup

# ---------- database ----------
.PHONY: db-up db-down db-deploy db-migrate db-seed db-seed-demo db-reset admin
db-up: ## Start local Postgres (docker compose)
> pnpm db:up

db-down: ## Stop local services (data volume kept)
> docker compose down

db-deploy: ## Apply migrations
> pnpm db:deploy

db-migrate: ## New migration (create-only; then strip searchVector lines, see docs/ARCHITECTURE.md)
> pnpm exec prisma migrate dev --create-only

db-seed: ## Reference data (categories, cities, promotion prices)
> pnpm db:seed

db-seed-demo: ## DEV ONLY: demo listings labelled DEMO
> pnpm db:seed:demo

db-reset: ## DEV ONLY: reset local DB, migrate and seed
> pnpm exec prisma migrate reset --force --skip-seed
> pnpm db:seed

admin: ## Grant admin: make admin EMAIL=you@example.com
> @test -n "$(EMAIL)" || (echo "Usage: make admin EMAIL=you@example.com" && exit 1)
> pnpm admin:grant $(EMAIL)

# ---------- dev ----------
.PHONY: dev worker
dev: ## Next.js dev server
> pnpm dev

worker: ## pg-boss worker (watch mode)
> pnpm worker:dev

# ---------- quality ----------
.PHONY: lint typecheck i18n test e2e build check
lint: ## ESLint
> pnpm lint
typecheck: ## TypeScript
> pnpm typecheck
i18n: ## Check translation keys (sq + en)
> pnpm i18n:check
test: ## Unit + integration tests (needs Postgres)
> pnpm test
e2e: ## Playwright E2E (mobile + desktop)
> pnpm test:e2e
build: ## Production build (web + worker)
> pnpm build

check: lint typecheck i18n test build ## Definition of done

# ---------- docker / server ----------
.PHONY: docker-build prod-up prod-down prod-logs deploy-here rollback-here
docker-build: ## Build the production image as $(IMAGE):$(TAG)
> docker build -f docker/Dockerfile -t $(IMAGE):$(TAG) .

prod-up: ## On the server: start the stack, TAG=<sha>
> TAG=$(TAG) $(COMPOSE_PROD) up -d --wait

prod-down: ## On the server: stop the stack (volumes kept)
> TAG=$(TAG) $(COMPOSE_PROD) down

prod-logs: ## On the server: follow web + worker logs
> TAG=$(TAG) $(COMPOSE_PROD) logs -f web worker

deploy-here: ## On the server: deploy TAG with health check + auto-rollback
> bash scripts/deploy.sh $(TAG)

rollback-here: ## On the server: redeploy the previous tag
> bash scripts/deploy.sh "$$(cat .previous_tag)"

# ---------- deploy to your Hetzner server (run from your laptop) ----------
# First time:   make server-setup HOST=1.2.3.4
#               make prod-env DOMAIN=shitshpejt.al EMAIL=you@example.com
#               make server-env HOST=1.2.3.4
#               make ship HOST=1.2.3.4
# Every deploy: make ship HOST=1.2.3.4
# Tip: put the line HOST=1.2.3.4 in a file called .deploy.local to stop typing it.
-include .deploy.local
HOST       ?=
SSH_USER   ?= deploy
REMOTE     := $(SSH_USER)@$(HOST)
APP_DIR    := /opt/shitshpejt
PLATFORM   ?= linux/amd64
REPO       ?= lazari03/shite-sot
DEPLOY_TAG := $(shell git describe --always --dirty 2>/dev/null || echo local)
IMAGE_REF  := ghcr.io/$(REPO):$(DEPLOY_TAG)
ON_SERVER  := cd $(APP_DIR) && TAG=$$(cat .current_tag) docker compose -f compose.prod.yaml

.PHONY: deploy
deploy: ## ★ Deploy the site (asks for server IP, domain, keys the first time)
> bash scripts/deploy-all.sh

.PHONY: need-host server-setup prod-env server-env ship server-status server-logs server-ssh server-rollback server-admin server-backup
need-host:
> @test -n "$(HOST)" || (echo "Set HOST to your Hetzner server IP, e.g. make $(MAKECMDGOALS) HOST=1.2.3.4" && exit 1)

server-setup: need-host ## 1. Prepare a fresh server (Docker, firewall, deploy user). HOST=ip
> ssh root@$(HOST) 'bash -s' < scripts/bootstrap-server.sh

prod-env: ## 2. Create production env files with random secrets. DOMAIN=... EMAIL=...
> @test -n "$(DOMAIN)" -a -n "$(EMAIL)" || (echo "Usage: make prod-env DOMAIN=shitshpejt.al EMAIL=you@example.com" && exit 1)
> bash scripts/make-prod-env.sh $(DOMAIN) $(EMAIL)

server-env: need-host ## 3. Upload the env files to the server
> scp .env.production $(REMOTE):$(APP_DIR)/.env
> scp .env.db.production $(REMOTE):$(APP_DIR)/.env.db
> scp .deploy.env.production $(REMOTE):$(APP_DIR)/.deploy.env
> ssh $(REMOTE) 'chmod 600 $(APP_DIR)/.env $(APP_DIR)/.env.db $(APP_DIR)/.deploy.env'

ship: need-host ## 4. Build here, upload, migrate, start, health check (auto-rollback)
> docker buildx build --platform $(PLATFORM) -f docker/Dockerfile -t $(IMAGE_REF) --load .
> @echo "Uploading image (a few hundred MB)..."
> docker save $(IMAGE_REF) | gzip -1 | ssh $(REMOTE) 'gunzip | docker load'
> scp compose.prod.yaml scripts/deploy.sh $(REMOTE):$(APP_DIR)/
> scp docker/Caddyfile $(REMOTE):$(APP_DIR)/docker/Caddyfile
> ssh $(REMOTE) 'cd $(APP_DIR) && SKIP_PULL=1 IMAGE_REPO=$(REPO) bash deploy.sh $(DEPLOY_TAG)'

server-status: need-host ## Show containers on the server
> ssh $(REMOTE) '$(ON_SERVER) ps'

server-logs: need-host ## Follow web + worker logs on the server
> ssh -t $(REMOTE) '$(ON_SERVER) logs -f --tail 100 web worker'

server-ssh: need-host ## Open a shell on the server
> ssh -t $(REMOTE) 'cd $(APP_DIR) && exec bash'

server-rollback: need-host ## Go back to the previous version
> ssh $(REMOTE) 'cd $(APP_DIR) && SKIP_PULL=1 IMAGE_REPO=$(REPO) bash deploy.sh "$$(cat .previous_tag)"'

server-admin: need-host ## Make a registered user admin: EMAIL=you@example.com
> @test -n "$(EMAIL)" || (echo "Usage: make server-admin EMAIL=you@example.com" && exit 1)
> ssh $(REMOTE) '$(ON_SERVER) run --rm migrate admin-grant $(EMAIL)'

server-backup: need-host ## Download a database backup (backup-DATE.dump)
> ssh $(REMOTE) '$(ON_SERVER) exec -T postgres sh -c "pg_dump -U shitshpejt -Fc shitshpejt"' > backup-$$(date +%F-%H%M).dump

# ---------- cleanup ----------
.PHONY: clean
clean: ## Remove build output and local test artefacts
> rm -rf .next dist test-results playwright-report .storage-test .storage-e2e
