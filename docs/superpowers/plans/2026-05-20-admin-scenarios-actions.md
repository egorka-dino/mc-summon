# Admin Scenarios With Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-only scenarios built from ordered actions: give item, summon mob, and run another scenario.

**Architecture:** Store scenarios in one `scenarios` table with JSON actions. Build execution server-side from saved library items and mobs, reusing existing command builders and Exaroton client. Keep UI compact: no full item or mob editors inside scenario actions.

**Tech Stack:** Next.js App Router, TypeScript, React client components, Neon serverless, Clerk admin guard, Exaroton API.

---

### Task 1: Scenario Storage

**Files:**
- Create: `app/server/scenarios.ts`
- Modify: `app/server/library-id.ts` if a new prefix helper is needed.

- [ ] Add scenario action TypeScript types.
- [ ] Create `ensureScenariosTable()`.
- [ ] Implement `listScenarios()`, `validateScenario()`, `upsertScenario()`, and `deleteScenario()`.
- [ ] Normalize action IDs, quantities, spawn targets, and future payloads.

### Task 2: Scenario APIs

**Files:**
- Create: `app/api/admin/scenarios/route.ts`
- Create: `app/api/admin/scenarios/execute/route.ts`
- Create: `app/server/scenario-execution.ts`

- [ ] Add admin-only CRUD route.
- [ ] Add execution route.
- [ ] Implement cycle-safe scenario expansion with max depth 5.
- [ ] Execute commands sequentially through `executeExarotonCommand`.
- [ ] Return per-action results.

### Task 3: Admin UI

**Files:**
- Modify: `app/admin/admin-nav.tsx`
- Modify: `app/admin/page.tsx`
- Create: `app/admin/scenarios/page.tsx`
- Create: `app/admin/scenarios/scenarios-client.tsx`
- Modify: `app/globals.css`
- Modify: `style.css` only if shared executor styles need small additions.

- [ ] Add navigation item «Сценарии».
- [ ] Add scenario list and editor form.
- [ ] Add compact action cards for `give_item`, `summon_mob`, and `run_scenario`.
- [ ] Add action controls: add, duplicate, delete, move up, move down.
- [ ] Add execution block: server, player, refresh, execute.
- [ ] Show result per action.

### Task 4: Tests And Docs

**Files:**
- Create: `tests/scenario-execution.test.mjs`
- Modify: `docs/developer-documentation.md`

- [ ] Add tests for cycle detection and flattening nested scenario actions.
- [ ] Run helper tests and `npm run build`.
- [ ] Update developer docs for storage, API, action model, and execution.
- [ ] Deploy preview with `npx vercel deploy --yes`.
