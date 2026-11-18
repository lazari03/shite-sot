# ShiteSot

**Shite shpejt. Gjej lirë.** A mobile-first marketplace for Albania, built around fast selling, genuine price drops, urgent sales and buyer alerts.

> Status: pre-MVP. This repo currently contains the product spec, architecture, design system and AI-agent setup. Application code comes next, following `docs/ARCHITECTURE.md` → *Build order*.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 + liquid glass · PostgreSQL 17 · Prisma · Better Auth · pg-boss · Hetzner Object Storage · Serwist PWA · Docker Compose + Caddy on Hetzner Cloud

## Docs

| | |
|---|---|
| [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md) | Full product spec (source of truth) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, folder structure, data model, search, jobs |
| [`docs/BRAND.md`](docs/BRAND.md) | Colours, typography, logo, voice |
| [`docs/TODO.md`](docs/TODO.md) | Open work and external setup |

## AI agents

The repo is set up so Claude, ChatGPT/Codex and Gemini all work from the **same rules and skills**:

| Tool | Entry file | Skills |
|---|---|---|
| OpenAI Codex / ChatGPT | `AGENTS.md` | `.agents/skills/` |
| Claude Code | `CLAUDE.md` (imports `AGENTS.md`) + `.claude/agents/` subagents | `.claude/skills/` → symlink to `.agents/skills/` |
| Gemini CLI | `GEMINI.md` (imports `AGENTS.md`) | `.agents/skills/` |

Shared skills:
- **`shitesot-design`**: design system, liquid glass, app-feel/PWA, component specs, Tailwind v4 tokens (`assets/tokens.css`)
- **`shitesot-backend`**: Prisma, server actions, auth/RBAC, search, jobs, uploads, imports, payments
- **`shitesot-deploy-hetzner`**: Docker, Caddy, CI/CD, env, backups on Hetzner

Edit rules in `AGENTS.md` and skills in `.agents/skills/` only. Everything else points there.

**Windows users:** enable symlinks (`git config core.symlinks true` + Developer Mode) or `.claude/skills/` will check out as text files.
