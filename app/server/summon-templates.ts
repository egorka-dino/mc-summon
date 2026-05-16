import { getSql } from "./db";

export type SummonTemplate = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  mobOrder: Array<{ mobType: string }>;
  fields: Record<string, string | number | boolean | null>;
  enabled: boolean;
  source: "database";
  hasDatabaseRecord: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TemplateInput = Omit<
  SummonTemplate,
  "source" | "hasDatabaseRecord" | "createdAt" | "updatedAt"
>;

type DbTemplateRow = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  mob_order: Array<{ mobType: string }> | string;
  fields: Record<string, string | number | boolean | null> | string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureTemplatesTable() {
  if (tableReady) {
    return;
  }

  const sql = getSql();
  await sql`
    create table if not exists summon_mob_templates (
      id text primary key,
      category text not null,
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

function rowToTemplate(row: DbTemplateRow): SummonTemplate {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    version: row.version,
    mobOrder: parseJsonColumn(row.mob_order),
    fields: parseJsonColumn(row.fields),
    enabled: row.enabled,
    source: "database",
    hasDatabaseRecord: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDatabaseTemplates() {
  await ensureTemplatesTable();
  const sql = getSql();
  const rows = (await sql`
    select id, category, name, description, version, mob_order, fields, enabled, created_at, updated_at
    from summon_mob_templates
    order by category asc, name asc
  `) as DbTemplateRow[];

  return rows.map(rowToTemplate);
}

export async function listSummonTemplates({ admin = false } = {}) {
  const databaseTemplates = await getDatabaseTemplates();
  return databaseTemplates.filter((template) => admin || template.enabled);
}

export function validateSummonTemplate(input: Partial<TemplateInput>): TemplateInput {
  const id = String(input.id || "").trim();
  const category = String(input.category || "").trim();
  const name = String(input.name || "").trim();
  const description = String(input.description || "").trim();
  const version = Number(input.version || 1);

  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id)) {
    throw new Error("ID должен содержать 2-80 символов: латиница, цифры и дефисы.");
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
  if (!Array.isArray(input.mobOrder) || input.mobOrder.length === 0) {
    throw new Error("mobOrder должен быть непустым массивом.");
  }

  const mobOrder = input.mobOrder.map((mob) => {
    const mobType = String(mob?.mobType || "").trim();
    if (!mobType) {
      throw new Error("Каждый элемент mobOrder должен содержать mobType.");
    }
    return { mobType };
  });

  const fields = input.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("fields должен быть JSON-объектом.");
  }

  return {
    id,
    category,
    name,
    description,
    version,
    mobOrder,
    fields,
    enabled: input.enabled !== false,
  };
}

export async function upsertSummonTemplate(input: Partial<TemplateInput>) {
  const template = validateSummonTemplate(input);
  await ensureTemplatesTable();

  const sql = getSql();
  const rows = (await sql`
    insert into summon_mob_templates (
      id, category, name, description, version, mob_order, fields, enabled, updated_at
    )
    values (
      ${template.id},
      ${template.category},
      ${template.name},
      ${template.description},
      ${template.version},
      ${JSON.stringify(template.mobOrder)}::jsonb,
      ${JSON.stringify(template.fields)}::jsonb,
      ${template.enabled},
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
  `) as DbTemplateRow[];

  return rowToTemplate(rows[0]);
}

export async function deleteSummonTemplate(id: string) {
  await ensureTemplatesTable();
  const sql = getSql();
  await sql`
    delete from summon_mob_templates
    where id = ${id}
  `;
}
