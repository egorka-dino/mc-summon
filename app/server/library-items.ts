import { defaultGiveSnapshot, type GiveFieldValue, type GiveSnapshot } from "../components/give/engine";
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
  if (tableReady) {
    return;
  }

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
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : fallback;
}

function normalizeFields(input: unknown, fallback: Record<string, GiveFieldValue>) {
  if (!isRecord(input)) {
    return fallback;
  }

  const fields: Record<string, GiveFieldValue> = { ...fallback };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      fields[key] = value;
    }
  }
  return fields;
}

function normalizeStringArray(input: unknown) {
  return Array.isArray(input) ? input.filter((value): value is string => typeof value === "string") : [];
}

function normalizeExplosions(input: unknown, fallback: GiveSnapshot["explosions"]) {
  if (!Array.isArray(input)) {
    return fallback;
  }

  return input.filter(isRecord).map((explosion, index) => ({
    id: Number.isFinite(Number(explosion.id)) ? Number(explosion.id) : index,
    shape: stringValue(explosion.shape, "small_ball"),
    colors: normalizeStringArray(explosion.colors),
    fadeColors: normalizeStringArray(explosion.fadeColors),
    trail: explosion.trail === true,
    twinkle: explosion.twinkle === true,
  }));
}

function normalizeShieldLayers(input: unknown, fallback: GiveSnapshot["shieldLayers"]) {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const layers = input.filter(isRecord).map((layer, index) => ({
    id: Number.isFinite(Number(layer.id)) ? Number(layer.id) : index,
    pattern: stringValue(layer.pattern, "stripe_center"),
    color: stringValue(layer.color, "black"),
  }));

  return layers.length ? layers : fallback;
}

function normalizeSnapshot(input: unknown): GiveSnapshot {
  const fallback = defaultGiveSnapshot();
  if (!isRecord(input)) {
    return fallback;
  }

  return {
    itemId: stringValue(input.itemId, fallback.itemId),
    target: stringValue(input.target, fallback.target),
    targetCustom: stringValue(input.targetCustom, fallback.targetCustom),
    count: stringValue(input.count, fallback.count),
    fields: normalizeFields(input.fields, fallback.fields),
    explosions: normalizeExplosions(input.explosions, fallback.explosions),
    shieldLayers: normalizeShieldLayers(input.shieldLayers, fallback.shieldLayers),
    potionType: stringValue(input.potionType, fallback.potionType),
    potionModifier: stringValue(input.potionModifier, fallback.potionModifier),
  };
}

function rowToLibraryItem(row: DbLibraryItemRow): LibraryItem {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    version: row.version,
    snapshot: normalizeSnapshot(parseJsonColumn(row.snapshot)),
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLibraryItems() {
  await ensureLibraryItemsTable();
  const sql = getSql();
  const rows = (await sql`
    select id, category, name, description, version, snapshot, enabled, created_at, updated_at
    from library_items
    order by category asc, name asc
  `) as DbLibraryItemRow[];

  return rows.map(rowToLibraryItem);
}

export function validateLibraryItem(input: LibraryItemInput): LibraryItem {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const category = String(input.category || "Предметы").trim();
  const name = String(input.name || "").trim();
  const description = String(input.description || "").trim();
  const version = Number(input.version || 1);

  if (id && !/^[a-z0-9][a-z0-9-]{1,119}$/.test(id)) {
    throw new Error("ID должен содержать 2-120 символов: латиница, цифры и дефисы.");
  }
  if (!category) {
    throw new Error("Категория обязательна.");
  }
  if (!name) {
    throw new Error("Название обязательно.");
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Версия должна быть положительным целым числом.");
  }

  return {
    id: id || createLibraryId("item", name),
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
  const rows = (await sql`
    insert into library_items (
      id, category, name, description, version, snapshot, enabled, updated_at
    )
    values (
      ${item.id},
      ${item.category},
      ${item.name},
      ${item.description},
      ${item.version},
      ${JSON.stringify(item.snapshot)}::jsonb,
      ${item.enabled},
      now()
    )
    on conflict (id) do update set
      category = excluded.category,
      name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      snapshot = excluded.snapshot,
      enabled = excluded.enabled,
      updated_at = now()
    returning id, category, name, description, version, snapshot, enabled, created_at, updated_at
  `) as DbLibraryItemRow[];

  return rowToLibraryItem(rows[0]);
}

export async function deleteLibraryItem(id: string) {
  await ensureLibraryItemsTable();
  const sql = getSql();
  await sql`
    delete from library_items
    where id = ${id}
  `;
}
