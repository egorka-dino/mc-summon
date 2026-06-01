# Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the public `/locations` section where users save private Minecraft coordinates either in browser `localStorage` or in their Clerk account.

**Architecture:** Put pure location types, labels, validation, normalization, and local-storage constants in one shared module. Use a lazy Neon server module for authenticated account storage, App Router route handlers for CRUD/import/server-list APIs, and one focused client component for the interactive Russian UI.

**Tech Stack:** Next.js App Router, TypeScript, React client components, Clerk auth status, Neon serverless, browser `localStorage`, existing CSS panels/buttons/forms, Node `node:test`.

---

## File Structure

- Create `app/components/locations/data.ts`: shared `PlayerLocation` types, Russian labels, validation, normalization, local ID/date helpers, copy formatting, and `mc-locations:places` key.
- Create `tests/locations-data.test.mjs`: behavior tests for validation and normalization.
- Create `app/server/locations.ts`: Neon table creation and current-user CRUD/import helpers. This module never trusts client-provided `userId`.
- Create `tests/locations-server.test.mjs`: behavior tests for server validation helpers that do not touch Neon.
- Create `app/api/locations/route.ts`: authenticated `GET`, `POST`, and `DELETE`.
- Create `app/api/locations/import/route.ts`: authenticated import endpoint.
- Create `app/api/servers/public/route.ts`: public published-server endpoint backed by `listPublishedExarotonServers()`.
- Create `app/locations/page.tsx`: server shell for the public page.
- Create `app/components/locations/LocationsEditor.tsx`: client UI for local/account mode, form state, filters, search, copy, and import prompt.
- Modify `app/components/SiteNav.tsx`: add "Места".
- Modify `app/page.tsx`: add landing card and top "Что нового" release.
- Modify `style.css`: add location page/card/import/error styles using existing palette and form patterns.
- Modify `docs/user-functionality.md`: document public user behavior.
- Modify `docs/developer-documentation.md`: document routes, storage, table, API, and auth behavior.

---

### Task 1: Shared Location Data And Failing Tests

**Files:**
- Create: `tests/locations-data.test.mjs`
- Create later: `app/components/locations/data.ts`

- [ ] **Step 1: Write the failing shared-data tests**

Create `tests/locations-data.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLocationCoordinates,
  normalizeLocationInput,
  validateLocationInput,
} from "../.test-build/components/locations/data.js";

test("validates required location fields with Russian messages", () => {
  assert.throws(
    () => validateLocationInput({
      title: "",
      server: "",
      world: "",
      x: "",
      y: "",
      z: "",
      type: "",
      description: "",
    }),
    /Введите название/,
  );

  assert.throws(
    () => validateLocationInput({
      title: "Портал",
      server: "",
      world: "Nether",
      x: "1",
      y: "64",
      z: "2",
      type: "Portal",
      description: "",
    }),
    /Выберите сервер/,
  );
});

test("rejects non-numeric coordinates with Russian messages", () => {
  assert.throws(
    () => validateLocationInput({
      title: "Сундук",
      server: "Survival",
      world: "Nether",
      x: "abc",
      y: "64",
      z: "-456",
      type: "Chest",
      description: "",
    }),
    /Координата должна быть числом/,
  );
});

test("normalizes imported data to a safe location shape", () => {
  const normalized = normalizeLocationInput(
    {
      id: "../bad",
      userId: "attacker",
      title: "  Сундук у лавы  ",
      server: " Survival ",
      world: "Nether",
      x: "123",
      y: "64",
      z: "-456",
      type: "Chest",
      description: "  алмазы  ",
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
    {
      id: "loc_test",
      now: "2026-06-01T12:00:00.000Z",
    },
  );

  assert.deepEqual(normalized, {
    id: "loc_test",
    title: "Сундук у лавы",
    server: "Survival",
    world: "Nether",
    x: 123,
    y: 64,
    z: -456,
    type: "Chest",
    description: "алмазы",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
  });
  assert.equal("userId" in normalized, false);
});

test("formats coordinates as plain X Y Z text", () => {
  assert.equal(
    formatLocationCoordinates({ x: 123, y: 64, z: -456 }),
    "123 64 -456",
  );
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
rm -rf .test-build
npx tsc --outDir .test-build --noEmit false --module NodeNext --moduleResolution NodeNext --target ES2022 --rootDir app app/components/locations/data.ts
node --test tests/locations-data.test.mjs
```

Expected: FAIL because `app/components/locations/data.ts` does not exist yet.

- [ ] **Step 3: Implement the shared data module**

Create `app/components/locations/data.ts`:

```ts
export const LOCATIONS_STORAGE_KEY = "mc-locations:places";

export const LOCATION_TYPES = ["Chest", "Portal", "Base", "Structure", "Farm", "Danger", "Other"] as const;
export const LOCATION_WORLDS = ["Overworld", "Nether", "End", "Other"] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];
export type LocationWorld = (typeof LOCATION_WORLDS)[number];

export type PlayerLocation = {
  id: string;
  title: string;
  server: string;
  world: LocationWorld;
  x: number;
  y: number;
  z: number;
  type: LocationType;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationInput = Partial<{
  id: unknown;
  title: unknown;
  server: unknown;
  world: unknown;
  x: unknown;
  y: unknown;
  z: unknown;
  type: unknown;
  description: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}>;

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  Chest: "Сундук",
  Portal: "Портал",
  Base: "База",
  Structure: "Структура",
  Farm: "Ферма",
  Danger: "Опасное место",
  Other: "Другое",
};

export const LOCATION_WORLD_LABELS: Record<LocationWorld, string> = {
  Overworld: "Обычный мир",
  Nether: "Незер",
  End: "Энд",
  Other: "Другой",
};

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

function validDate(value: unknown, fallback: string) {
  const raw = text(value);
  return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : fallback;
}

function isLocationWorld(value: string): value is LocationWorld {
  return LOCATION_WORLDS.includes(value as LocationWorld);
}

function isLocationType(value: string): value is LocationType {
  return LOCATION_TYPES.includes(value as LocationType);
}

function readCoordinate(value: unknown, emptyMessage: string) {
  const raw = text(value).replace(",", ".");
  if (!raw) {
    throw new Error(emptyMessage);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("Координата должна быть числом");
  }
  return parsed;
}

export function createLocationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `loc_${crypto.randomUUID()}`;
  }
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateLocationInput(input: LocationInput) {
  const title = text(input.title);
  const server = text(input.server);
  const world = text(input.world);
  const type = text(input.type);

  if (!title) throw new Error("Введите название");
  if (!server) throw new Error("Выберите сервер");
  if (!world || !isLocationWorld(world)) throw new Error("Выберите мир");
  const x = readCoordinate(input.x, "Введите координату X");
  const y = readCoordinate(input.y, "Введите координату Y");
  const z = readCoordinate(input.z, "Введите координату Z");
  if (!type || !isLocationType(type)) throw new Error("Выберите тип места");

  return {
    title,
    server,
    world,
    x,
    y,
    z,
    type,
    description: text(input.description),
  };
}

export function normalizeLocationInput(
  input: LocationInput,
  options: { id?: string; now?: string } = {},
): PlayerLocation {
  const now = options.now || new Date().toISOString();
  const normalized = validateLocationInput(input);

  return {
    id: options.id || text(input.id) || createLocationId(),
    ...normalized,
    createdAt: validDate(input.createdAt, now),
    updatedAt: validDate(input.updatedAt, now),
  };
}

export function normalizeLocationList(value: unknown): PlayerLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    try {
      return [normalizeLocationInput(item as LocationInput)];
    } catch {
      return [];
    }
  });
}

export function formatLocationCoordinates(location: Pick<PlayerLocation, "x" | "y" | "z">) {
  return `${location.x} ${location.y} ${location.z}`;
}
```

- [ ] **Step 4: Run the shared-data tests and verify GREEN**

Run:

```bash
rm -rf .test-build
npx tsc --outDir .test-build --noEmit false --module NodeNext --moduleResolution NodeNext --target ES2022 --rootDir app app/components/locations/data.ts
node --test tests/locations-data.test.mjs
```

Expected: PASS for all tests in `tests/locations-data.test.mjs`.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/components/locations/data.ts tests/locations-data.test.mjs
git commit -m "feat: add locations data validation"
```

---

### Task 2: Server Storage Helpers And Tests

**Files:**
- Create: `tests/locations-server.test.mjs`
- Create: `app/server/locations.ts`

- [ ] **Step 1: Write failing server-helper tests**

Create `tests/locations-server.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeLocationForUser,
  normalizeLocationsForImport,
} from "../.test-build/server/locations.js";

test("normalizes a location for the authenticated user only", () => {
  const location = normalizeLocationForUser("user_real", {
    id: "loc_client",
    userId: "user_attacker",
    title: "База",
    server: "Survival",
    world: "Overworld",
    x: "10",
    y: "70",
    z: "-20",
    type: "Base",
    description: "",
  }, { now: "2026-06-01T12:00:00.000Z" });

  assert.equal(location.userId, "user_real");
  assert.equal(location.id, "loc_client");
  assert.equal(location.title, "База");
});

test("import creates fresh account IDs", () => {
  const imported = normalizeLocationsForImport("user_real", [
    {
      id: "loc_local",
      title: "Портал",
      server: "Survival",
      world: "Nether",
      x: "1",
      y: "64",
      z: "2",
      type: "Portal",
      description: "",
    },
  ], {
    now: "2026-06-01T12:00:00.000Z",
    createId: () => "loc_account",
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "loc_account");
  assert.equal(imported[0].userId, "user_real");
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
rm -rf .test-build
npx tsc --outDir .test-build --noEmit false --module NodeNext --moduleResolution NodeNext --target ES2022 --rootDir app app/components/locations/data.ts app/server/locations.ts
node --test tests/locations-server.test.mjs
```

Expected: FAIL because `app/server/locations.ts` does not exist yet.

- [ ] **Step 3: Implement the server storage module**

Create `app/server/locations.ts`:

```ts
import {
  createLocationId,
  normalizeLocationInput,
  type LocationInput,
  type PlayerLocation,
} from "../components/locations/data";
import { getDatabaseUrlStatus, getSql } from "./db";

export type AccountLocation = PlayerLocation & {
  userId: string;
};

type DbLocationRow = {
  id: string;
  user_id: string;
  title: string;
  server: string;
  world: PlayerLocation["world"];
  x: number;
  y: number;
  z: number;
  type: PlayerLocation["type"];
  description: string;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureLocationsTable() {
  if (tableReady) return;
  const sql = getSql();
  await sql`
    create table if not exists player_locations (
      id text primary key,
      user_id text not null,
      title text not null,
      server text not null,
      world text not null,
      x double precision not null,
      y double precision not null,
      z double precision not null,
      type text not null,
      description text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create index if not exists player_locations_user_id_idx
    on player_locations (user_id)
  `;
  tableReady = true;
}

function rowToLocation(row: DbLocationRow): AccountLocation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    server: row.server,
    world: row.world,
    x: Number(row.x),
    y: Number(row.y),
    z: Number(row.z),
    type: row.type,
    description: row.description,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function assertLocationsDatabaseConfigured() {
  if (!getDatabaseUrlStatus().configured) {
    throw new Error("DATABASE_URL не настроен.");
  }
}

export function normalizeLocationForUser(
  userId: string,
  input: LocationInput,
  options: { now?: string; id?: string } = {},
): AccountLocation {
  const normalized = normalizeLocationInput(input, {
    id: options.id,
    now: options.now,
  });

  return {
    ...normalized,
    userId,
  };
}

export function normalizeLocationsForImport(
  userId: string,
  input: unknown,
  options: { now?: string; createId?: () => string } = {},
): AccountLocation[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    try {
      return [
        normalizeLocationForUser(userId, item as LocationInput, {
          id: options.createId ? options.createId() : createLocationId(),
          now: options.now,
        }),
      ];
    } catch {
      return [];
    }
  });
}

export async function listUserLocations(userId: string) {
  assertLocationsDatabaseConfigured();
  await ensureLocationsTable();
  const sql = getSql();
  const rows = (await sql`
    select id, user_id, title, server, world, x, y, z, type, description, created_at, updated_at
    from player_locations
    where user_id = ${userId}
    order by updated_at desc, created_at desc
  `) as DbLocationRow[];
  return rows.map(rowToLocation);
}

export async function upsertUserLocation(userId: string, input: LocationInput) {
  assertLocationsDatabaseConfigured();
  await ensureLocationsTable();
  const location = normalizeLocationForUser(userId, input);
  const sql = getSql();
  const rows = (await sql`
    insert into player_locations (
      id, user_id, title, server, world, x, y, z, type, description, created_at, updated_at
    )
    values (
      ${location.id}, ${userId}, ${location.title}, ${location.server}, ${location.world},
      ${location.x}, ${location.y}, ${location.z}, ${location.type}, ${location.description},
      ${location.createdAt}, now()
    )
    on conflict (id) do update set
      title = excluded.title,
      server = excluded.server,
      world = excluded.world,
      x = excluded.x,
      y = excluded.y,
      z = excluded.z,
      type = excluded.type,
      description = excluded.description,
      updated_at = now()
    where player_locations.user_id = ${userId}
    returning id, user_id, title, server, world, x, y, z, type, description, created_at, updated_at
  `) as DbLocationRow[];

  if (!rows[0]) {
    throw new Error("Место не найдено или принадлежит другому пользователю.");
  }
  return rowToLocation(rows[0]);
}

export async function deleteUserLocation(userId: string, id: string) {
  assertLocationsDatabaseConfigured();
  await ensureLocationsTable();
  const sql = getSql();
  await sql`
    delete from player_locations
    where user_id = ${userId} and id = ${id}
  `;
}

export async function importUserLocations(userId: string, input: unknown) {
  assertLocationsDatabaseConfigured();
  await ensureLocationsTable();
  const locations = normalizeLocationsForImport(userId, input);
  const saved: AccountLocation[] = [];

  for (const location of locations) {
    saved.push(await upsertUserLocation(userId, location));
  }

  return saved;
}
```

- [ ] **Step 4: Run server-helper tests and verify GREEN**

Run:

```bash
rm -rf .test-build
npx tsc --outDir .test-build --noEmit false --module NodeNext --moduleResolution NodeNext --target ES2022 --rootDir app app/components/locations/data.ts app/server/locations.ts
node --test tests/locations-server.test.mjs
```

Expected: PASS for all tests in `tests/locations-server.test.mjs`.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/server/locations.ts tests/locations-server.test.mjs
git commit -m "feat: add account locations storage"
```

---

### Task 3: API Routes

**Files:**
- Create: `app/api/locations/route.ts`
- Create: `app/api/locations/import/route.ts`
- Create: `app/api/servers/public/route.ts`

- [ ] **Step 1: Add authenticated locations CRUD API**

Create `app/api/locations/route.ts`:

```ts
import { getAuthUser } from "../../server/auth";
import {
  deleteUserLocation,
  listUserLocations,
  upsertUserLocation,
} from "../../server/locations";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

async function requireUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    const locations = await listUserLocations(user.id);
    return Response.json({ ok: true, locations });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы синхронизировать места.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось загрузить места.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const location = await upsertUserLocation(user.id, body);
    return Response.json({ ok: true, location });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы сохранить место.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось сохранить место.");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) {
      return jsonError("Не указан ID места.");
    }
    await deleteUserLocation(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы удалить место.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось удалить место.");
  }
}
```

- [ ] **Step 2: Add authenticated import API**

Create `app/api/locations/import/route.ts`:

```ts
import { getAuthUser } from "../../../server/auth";
import { importUserLocations } from "../../../server/locations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Войдите в аккаунт, чтобы импортировать места." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const locations = await importUserLocations(user.id, body.locations);
    return Response.json({ ok: true, locations });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Не удалось импортировать места.",
      },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 3: Add public published-server API**

Create `app/api/servers/public/route.ts`:

```ts
import { listPublishedExarotonServers } from "../../../server/exaroton-publications";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listPublishedExarotonServers();
  return Response.json({
    ok: result.ok,
    configured: result.configured,
    error: result.error,
    servers: result.servers.map((server) => ({
      id: server.id,
      name: server.name,
      address: server.address,
    })),
  });
}
```

- [ ] **Step 4: Type-check API routes**

Run:

```bash
npm run build
```

Expected: build reaches compilation successfully. If it fails because `/locations` does not exist yet, run `npx tsc --noEmit` and continue; the full build gate runs again after the UI task.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/api/locations/route.ts app/api/locations/import/route.ts app/api/servers/public/route.ts
git commit -m "feat: add locations api routes"
```

---

### Task 4: Locations Page And Client Editor

**Files:**
- Create: `app/locations/page.tsx`
- Create: `app/components/locations/LocationsEditor.tsx`

- [ ] **Step 1: Create page shell**

Create `app/locations/page.tsx`:

```tsx
import { LocationsEditor } from "../components/locations/LocationsEditor";

export const dynamic = "force-dynamic";

export default function LocationsPage() {
  return (
    <>
      <header>
        <h1>МЕСТА</h1>
        <p>Личные координаты Minecraft: базы, порталы, сундуки, фермы и важные точки</p>
      </header>

      <main>
        <section className="container landing-container">
          <LocationsEditor />
        </section>
      </main>

      <footer>v1.0 · Minecraft Java Edition 1.21.5+</footer>
    </>
  );
}
```

- [ ] **Step 2: Create client editor component**

Create `app/components/locations/LocationsEditor.tsx` and start it with these imports, types, and helpers:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOCATIONS_STORAGE_KEY,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  LOCATION_WORLD_LABELS,
  LOCATION_WORLDS,
  createLocationId,
  formatLocationCoordinates,
  normalizeLocationInput,
  normalizeLocationList,
  type LocationInput,
  type LocationType,
  type LocationWorld,
  type PlayerLocation,
} from "./data";

type AuthStatus = {
  configured: boolean;
  authenticated: boolean;
  user: { name: string } | null;
};

type PublicServer = {
  id: string;
  name: string;
  address: string | null;
};

type FormState = {
  id: string;
  title: string;
  serverMode: "known" | "custom";
  server: string;
  customServer: string;
  world: LocationWorld | "";
  x: string;
  y: string;
  z: string;
  type: LocationType | "";
  description: string;
};

const emptyForm: FormState = {
  id: "",
  title: "",
  serverMode: "known",
  server: "",
  customServer: "",
  world: "Overworld",
  x: "",
  y: "",
  z: "",
  type: "Other",
  description: "",
};

function readLocalLocations() {
  try {
    return normalizeLocationList(JSON.parse(localStorage.getItem(LOCATIONS_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeLocalLocations(locations: PlayerLocation[]) {
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
}

function formFromLocation(location: PlayerLocation, servers: PublicServer[]): FormState {
  const known = servers.some((server) => server.name === location.server);
  return {
    id: location.id,
    title: location.title,
    serverMode: known ? "known" : "custom",
    server: known ? location.server : "",
    customServer: known ? "" : location.server,
    world: location.world,
    x: String(location.x),
    y: String(location.y),
    z: String(location.z),
    type: location.type,
    description: location.description,
  };
}

function inputFromForm(form: FormState): LocationInput {
  return {
    id: form.id || createLocationId(),
    title: form.title,
    server: form.serverMode === "custom" ? form.customServer : form.server,
    world: form.world,
    x: form.x,
    y: form.y,
    z: form.z,
    type: form.type,
    description: form.description,
  };
}
```

Continue `LocationsEditor.tsx` by adding this component body. Keep helper functions small; do not move persistence into this file beyond fetch/localStorage calls:

```tsx
export function LocationsEditor() {
  const [auth, setAuth] = useState<AuthStatus | null | undefined>(undefined);
  const [servers, setServers] = useState<PublicServer[]>([]);
  const [locations, setLocations] = useState<PlayerLocation[]>([]);
  const [localLocations, setLocalLocations] = useState<PlayerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importDismissed, setImportDismissed] = useState(false);
  const [filters, setFilters] = useState({
    server: "",
    world: "",
    type: "",
    search: "",
  });

  const accountMode = Boolean(auth?.authenticated);

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      setLoading(true);
      const browserLocations = readLocalLocations();
      if (!active) return;
      setLocalLocations(browserLocations);

      const [authResponse, serversResponse] = await Promise.all([
        fetch("/api/auth/status", { cache: "no-store", credentials: "same-origin" })
          .then((response) => response.ok ? response.json() : null)
          .catch(() => null),
        fetch("/api/servers/public", { cache: "no-store" })
          .then((response) => response.ok ? response.json() : null)
          .catch(() => null),
      ]);

      if (!active) return;

      setAuth(authResponse);
      setServers(Array.isArray(serversResponse?.servers) ? serversResponse.servers : []);

      if (authResponse?.authenticated) {
        const accountResponse = await fetch("/api/locations", {
          cache: "no-store",
          credentials: "same-origin",
        }).then((response) => response.json().then((data) => ({ response, data }))).catch(() => null);

        if (!active) return;
        if (accountResponse?.response.ok && Array.isArray(accountResponse.data.locations)) {
          setLocations(accountResponse.data.locations);
        } else {
          setLocations(browserLocations);
          setError(accountResponse?.data?.error || "Аккаунтное хранилище недоступно. Пока используем места из этого браузера.");
        }
      } else {
        setLocations(browserLocations);
      }

      setLoading(false);
    }

    loadInitialState();
    return () => {
      active = false;
    };
  }, []);

  const visibleLocations = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return locations.filter((location) => {
      if (filters.server && location.server !== filters.server) return false;
      if (filters.world && location.world !== filters.world) return false;
      if (filters.type && location.type !== filters.type) return false;
      if (!search) return true;
      return `${location.title} ${location.description}`.toLowerCase().includes(search);
    });
  }, [filters, locations]);

  const serverOptions = useMemo(
    () => Array.from(new Set([...servers.map((server) => server.name), ...locations.map((location) => location.server)])).filter(Boolean),
    [locations, servers],
  );

  function updateLocal(nextLocations: PlayerLocation[]) {
    setLocations(nextLocations);
    setLocalLocations(nextLocations);
    writeLocalLocations(nextLocations);
  }

  function startCreate() {
    setError("");
    setNotice("");
    setForm({
      ...emptyForm,
      serverMode: servers.length ? "known" : "custom",
    });
    setEditing(true);
  }

  function startEdit(location: PlayerLocation) {
    setError("");
    setNotice("");
    setForm(formFromLocation(location, servers));
    setEditing(true);
  }

  async function saveLocation() {
    try {
      const normalized = normalizeLocationInput(inputFromForm(form), {
        id: form.id || createLocationId(),
      });

      if (accountMode && !error) {
        const response = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(normalized),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Не удалось сохранить место.");
        }
        setLocations((current) => [data.location, ...current.filter((item) => item.id !== data.location.id)]);
      } else {
        const next = [normalized, ...locations.filter((item) => item.id !== normalized.id)];
        updateLocal(next);
      }

      setEditing(false);
      setForm(emptyForm);
      setNotice("Место сохранено.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить место.");
    }
  }

  async function deleteLocation(location: PlayerLocation) {
    setError("");
    setNotice("");
    if (accountMode && !error) {
      const response = await fetch(`/api/locations?id=${encodeURIComponent(location.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.error || "Не удалось удалить место.");
        return;
      }
      setLocations((current) => current.filter((item) => item.id !== location.id));
    } else {
      updateLocal(locations.filter((item) => item.id !== location.id));
    }
  }

  async function copyCoordinates(location: PlayerLocation) {
    await navigator.clipboard.writeText(formatLocationCoordinates(location));
    setNotice("Координаты скопированы.");
  }

  async function importLocalLocations() {
    const response = await fetch("/api/locations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ locations: localLocations }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setError(data.error || "Не удалось импортировать места.");
      return;
    }
    localStorage.removeItem(LOCATIONS_STORAGE_KEY);
    setLocalLocations([]);
    setLocations(data.locations);
    setNotice("Локальные места импортированы в аккаунт.");
  }

  function clearLocalLocations() {
    localStorage.removeItem(LOCATIONS_STORAGE_KEY);
    setLocalLocations([]);
    if (!accountMode) {
      setLocations([]);
    }
    setImportDismissed(true);
  }
```

Use these exact visible Russian strings:

```txt
Добавить место
Вы не вошли в аккаунт. Места сохраняются только в этом браузере.
Найдены места, сохранённые в этом браузере. Импортировать их в аккаунт?
Импортировать
Оставить только в браузере
Удалить локальные места
Название
Сервер
Другой сервер
Мир
Тип
Описание
Сохранить место
Отменить
Скопировать координаты
Редактировать
Удалить
Мест пока нет.
```

- [ ] **Step 3: Add the render markup**

Finish `LocationsEditor()` with semantic markup using existing classes plus new location classes:

```tsx
return (
  <div className="panel locations-panel">
    <div className="locations-toolbar">
      <h2>Места</h2>
      <button type="button" onClick={startCreate}>Добавить место</button>
    </div>

    {loading ? <p className="locations-empty">Загружаем места...</p> : null}
    {!accountMode ? (
      <p className="locations-notice">Вы не вошли в аккаунт. Места сохраняются только в этом браузере.</p>
    ) : null}
    {error ? <p className="locations-error">{error}</p> : null}
    {notice ? <p className="locations-notice">{notice}</p> : null}

    {accountMode && localLocations.length > 0 && !importDismissed ? (
      <div className="locations-notice">
        <p>Найдены места, сохранённые в этом браузере. Импортировать их в аккаунт?</p>
        <div className="locations-import-actions">
          <button type="button" onClick={importLocalLocations}>Импортировать</button>
          <button className="sec" type="button" onClick={() => setImportDismissed(true)}>Оставить только в браузере</button>
          <button className="danger" type="button" onClick={clearLocalLocations}>Удалить локальные места</button>
        </div>
      </div>
    ) : null}

    <div className="locations-filters">
      <label><span className="lab">Поиск</span><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
      <label><span className="lab">Сервер</span><select value={filters.server} onChange={(event) => setFilters({ ...filters, server: event.target.value })}><option value="">Все серверы</option>{serverOptions.map((server) => <option key={server} value={server}>{server}</option>)}</select></label>
      <label><span className="lab">Мир</span><select value={filters.world} onChange={(event) => setFilters({ ...filters, world: event.target.value })}><option value="">Все миры</option>{LOCATION_WORLDS.map((world) => <option key={world} value={world}>{LOCATION_WORLD_LABELS[world]}</option>)}</select></label>
      <label><span className="lab">Тип</span><select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">Все типы</option>{LOCATION_TYPES.map((type) => <option key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</option>)}</select></label>
    </div>

    {editing ? (
      <div className="locations-form">
        <div className="locations-form-grid">
          <label><span className="lab">Название</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          {servers.length ? (
            <label><span className="lab">Сервер</span><select value={form.serverMode === "custom" ? "__custom" : form.server} onChange={(event) => setForm({ ...form, serverMode: event.target.value === "__custom" ? "custom" : "known", server: event.target.value === "__custom" ? "" : event.target.value })}><option value="">- выбери сервер -</option>{servers.map((server) => <option key={server.id} value={server.name}>{server.name}</option>)}<option value="__custom">Другой сервер</option></select></label>
          ) : null}
          {form.serverMode === "custom" || !servers.length ? <label><span className="lab">Сервер</span><input value={form.customServer} onChange={(event) => setForm({ ...form, customServer: event.target.value })} /></label> : null}
          <label><span className="lab">Мир</span><select value={form.world} onChange={(event) => setForm({ ...form, world: event.target.value as LocationWorld })}>{LOCATION_WORLDS.map((world) => <option key={world} value={world}>{LOCATION_WORLD_LABELS[world]}</option>)}</select></label>
          <label><span className="lab">X</span><input value={form.x} onChange={(event) => setForm({ ...form, x: event.target.value })} /></label>
          <label><span className="lab">Y</span><input value={form.y} onChange={(event) => setForm({ ...form, y: event.target.value })} /></label>
          <label><span className="lab">Z</span><input value={form.z} onChange={(event) => setForm({ ...form, z: event.target.value })} /></label>
          <label><span className="lab">Тип</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as LocationType })}>{LOCATION_TYPES.map((type) => <option key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</option>)}</select></label>
        </div>
        <label><span className="lab">Описание</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="btn-row">
          <button type="button" onClick={saveLocation}>Сохранить место</button>
          <button className="sec" type="button" onClick={() => setEditing(false)}>Отменить</button>
        </div>
      </div>
    ) : null}

    {visibleLocations.length ? (
      <div className="locations-list">
        {visibleLocations.map((location) => (
          <article className="locations-card" key={location.id}>
            <div className="locations-card-head"><h3>{location.title}</h3><span>{LOCATION_TYPE_LABELS[location.type]}</span></div>
            <div className="locations-meta"><span>{location.server}</span><span>{LOCATION_WORLD_LABELS[location.world]}</span><span className="locations-coordinates">{formatLocationCoordinates(location)}</span></div>
            {location.description ? <p className="locations-description">{location.description}</p> : null}
            <div className="locations-card-actions">
              <button type="button" onClick={() => copyCoordinates(location)}>Скопировать координаты</button>
              <button className="sec" type="button" onClick={() => startEdit(location)}>Редактировать</button>
              <button className="danger" type="button" onClick={() => deleteLocation(location)}>Удалить</button>
            </div>
          </article>
        ))}
      </div>
    ) : !loading ? <p className="locations-empty">Мест пока нет.</p> : null}
  </div>
);
}
```

- [ ] **Step 4: Build-check the new page**

Run:

```bash
npm run build
```

Expected: build succeeds or reports concrete TypeScript/Next errors in the new locations files. Fix only those errors in this task.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/locations/page.tsx app/components/locations/LocationsEditor.tsx
git commit -m "feat: add locations page"
```

---

### Task 5: Navigation, Landing, And Styles

**Files:**
- Modify: `app/components/SiteNav.tsx`
- Modify: `app/page.tsx`
- Modify: `style.css`

- [ ] **Step 1: Add navigation link**

Modify `app/components/SiteNav.tsx`:

```ts
const links = [
  { href: "/", label: "Командный хаб", exact: true },
  { href: "/summon", label: "/summon" },
  { href: "/give", label: "/give" },
  { href: "/locations", label: "Места" },
  { href: "/servers", label: "Серверная" },
];
```

- [ ] **Step 2: Add landing card**

Modify the `landing-grid` in `app/page.tsx` to include:

```tsx
<a href="/locations" className="cmd-card locations">
  <div className="cmd-title">МЕСТА</div>
  <div className="cmd-desc">Сохранить личные координаты: базы, порталы, сундуки, фермы, структуры и опасные точки</div>
  <span className="cmd-arrow">▶</span>
</a>
```

- [ ] **Step 3: Add top release entry**

Add this release object at the top of the `releases` array in `app/page.tsx`:

```tsx
{
  date: "1 июня 2026",
  items: [
    <>Появился раздел <strong>«Места»</strong>: можно сохранять личные координаты Minecraft, фильтровать их, копировать X Y Z и переносить локальные точки в аккаунт после входа.</>,
  ],
},
```

- [ ] **Step 4: Add styles**

Append focused styles to `style.css`:

```css
.cmd-card.locations .cmd-title,
.cmd-card.locations .cmd-arrow {
  color: var(--accent-3);
}

.cmd-card.locations:hover {
  border-color: var(--accent-3);
}

.locations-panel {
  display: grid;
  gap: 14px;
}

.locations-toolbar,
.locations-card-head,
.locations-import-actions,
.locations-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.locations-toolbar h2 {
  margin: 0;
}

.locations-notice,
.locations-error,
.locations-empty {
  border: 2px solid var(--border);
  background: var(--panel-2);
  border-radius: 4px;
  padding: 10px;
  color: var(--text);
}

.locations-error {
  border-color: #ff6b6b;
  color: #ffb4b4;
}

.locations-filters,
.locations-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.locations-form {
  border: 2px solid var(--border);
  background: var(--panel-2);
  border-radius: 4px;
  padding: 12px;
}

.locations-form textarea {
  min-height: 84px;
}

.locations-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.locations-card {
  border: 2px solid var(--border);
  background: var(--panel-2);
  border-radius: 4px;
  padding: 12px;
}

.locations-card h3 {
  margin: 0;
  color: var(--accent);
  font-family: 'Press Start 2P', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.locations-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 8px 0;
  color: var(--muted);
  font-size: 12px;
}

.locations-coordinates {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-2);
}

.locations-description {
  margin: 8px 0 0;
  white-space: pre-wrap;
}
```

- [ ] **Step 5: Build-check navigation and styles**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

Run:

```bash
git add app/components/SiteNav.tsx app/page.tsx style.css
git commit -m "feat: surface locations in public ui"
```

---

### Task 6: Documentation

**Files:**
- Modify: `docs/user-functionality.md`
- Modify: `docs/developer-documentation.md`

- [ ] **Step 1: Update user documentation**

In `docs/user-functionality.md`:

- Add "Места" to the top navigation description.
- Add `/locations` to the landing page card list.
- Add a new `## Места /locations` section with:

```md
## Места `/locations`

- Позволяет сохранять личные игровые точки с координатами Minecraft.
- Для каждого места указываются название, сервер, мир, координаты X/Y/Z, тип и описание.
- Поддерживаются типы: сундук, портал, база, структура, ферма, опасное место и другое.
- Поддерживаются миры: Обычный мир, Незер, Энд и Другой.
- Список можно фильтровать по серверу, миру и типу, а также искать по названию и описанию.
- Кнопка «Скопировать координаты» копирует координаты в формате `X Y Z`, например `123 64 -456`.
- Без входа места сохраняются только в браузере через `localStorage`; интерфейс показывает предупреждение об этом.
- После входа места сохраняются в аккаунте. Если в браузере остались локальные места, сайт предлагает импортировать их в аккаунт, оставить локально или удалить.
- В первой версии нет публичных мест, шаринга, карты, скриншотов, истории изменений и пересчёта координат между мирами.
```

- [ ] **Step 2: Update developer documentation**

In `docs/developer-documentation.md`:

- Add `/locations` to "Основные маршруты приложения".
- Add `mc-locations:places` to "Клиентские хранилища".
- Add a new `## Места /locations` section with table/API/storage details:

```md
## Места `/locations`

- Публичная страница находится в `app/locations/page.tsx`.
- Клиентский редактор находится в `app/components/locations/LocationsEditor.tsx`.
- Общие типы, русские подписи, нормализация и валидация находятся в `app/components/locations/data.ts`.
- Анонимные места хранятся в `localStorage` с ключом `mc-locations:places`.
- Авторизованные места хранятся в Neon в таблице `player_locations` и всегда фильтруются по текущему Clerk user ID.
- Серверный модуль `app/server/locations.ts` создаёт таблицу при первом обращении.
- Клиент не передаёт и не выбирает `userId`; API берёт пользователя через `getAuthUser()`.
- Импорт локальных мест создаёт новые ID записей аккаунта, чтобы локальные ID не конфликтовали с серверными.
- Для выбора сервера редактор читает опубликованные серверы через `GET /api/servers/public`; если список недоступен или пользователь выбирает «Другой сервер», используется ручной ввод.
```

- Add API bullets:

```md
- `GET /api/locations` — список мест текущего пользователя.
- `POST /api/locations` — создание или обновление места текущего пользователя.
- `DELETE /api/locations?id=...` — удаление места текущего пользователя.
- `POST /api/locations/import` — импорт локальных мест в аккаунт.
- `GET /api/servers/public` — публичный список опубликованных серверов для выбора в пользовательских формах.
```

- [ ] **Step 3: Commit docs**

Run:

```bash
git add docs/user-functionality.md docs/developer-documentation.md
git commit -m "docs: document locations feature"
```

---

### Task 7: Verification, Browser Check, Preview Deploy, And Handoff

**Files:**
- No planned source edits unless verification exposes a defect.

- [ ] **Step 1: Run focused location tests**

Run:

```bash
rm -rf .test-build
npx tsc --outDir .test-build --noEmit false --module NodeNext --moduleResolution NodeNext --target ES2022 --rootDir app app/components/locations/data.ts app/server/locations.ts
node --test tests/locations-data.test.mjs tests/locations-server.test.mjs
```

Expected: all location tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build exits with code 0.

- [ ] **Step 3: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Browser-verify `/locations` locally**

Use the Browser plugin or agent-browser to open:

```txt
http://localhost:3000/locations
```

Verify:

- Page title "МЕСТА" is visible.
- "Добавить место" opens the form.
- Anonymous warning is visible when not signed in.
- A place can be created with `Сундук у лавового озера`, `Survival`, `Незер`, `123 64 -456`, `Сундук`.
- The card appears in the list.
- "Скопировать координаты" copies `123 64 -456`.
- Search and filters narrow the list.
- Edit changes the title.
- Delete removes the card.

- [ ] **Step 5: Create Vercel preview deployment**

Run:

```bash
npx vercel deploy --yes
```

Expected: command prints a preview URL.

- [ ] **Step 6: Browser-verify preview URL**

Open the preview URL from Step 5 and repeat the basic `/locations` checks:

- Page loads.
- Navigation link "Места" works.
- Anonymous local create/copy/delete works.
- If preview has Clerk/Neon env vars, authenticated account storage and import prompt work.

- [ ] **Step 7: Final git status**

Run:

```bash
git status --short
```

Expected: no uncommitted source changes unless verification fixes were intentionally made and committed.

- [ ] **Step 8: Final user note**

Report:

- commits created;
- focused tests result;
- `npm run build` result;
- local browser verification result;
- Vercel preview URL and preview verification result;
- ask whether to publish a Telegram user announcement through `mc-tg-group-notifier`;
- offer merge into `main` and push to `origin`, but do not merge or push without explicit confirmation.
