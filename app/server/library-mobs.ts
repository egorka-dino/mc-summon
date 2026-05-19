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
  mobOrder: SummonSnapshot["mobOrder"];
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
  mob_order: SummonSnapshot["mobOrder"] | string;
  fields: SummonSnapshot["fields"] | string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureLibraryMobsTable() {
  if (tableReady) {
    return;
  }

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
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLibraryMobSnapshot(input: {
  mobOrder?: unknown;
  fields?: unknown;
}): SummonSnapshot {
  const fallback = toSnapshot(["zombie"]);
  const mobOrder = Array.isArray(input.mobOrder) && input.mobOrder.length ? input.mobOrder : fallback.mobOrder;
  const fields = isRecord(input.fields) ? input.fields : fallback.fields;

  return normalizeSnapshot({
    mobOrder: mobOrder as SummonSnapshot["mobOrder"],
    fields: fields as SummonSnapshot["fields"],
  });
}

function rowToLibraryMob(row: DbLibraryMobRow): LibraryMob {
  const snapshot = normalizeLibraryMobSnapshot({
    mobOrder: parseJsonColumn(row.mob_order),
    fields: parseJsonColumn(row.fields),
  });

  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    version: row.version,
    mobOrder: snapshot.mobOrder,
    fields: snapshot.fields,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLibraryMobs({ admin = false } = {}) {
  await ensureLibraryMobsTable();
  const sql = getSql();
  const rows = (await sql`
    select id, category, name, description, version, mob_order, fields, enabled, created_at, updated_at
    from library_mobs
    order by category asc, name asc
  `) as DbLibraryMobRow[];

  return rows.map(rowToLibraryMob).filter((mob) => admin || mob.enabled);
}

export function validateLibraryMob(input: LibraryMobInput): LibraryMob {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const category = String(input.category || "Мобы").trim();
  const name = String(input.name || "").trim();
  const description = String(input.description || "").trim();
  const version = Number(input.version || 1);
  const snapshot = normalizeLibraryMobSnapshot(input);

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
    id: id || createLibraryId("mob", name),
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
  const rows = (await sql`
    insert into library_mobs (
      id, category, name, description, version, mob_order, fields, enabled, updated_at
    )
    values (
      ${mob.id},
      ${mob.category},
      ${mob.name},
      ${mob.description},
      ${mob.version},
      ${JSON.stringify(mob.mobOrder)}::jsonb,
      ${JSON.stringify(mob.fields)}::jsonb,
      ${mob.enabled},
      now()
    )
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
  `) as DbLibraryMobRow[];

  return rowToLibraryMob(rows[0]);
}

export async function deleteLibraryMob(id: string) {
  await ensureLibraryMobsTable();
  const sql = getSql();
  await sql`
    delete from library_mobs
    where id = ${id}
  `;
}
