import { getDatabaseUrlStatus, getSql } from "./db";
import { listExarotonServers, type ExarotonServer } from "./exaroton";

export type ExarotonServerPublication = {
  serverId: string;
  published: boolean;
  updatedAt: string | null;
};

export type ExarotonPublicationSettingsResult =
  | {
      configured: true;
      ok: true;
      publications: ExarotonServerPublication[];
      error?: never;
    }
  | {
      configured: true;
      ok: false;
      publications: [];
      error: string;
    }
  | {
      configured: false;
      ok: false;
      publications: [];
      error: string;
    };

export type PublishedExarotonServersResult = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  servers: ExarotonServer[];
  fetchedAt: string | null;
};

type DbPublicationRow = {
  server_id: string;
  published: boolean;
  updated_at: string | null;
};

let tableReady = false;

async function ensurePublicationsTable() {
  if (tableReady) {
    return;
  }

  const sql = getSql();
  await sql`
    create table if not exists exaroton_server_publications (
      server_id text primary key,
      published boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

function rowToPublication(row: DbPublicationRow): ExarotonServerPublication {
  return {
    serverId: row.server_id,
    published: row.published,
    updatedAt: row.updated_at,
  };
}

function validateServerId(serverId: unknown) {
  const value = String(serverId || "").trim();
  if (!value || value.length > 160) {
    throw new Error("Некорректный ID сервера.");
  }
  return value;
}

export async function listExarotonServerPublications(): Promise<ExarotonPublicationSettingsResult> {
  if (!getDatabaseUrlStatus().configured) {
    return {
      configured: false,
      ok: false,
      publications: [],
      error: "DATABASE_URL не настроен",
    };
  }

  try {
    await ensurePublicationsTable();
    const sql = getSql();
    const rows = (await sql`
      select server_id, published, updated_at
      from exaroton_server_publications
      order by server_id asc
    `) as DbPublicationRow[];

    return {
      configured: true,
      ok: true,
      publications: rows.map(rowToPublication),
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      publications: [],
      error: error instanceof Error ? error.message : "Не удалось получить настройки публикации",
    };
  }
}

export async function setExarotonServerPublished(serverId: unknown, published: unknown) {
  if (!getDatabaseUrlStatus().configured) {
    throw new Error("DATABASE_URL не настроен.");
  }

  const normalizedServerId = validateServerId(serverId);
  await ensurePublicationsTable();

  const sql = getSql();
  const rows = (await sql`
    insert into exaroton_server_publications (server_id, published, updated_at)
    values (${normalizedServerId}, ${published === true}, now())
    on conflict (server_id) do update set
      published = excluded.published,
      updated_at = now()
    returning server_id, published, updated_at
  `) as DbPublicationRow[];

  return rowToPublication(rows[0]);
}

export async function listPublishedExarotonServers(): Promise<PublishedExarotonServersResult> {
  const publications = await listExarotonServerPublications();
  if (!publications.ok) {
    return {
      configured: publications.configured,
      ok: false,
      error: publications.error,
      servers: [],
      fetchedAt: null,
    };
  }

  const publishedIds = new Set(
    publications.publications
      .filter((publication) => publication.published)
      .map((publication) => publication.serverId),
  );

  if (publishedIds.size === 0) {
    return {
      configured: true,
      ok: true,
      error: null,
      servers: [],
      fetchedAt: null,
    };
  }

  const exaroton = await listExarotonServers();
  if (!exaroton.ok) {
    return {
      configured: exaroton.configured,
      ok: false,
      error: exaroton.error,
      servers: [],
      fetchedAt: exaroton.fetchedAt,
    };
  }

  return {
    configured: true,
    ok: true,
    error: null,
    servers: exaroton.servers.filter((server) => publishedIds.has(server.id)),
    fetchedAt: exaroton.fetchedAt,
  };
}
