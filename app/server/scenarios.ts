import { getSql } from "./db";
import { createLibraryId } from "./library-id";
export { assertScenarioHasNoCycles, canReferenceScenario, getScenarioCyclePath } from "../shared/scenario-cycles";
import { assertScenarioHasNoCycles } from "../shared/scenario-cycles";

export type ScenarioSpawn =
  | { type: "near-player" }
  | { type: "player" }
  | { type: "coordinates"; coordinates: { x: string; y: string; z: string } };

export type GiveItemScenarioAction = {
  id: string;
  type: "give_item";
  itemId: string;
  quantity: number;
};

export type SummonMobScenarioAction = {
  id: string;
  type: "summon_mob";
  mobId: string;
  quantity: number;
  spawn: ScenarioSpawn;
};

export type RunScenarioAction = {
  id: string;
  type: "run_scenario";
  scenarioId: string;
};

export type FutureScenarioAction = {
  id: string;
  type: "future";
  kind: string;
  payload: Record<string, unknown>;
};

export type ScenarioAction =
  | GiveItemScenarioAction
  | SummonMobScenarioAction
  | RunScenarioAction
  | FutureScenarioAction;

export type Scenario = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  actions: ScenarioAction[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ScenarioInput = Partial<Scenario>;

type DbScenarioRow = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  actions: ScenarioAction[] | string;
  created_at: string | null;
  updated_at: string | null;
};

let tableReady = false;

async function ensureScenariosTable() {
  if (tableReady) return;

  const sql = getSql();
  await sql`
    create table if not exists scenarios (
      id text primary key,
      name text not null,
      description text not null default '',
      enabled boolean not null default true,
      actions jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  tableReady = true;
}

function parseJsonColumn<T>(value: T | string): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function rowToScenario(row: DbScenarioRow): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    actions: normalizeScenarioActions(parseJsonColumn(row.actions)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : fallback;
}

function normalizeQuantity(value: unknown) {
  const parsed = Number(String(value ?? "1").trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(64, Math.max(1, Math.trunc(parsed)));
}

function createActionId(index: number) {
  return `action-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSpawn(input: unknown): ScenarioSpawn {
  if (!isRecord(input)) return { type: "near-player" };
  if (input.type === "coordinates") {
    const coordinates = isRecord(input.coordinates) ? input.coordinates : {};
    return {
      type: "coordinates",
      coordinates: {
        x: stringValue(coordinates.x, "0"),
        y: stringValue(coordinates.y, "64"),
        z: stringValue(coordinates.z, "0"),
      },
    };
  }
  if (input.type === "player") return { type: "player" };
  return { type: "near-player" };
}

export function normalizeScenarioActions(input: unknown): ScenarioAction[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(isRecord)
    .map((action, index): ScenarioAction | null => {
      const id = stringValue(action.id, createActionId(index));
      if (action.type === "give_item") {
        return {
          id,
          type: "give_item",
          itemId: stringValue(action.itemId),
          quantity: normalizeQuantity(action.quantity),
        };
      }
      if (action.type === "summon_mob") {
        return {
          id,
          type: "summon_mob",
          mobId: stringValue(action.mobId),
          quantity: normalizeQuantity(action.quantity),
          spawn: normalizeSpawn(action.spawn),
        };
      }
      if (action.type === "run_scenario") {
        return {
          id,
          type: "run_scenario",
          scenarioId: stringValue(action.scenarioId),
        };
      }
      if (action.type === "future") {
        return {
          id,
          type: "future",
          kind: stringValue(action.kind, "future"),
          payload: isRecord(action.payload) ? action.payload : {},
        };
      }
      return null;
    })
    .filter((action): action is ScenarioAction => Boolean(action));
}

export function validateScenario(input: ScenarioInput): Scenario {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const name = String(input.name || "").trim();
  const description = String(input.description || "").trim();
  const actions = normalizeScenarioActions(input.actions);

  if (id && !/^[a-z0-9][a-z0-9-]{1,119}$/.test(id)) {
    throw new Error("ID должен содержать 2-120 символов: латиница, цифры и дефисы.");
  }
  if (!name) {
    throw new Error("Название обязательно.");
  }

  return {
    id: id || createLibraryId("scenario", name),
    name,
    description,
    enabled: input.enabled !== false,
    actions,
  };
}

export async function listScenarios() {
  await ensureScenariosTable();
  const sql = getSql();
  const rows = (await sql`
    select id, name, description, enabled, actions, created_at, updated_at
    from scenarios
    order by name asc
  `) as DbScenarioRow[];

  return rows.map(rowToScenario);
}

export async function upsertScenario(input: ScenarioInput) {
  const scenario = validateScenario(input);
  await ensureScenariosTable();

  const sql = getSql();
  const existingRows = (await sql`
    select id, name, description, enabled, actions, created_at, updated_at
    from scenarios
  `) as DbScenarioRow[];
  assertScenarioHasNoCycles(scenario, existingRows.map(rowToScenario));

  const rows = (await sql`
    insert into scenarios (id, name, description, enabled, actions, updated_at)
    values (
      ${scenario.id},
      ${scenario.name},
      ${scenario.description},
      ${scenario.enabled},
      ${JSON.stringify(scenario.actions)}::jsonb,
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      enabled = excluded.enabled,
      actions = excluded.actions,
      updated_at = now()
    returning id, name, description, enabled, actions, created_at, updated_at
  `) as DbScenarioRow[];

  return rowToScenario(rows[0]);
}

export async function deleteScenario(id: string) {
  await ensureScenariosTable();
  const sql = getSql();
  await sql`
    delete from scenarios
    where id = ${id}
  `;
}
