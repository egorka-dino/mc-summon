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
