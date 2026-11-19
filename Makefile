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
.PHONY: docker-build prod-up prod-down prod-logs deploy rollback
docker-build: ## Build the production image as $(IMAGE):$(TAG)
> docker build -f docker/Dockerfile -t $(IMAGE):$(TAG) .

prod-up: ## On the server: start the stack, TAG=<sha>
> TAG=$(TAG) $(COMPOSE_PROD) up -d --wait

prod-down: ## On the server: stop the stack (volumes kept)
> TAG=$(TAG) $(COMPOSE_PROD) down

prod-logs: ## On the server: follow web + worker logs
> TAG=$(TAG) $(COMPOSE_PROD) logs -f web worker

deploy: ## On the server: deploy TAG with health check + auto-rollback
> bash scripts/deploy.sh $(TAG)

rollback: ## On the server: redeploy the previous tag
> bash scripts/deploy.sh "$$(cat .previous_tag)"

# ---------- cleanup ----------
.PHONY: clean
clean: ## Remove build output and local test artefacts
> rm -rf .next dist test-results playwright-report .storage-test .storage-e2e
