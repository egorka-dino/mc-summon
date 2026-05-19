# Admin Library Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first admin library preview phase: reusable item/mob editors, admin CRUD for saved items and mobs, and public `/summon` templates backed by `library_mobs`.

**Architecture:** Keep command generation in existing `app/components/give/engine.ts` and `app/components/summon/engine.ts`. Rename UI editor components to `ItemEditor` and `MobEditor`, then wrap them in admin library client pages that save snapshots to Neon through admin-only route handlers. Replace the old summon template persistence model with `library_mobs`.

**Tech Stack:** Next.js App Router, TypeScript, React client components, Clerk admin checks, Neon serverless SQL, existing CSS in `style.css` and `app/globals.css`.

---

## File Structure

- Rename `app/components/give/GiveEditor.tsx` to `app/components/give/ItemEditor.tsx`; export `ItemEditor`.
- Rename `app/components/summon/SummonEditor.tsx` to `app/components/summon/MobEditor.tsx`; export `MobEditor`.
- Modify `app/give/page.tsx` to import `ItemEditor`.
- Modify `app/summon/page.tsx` to import `MobEditor` and `listLibraryMobs`.
- Create `app/server/admin-guard.ts` for shared admin route checks.
- Create `app/server/library-id.ts` for server-side ID generation.
- Create `app/server/library-items.ts` for `library_items`.
- Create `app/server/library-mobs.ts` for `library_mobs`.
- Create `app/api/admin/library/items/route.ts`.
- Create `app/api/admin/library/mobs/route.ts`.
- Modify `app/api/summon/templates/route.ts` to read from `library_mobs`.
- Create `app/admin/library/items/page.tsx`.
- Create `app/admin/library/items/library-items-client.tsx`.
- Create `app/admin/library/mobs/page.tsx`.
- Create `app/admin/library/mobs/library-mobs-client.tsx`.
- Modify `app/admin/admin-nav.tsx`.
- Remove or neutralize old summon template admin imports from `app/admin/templates/page.tsx` and `app/admin/summon-templates-client.tsx` if no longer referenced.
- Modify `docs/user-functionality.md`.
- Modify `docs/developer-documentation.md`.

## Task 1: Rename Editors And Preserve Public Pages

**Files:**
- Move: `app/components/give/GiveEditor.tsx` -> `app/components/give/ItemEditor.tsx`
- Move: `app/components/summon/SummonEditor.tsx` -> `app/components/summon/MobEditor.tsx`
- Modify: `app/give/page.tsx`
- Modify: `app/summon/page.tsx`
- Modify references found by `rg "GiveEditor|SummonEditor"`

- [ ] **Step 1: Move files with git**

Run:

```bash
git mv app/components/give/GiveEditor.tsx app/components/give/ItemEditor.tsx
git mv app/components/summon/SummonEditor.tsx app/components/summon/MobEditor.tsx
```

- [ ] **Step 2: Rename component exports and imports**

Change `export function GiveEditor()` to:

```tsx
export function ItemEditor() {
```

Change `export function SummonEditor(...)` to:

```tsx
export function MobEditor({ adminMode = false, showAiAssistant = false, initialSnapshot, templates, onSnapshotChange }: Props) {
```

Change `/give` import and render:

```tsx
import { ItemEditor } from "../components/give/ItemEditor";

// ...
<ItemEditor />
```

Change `/summon` import and render:

```tsx
import { MobEditor } from "../components/summon/MobEditor";

// ...
<MobEditor templates={templates} />
```

- [ ] **Step 3: Verify rename references**

Run:

```bash
rg "GiveEditor|SummonEditor"
```

Expected: no references except historical docs/spec text.

- [ ] **Step 4: Run build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "refactor: rename shared item and mob editors"
```

## Task 2: Add Admin Guards And Library ID Helper

**Files:**
- Create: `app/server/admin-guard.ts`
- Create: `app/server/library-id.ts`

- [ ] **Step 1: Add shared admin guard**

Create `app/server/admin-guard.ts`:

```ts
import { currentUser } from "@clerk/nextjs/server";
import { isAdminFromMetadata, isClerkConfigured } from "./auth";

export async function requireAdminResponse() {
  if (!isClerkConfigured()) {
    return Response.json({ ok: false, error: "Clerk не настроен" }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Войдите в админку" }, { status: 401 });
  }

  if (!isAdminFromMetadata(user)) {
    return Response.json({ ok: false, error: "Доступно только администратору" }, { status: 403 });
  }

  return null;
}
```

- [ ] **Step 2: Add server-side ID helper**

Create `app/server/library-id.ts`:

```ts
const translit: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugifyLibraryName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "draft";
}

export function createLibraryId(prefix: "item" | "mob", name: string) {
  const slug = slugifyLibraryName(name);
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${slug}-${time}-${random}`;
}
```

- [ ] **Step 3: Run type checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/server/admin-guard.ts app/server/library-id.ts
git commit -m "feat: add admin library server helpers"
```

## Task 3: Add Library Item Persistence And API

**Files:**
- Create: `app/server/library-items.ts`
- Create: `app/api/admin/library/items/route.ts`

- [ ] **Step 1: Implement `library_items` server module**

Create `app/server/library-items.ts` with:

```ts
import { defaultGiveSnapshot, type GiveSnapshot } from "../components/give/engine";
import { getSql } from "./db";
import { createLibraryId } from "./library-id";

export type LibraryItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  snapshot: GiveSnapshot;
  enabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LibraryItemInput = Partial<Omit<LibraryItem, "createdAt" | "updatedAt">>;

type DbLibraryItemRow = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  snapshot: GiveSnapshot | string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureLibraryItemsTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    create table if not exists library_items (
      id text primary key,
      category text not null default 'Предметы',
      name text not null,
      description text not null default '',
      version integer not null default 1,
      snapshot jsonb not null,
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

function parseJsonColumn<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

function rowToLibraryItem(row: DbLibraryItemRow): LibraryItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    version: row.version,
    snapshot: parseJsonColumn(row.snapshot),
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSnapshot(input: unknown): GiveSnapshot {
  const fallback = defaultGiveSnapshot();
  const source = input && typeof input === "object" && !Array.isArray(input) ? input as Partial<GiveSnapshot> : {};
  return {
    ...fallback,
    ...source,
    itemId: typeof source.itemId === "string" ? source.itemId : fallback.itemId,
    count: typeof source.count === "string" || typeof source.count === "number" ? String(source.count) : fallback.count,
    fields: source.fields && typeof source.fields === "object" && !Array.isArray(source.fields) ? source.fields : fallback.fields,
    explosions: Array.isArray(source.explosions) ? source.explosions : fallback.explosions,
    shieldLayers: Array.isArray(source.shieldLayers) ? source.shieldLayers : fallback.shieldLayers,
  };
}

export async function listLibraryItems() {
  await ensureLibraryItemsTable();
  const sql = getSql();
  const rows = await sql`
    select id, category, name, description, version, snapshot, enabled, created_at, updated_at
    from library_items
    order by updated_at desc, name asc
  ` as DbLibraryItemRow[];
  return rows.map(rowToLibraryItem);
}

export function validateLibraryItem(input: LibraryItemInput): LibraryItem {
  const name = String(input.name || "").trim();
  const category = String(input.category || "Предметы").trim();
  const description = String(input.description || "").trim();
  const version = Number(input.version || 1);

  if (!name) throw new Error("Название обязательно.");
  if (!category) throw new Error("Категория обязательна.");
  if (!Number.isInteger(version) || version < 1) throw new Error("Версия должна быть положительным целым числом.");

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : createLibraryId("item", name),
    category,
    name,
    description,
    version,
    snapshot: normalizeSnapshot(input.snapshot),
    enabled: input.enabled !== false,
  };
}

export async function upsertLibraryItem(input: LibraryItemInput) {
  const item = validateLibraryItem(input);
  await ensureLibraryItemsTable();
  const sql = getSql();
  const rows = await sql`
    insert into library_items (id, category, name, description, version, snapshot, enabled, updated_at)
    values (${item.id}, ${item.category}, ${item.name}, ${item.description}, ${item.version}, ${JSON.stringify(item.snapshot)}::jsonb, ${item.enabled}, now())
    on conflict (id) do update set
      category = excluded.category,
      name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      snapshot = excluded.snapshot,
      enabled = excluded.enabled,
      updated_at = now()
    returning id, category, name, description, version, snapshot, enabled, created_at, updated_at
  ` as DbLibraryItemRow[];
  return rowToLibraryItem(rows[0]);
}

export async function deleteLibraryItem(id: string) {
  await ensureLibraryItemsTable();
  const sql = getSql();
  await sql`delete from library_items where id = ${id}`;
}
```

- [ ] **Step 2: Implement admin route**

Create `app/api/admin/library/items/route.ts`:

```ts
import { requireAdminResponse } from "../../../../server/admin-guard";
import { deleteLibraryItem, listLibraryItems, upsertLibraryItem } from "../../../../server/library-items";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const error = await requireAdminResponse();
  if (error) return error;
  return Response.json({ ok: true, items: await listLibraryItems() });
}

export async function POST(request: Request) {
  const error = await requireAdminResponse();
  if (error) return error;

  try {
    const item = await upsertLibraryItem(await request.json());
    return Response.json({ ok: true, item });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Не удалось сохранить предмет" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const error = await requireAdminResponse();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ ok: false, error: "Не указан предмет" }, { status: 400 });
  }

  await deleteLibraryItem(id);
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/server/library-items.ts app/api/admin/library/items/route.ts
git commit -m "feat: add item library storage"
```

## Task 4: Add Library Mob Persistence And Switch Public Templates

**Files:**
- Create: `app/server/library-mobs.ts`
- Modify: `app/api/summon/templates/route.ts`
- Modify: `app/summon/page.tsx`

- [ ] **Step 1: Implement `library_mobs` server module**

Create `app/server/library-mobs.ts` using the shape of `app/server/summon-templates.ts`, but with generated IDs and library naming:

```ts
import type { SummonSnapshot } from "../components/summon/data";
import { normalizeSnapshot, toSnapshot } from "../components/summon/engine";
import { getSql } from "./db";
import { createLibraryId } from "./library-id";

export type LibraryMob = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  mobOrder: Array<{ mobType: string }>;
  fields: SummonSnapshot["fields"];
  enabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LibraryMobInput = Partial<Omit<LibraryMob, "createdAt" | "updatedAt">>;

type DbLibraryMobRow = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  mob_order: Array<{ mobType: string }> | string;
  fields: SummonSnapshot["fields"] | string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureLibraryMobsTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    create table if not exists library_mobs (
      id text primary key,
      category text not null default 'Мобы',
      name text not null,
      description text not null default '',
      version integer not null default 1,
      mob_order jsonb not null,
      fields jsonb not null,
      enabled boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

function parseJsonColumn<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

function rowToLibraryMob(row: DbLibraryMobRow): LibraryMob {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    version: row.version,
    mobOrder: parseJsonColumn(row.mob_order),
    fields: parseJsonColumn(row.fields),
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLibraryMobSnapshot(input: LibraryMobInput) {
  const fallback = toSnapshot(["zombie"]);
  const mobOrder = Array.isArray(input.mobOrder) && input.mobOrder.length ? input.mobOrder : fallback.mobOrder;
  const fields = input.fields && typeof input.fields === "object" && !Array.isArray(input.fields) ? input.fields : fallback.fields;
  return normalizeSnapshot({ mobOrder, fields });
}

export async function listLibraryMobs({ admin = false } = {}) {
  await ensureLibraryMobsTable();
  const sql = getSql();
  const rows = await sql`
    select id, category, name, description, version, mob_order, fields, enabled, created_at, updated_at
    from library_mobs
    order by updated_at desc, name asc
  ` as DbLibraryMobRow[];
  return rows.map(rowToLibraryMob).filter((mob) => admin || mob.enabled);
}

export function validateLibraryMob(input: LibraryMobInput): LibraryMob {
  const name = String(input.name || "").trim();
  const category = String(input.category || "Мобы").trim();
  const description = String(input.description || "").trim();
  const version = Number(input.version || 1);
  const snapshot = normalizeLibraryMobSnapshot(input);

  if (!name) throw new Error("Название обязательно.");
  if (!category) throw new Error("Категория обязательна.");
  if (!Number.isInteger(version) || version < 1) throw new Error("Версия должна быть положительным целым числом.");

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : createLibraryId("mob", name),
    category,
    name,
    description,
    version,
    mobOrder: snapshot.mobOrder,
    fields: snapshot.fields,
    enabled: input.enabled !== false,
  };
}

export async function upsertLibraryMob(input: LibraryMobInput) {
  const mob = validateLibraryMob(input);
  await ensureLibraryMobsTable();
  const sql = getSql();
  const rows = await sql`
    insert into library_mobs (id, category, name, description, version, mob_order, fields, enabled, updated_at)
    values (${mob.id}, ${mob.category}, ${mob.name}, ${mob.description}, ${mob.version}, ${JSON.stringify(mob.mobOrder)}::jsonb, ${JSON.stringify(mob.fields)}::jsonb, ${mob.enabled}, now())
    on conflict (id) do update set
      category = excluded.category,
      name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      mob_order = excluded.mob_order,
      fields = excluded.fields,
      enabled = excluded.enabled,
      updated_at = now()
    returning id, category, name, description, version, mob_order, fields, enabled, created_at, updated_at
  ` as DbLibraryMobRow[];
  return rowToLibraryMob(rows[0]);
}

export async function deleteLibraryMob(id: string) {
  await ensureLibraryMobsTable();
  const sql = getSql();
  await sql`delete from library_mobs where id = ${id}`;
}
```

- [ ] **Step 2: Switch public template API**

Modify `app/api/summon/templates/route.ts`:

```ts
import { getDatabaseUrlStatus } from "../../../server/db";
import { listLibraryMobs } from "../../../server/library-mobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: true, source: "library_mobs", templates: [] });
  }

  try {
    return Response.json({ ok: true, source: "library_mobs", templates: await listLibraryMobs() });
  } catch {
    return Response.json({ ok: true, source: "library_mobs", templates: [] });
  }
}
```

- [ ] **Step 3: Switch `/summon` server page**

Modify `app/summon/page.tsx` imports:

```tsx
import { MobEditor } from "../components/summon/MobEditor";
import type { SummonTemplateLike } from "../components/summon/data";
import { getDatabaseUrlStatus } from "../server/db";
import { listLibraryMobs } from "../server/library-mobs";
```

Use:

```tsx
templates = await listLibraryMobs();
```

Render:

```tsx
<MobEditor templates={templates} />
```

- [ ] **Step 4: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/server/library-mobs.ts app/api/summon/templates/route.ts app/summon/page.tsx
git commit -m "feat: add mob library storage"
```

## Task 5: Add Admin Item Library UI

**Files:**
- Modify: `app/components/give/ItemEditor.tsx`
- Create: `app/admin/library/items/page.tsx`
- Create: `app/admin/library/items/library-items-client.tsx`
- Modify: `style.css` or `app/globals.css`

- [ ] **Step 1: Add admin props to `ItemEditor`**

Change props near the top of `ItemEditor.tsx`:

```tsx
type Props = {
  adminMode?: boolean;
  showAiAssistant?: boolean;
  initialSnapshot?: GiveSnapshot;
  onSnapshotChange?: (snapshot: GiveSnapshot) => void;
};
```

Change function signature and initial state:

```tsx
export function ItemEditor({ adminMode = false, showAiAssistant = false, initialSnapshot, onSnapshotChange }: Props) {
  const [snapshot, setSnapshot] = useState<GiveSnapshot>(() => initialSnapshot || defaultGiveSnapshot());
```

Add sync effects:

```tsx
useEffect(() => {
  if (initialSnapshot) setSnapshot(initialSnapshot);
}, [initialSnapshot]);

useEffect(() => {
  onSnapshotChange?.(snapshot);
}, [snapshot, onSnapshotChange]);
```

Guard localStorage favorites:

```tsx
useEffect(() => {
  if (adminMode) return;
  try {
    const data = JSON.parse(localStorage.getItem(favoriteStorageKey) || "{\"items\":[]}");
    setFavorites(Array.isArray(data.items) ? data.items : []);
  } catch {
    setFavorites([]);
  }
}, [adminMode]);
```

Hide public favorites and public server executor when `adminMode` is true. Keep command preview visible.

- [ ] **Step 2: Create admin item page**

Create `app/admin/library/items/page.tsx` using the same access pattern as existing admin pages:

```tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminNav } from "../../admin-nav";
import { getAuthUser, isAdminFromMetadata, isClerkConfigured } from "../../../server/auth";
import { getDatabaseUrlStatus } from "../../../server/db";
import { listLibraryItems } from "../../../server/library-items";
import { LibraryItemsClient } from "./library-items-client";

export const dynamic = "force-dynamic";

export default async function AdminLibraryItemsPage() {
  if (!isClerkConfigured()) {
    return <main className="admin-page"><section className="admin-panel"><h1>Библиотека предметов</h1><p>Clerk ещё не настроен.</p></section></main>;
  }

  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/admin/library/items");

  const authUser = await getAuthUser();
  if (!authUser || !isAdminFromMetadata(user)) {
    return <main className="admin-page"><section className="admin-panel"><p className="admin-kicker">Доступ закрыт</p><h1>Библиотека предметов</h1><p>Эта страница доступна только администраторам.</p></section></main>;
  }

  const databaseReady = getDatabaseUrlStatus().configured;
  const items = databaseReady ? await listLibraryItems().catch(() => []) : [];

  return (
    <main className="admin-page">
      <AdminNav active="library-items" />
      <LibraryItemsClient initialItems={items} databaseReady={databaseReady} />
    </main>
  );
}
```

- [ ] **Step 3: Create item library client**

Create `app/admin/library/items/library-items-client.tsx` modelled on the existing summon templates client, but with `ItemEditor`, no editable ID field, and labels `Библиотека предметов`.

Core draft type:

```tsx
type Draft = {
  id?: string;
  category: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  snapshot: GiveSnapshot;
};
```

Save payload:

```tsx
const payload = {
  id: draft.id,
  category: draft.category,
  name: draft.name,
  description: draft.description,
  version: draft.version,
  enabled: draft.enabled,
  snapshot: draft.snapshot,
};
```

Duplicate action must clear `id`:

```tsx
setDraft({ ...draft, id: undefined, name: `${draft.name} копия` });
```

Render:

```tsx
<ItemEditor adminMode showAiAssistant initialSnapshot={draft.snapshot} key={draft.id || "new-item"} onSnapshotChange={updateSnapshot} />
```

- [ ] **Step 4: Add or reuse admin styles**

Use existing `.admin-editor`, `.admin-template-list`, `.admin-template-form`, `.admin-toolbar`, `.admin-form-grid`, `.admin-check`, `.admin-status`. Add only small missing selectors if layout breaks.

- [ ] **Step 5: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/give/ItemEditor.tsx app/admin/library/items style.css app/globals.css
git commit -m "feat: add admin item library"
```

## Task 6: Add Admin Mob Library UI And Remove Template UI Path

**Files:**
- Create: `app/api/admin/library/mobs/route.ts`
- Create: `app/admin/library/mobs/page.tsx`
- Create: `app/admin/library/mobs/library-mobs-client.tsx`
- Modify: `app/admin/admin-nav.tsx`
- Modify or delete: `app/admin/templates/page.tsx`
- Modify references to `summon-templates-client`

- [ ] **Step 1: Implement admin mob route**

Create `app/api/admin/library/mobs/route.ts`:

```ts
import { requireAdminResponse } from "../../../../server/admin-guard";
import { deleteLibraryMob, listLibraryMobs, upsertLibraryMob } from "../../../../server/library-mobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const error = await requireAdminResponse();
  if (error) return error;
  return Response.json({ ok: true, mobs: await listLibraryMobs({ admin: true }) });
}

export async function POST(request: Request) {
  const error = await requireAdminResponse();
  if (error) return error;

  try {
    const mob = await upsertLibraryMob(await request.json());
    return Response.json({ ok: true, mob });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Не удалось сохранить моба" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const error = await requireAdminResponse();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ ok: false, error: "Не указан моб" }, { status: 400 });

  await deleteLibraryMob(id);
  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Create mob page**

Create `app/admin/library/mobs/page.tsx` like the item page, but load `listLibraryMobs({ admin: true })` and render `LibraryMobsClient`.

- [ ] **Step 3: Create mob library client**

Copy the useful structure from `app/admin/summon-templates-client.tsx`, change labels to `Библиотека мобов`, import `MobEditor`, remove editable ID, call `/api/admin/library/mobs`, and clear `id` on duplicate.

Render:

```tsx
<MobEditor
  adminMode
  showAiAssistant
  initialSnapshot={draft.snapshot}
  key={draft.id || "new-mob"}
  onSnapshotChange={updateSnapshot}
  templates={mobs}
/>
```

- [ ] **Step 4: Update admin nav**

Change `app/admin/admin-nav.tsx`:

```ts
type Props = {
  active?: "servers" | "library-items" | "library-mobs";
};

const adminLinks = [
  { href: "/admin/servers", key: "servers", label: "Серверы Exaroton" },
  { href: "/admin/library/items", key: "library-items", label: "Библиотека предметов" },
  { href: "/admin/library/mobs", key: "library-mobs", label: "Библиотека мобов" },
] as const;
```

- [ ] **Step 5: Remove old admin template page from navigation surface**

Either delete `app/admin/templates/page.tsx` and `app/admin/summon-templates-client.tsx`, or replace `app/admin/templates/page.tsx` with a tiny page explaining that templates moved to `Библиотека мобов`. Because backward compatibility is not required, prefer deletion if no imports remain.

Run:

```bash
rg "summon-templates-client|/admin/templates|summon/templates"
```

Expected: old admin client not referenced; public API references are allowed only if intentionally kept until cleanup.

- [ ] **Step 6: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app
git commit -m "feat: add admin mob library"
```

## Task 7: Remove Old Summon Template Server Surface

**Files:**
- Delete or leave unreferenced: `app/server/summon-templates.ts`
- Delete or leave unreferenced: `app/api/admin/summon/templates/route.ts`
- Modify docs references in later task

- [ ] **Step 1: Search old template usage**

Run:

```bash
rg "summon-templates|listSummonTemplates|upsertSummonTemplate|/api/admin/summon/templates|summon_mob_templates"
```

Expected before cleanup: only old files and docs mention them.

- [ ] **Step 2: Delete old unreferenced admin/template files if build allows**

Run:

```bash
git rm app/server/summon-templates.ts app/api/admin/summon/templates/route.ts
```

If Next.js routing complains about deletion only because no code imports them, this is fine. If a public feature still imports them, fix that import before proceeding.

- [ ] **Step 3: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app
git commit -m "refactor: remove legacy summon template storage"
```

## Task 8: Update Documentation

**Files:**
- Modify: `docs/user-functionality.md`
- Modify: `docs/developer-documentation.md`

- [ ] **Step 1: Update user functionality docs**

Document:

- `/give` and `/summon` remain public single-command generators;
- admin-only `Библиотека предметов`;
- admin-only `Библиотека мобов`;
- create/edit/duplicate/delete actions;
- scenarios are planned but not in this phase.

- [ ] **Step 2: Update developer docs**

Document:

- `ItemEditor` and `MobEditor`;
- `library_items` and `library_mobs`;
- new admin API routes;
- `/api/summon/templates` now reads `library_mobs`;
- old user-editable IDs are removed from admin UI;
- no landing `Что нового` entry for this admin-only phase.

- [ ] **Step 3: Check forbidden/old user-facing terms**

Run:

```bash
rg -n "батч|мультикоманд|registry|database|Шаблоны мобов" app docs
```

Expected: no new user-facing forbidden terms. Technical docs may mention database only in developer context.

- [ ] **Step 4: Build checkpoint**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: document admin libraries"
```

## Task 9: Final Verification And Preview Deploy

**Files:**
- No source edits expected unless verification finds a defect.

- [ ] **Step 1: Full build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 2: Start local dev server**

Run:

```bash
npm run dev
```

Expected: local server starts. Use the printed URL, usually `http://localhost:3000`.

- [ ] **Step 3: Browser smoke check**

Open:

- `/give` renders public item generator.
- `/summon` renders public mob generator.
- `/admin/library/items` is protected by Clerk.
- `/admin/library/mobs` is protected by Clerk.

- [ ] **Step 4: Create Vercel preview**

Run:

```bash
npx vercel deploy --yes
```

Expected: command returns a preview URL.

- [ ] **Step 5: Report preview URL and status**

Final report must include:

- worktree path;
- branch name;
- build result;
- preview URL;
- note that Telegram announcement is not needed for this admin-only phase;
- ask user to review preview before the next phase.
