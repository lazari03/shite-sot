# GEMINI.md — ShitShpejt

@AGENTS.md

## Gemini CLI specifics

- **Skills** are auto-discovered from `.agents/skills/` (`shitesot-design`, `shitesot-backend`, `shitesot-deploy-hetzner`). Confirm with `/skills list`. If a skill doesn't activate, read its `SKILL.md` before you start.
- Additional context to load when relevant: `@docs/ARCHITECTURE.md`, `@docs/BRAND.md`, `@docs/MASTER_PROMPT.md`.
- **Propose a plan before editing** anything that touches `prisma/schema.prisma`, auth, payments, or listing state transitions. Wait for approval.
- Verify UI at a **390×844** mobile viewport first.
- Don't report a task done until `pnpm lint && pnpm typecheck && pnpm test && pnpm build` passes.
- Keep `docs/TODO.md` updated with anything deferred.
