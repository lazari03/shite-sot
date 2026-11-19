# CLAUDE.md — ShitShpejt

@AGENTS.md

## Claude Code specifics

- **Skills** are in `.claude/skills/` (symlinked to the shared `.agents/skills/`). They load automatically by description. Use `shitesot-design` before any UI work.
- **Subagents** are in `.claude/agents/`:
  - `ui-builder`: builds screens and components using the prototype-derived design system.
  - `backend-engineer`: Prisma schema, server actions, auth, jobs, search, imports.
  - `reviewer`: security, correctness and spec-compliance gate. Run it before opening any PR.
- **Plan mode first** for anything that touches the Prisma schema, auth, payments, or listing state transitions.
- When building UI, check the result at a **390×844** viewport (iPhone 14/15) before desktop.
- After finishing a stage, run the full definition-of-done command chain from `AGENTS.md`. Don't report done until it's green.
- Keep `docs/TODO.md` updated with anything deferred.
