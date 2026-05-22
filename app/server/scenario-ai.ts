import type { LibraryItem } from "./library-items";
import type { LibraryMob } from "./library-mobs";
import type { EquipmentSlot } from "./minecraft-command-execution";
import type { Scenario, ScenarioAction, ScenarioSpawn } from "./scenarios";

type ScenarioAiAction = {
  type?: string;
  itemId?: unknown;
  itemName?: unknown;
  mobId?: unknown;
  mobName?: unknown;
  scenarioId?: unknown;
  quantity?: unknown;
  slot?: unknown;
  spawn?: unknown;
};

export type ScenarioAiPlan = {
  name?: unknown;
  description?: unknown;
  scenarioType?: unknown;
  actions?: unknown;
  notes?: unknown;
};

export type ScenarioAiDraft = Pick<Scenario, "id" | "name" | "description" | "enabled" | "actions">;

type ApplyContext = {
  items: Pick<LibraryItem, "id" | "name">[];
  mobs: Pick<LibraryMob, "id" | "name">[];
  scenarios: Pick<Scenario, "id" | "name">[];
};

const equipmentSlots = new Set<EquipmentSlot>([
  "armor.head",
  "armor.chest",
  "armor.legs",
  "armor.feet",
  "weapon.mainhand",
  "weapon.offhand",
]);

function actionId(index: number) {
  return `action-ai-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : fallback;
}

function quantity(value: unknown) {
  const parsed = Number(String(value ?? "1").trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(64, Math.max(1, Math.trunc(parsed)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlot(value: unknown): EquipmentSlot {
  const slot = stringValue(value);
  return equipmentSlots.has(slot as EquipmentSlot) ? slot as EquipmentSlot : "weapon.mainhand";
}

function normalizeSpawn(value: unknown): ScenarioSpawn {
  if (!isRecord(value)) return { type: "near-player" };
  if (value.type === "coordinates") {
    const coordinates = isRecord(value.coordinates) ? value.coordinates : {};
    return {
      type: "coordinates",
      coordinates: {
        x: stringValue(coordinates.x, "0"),
        y: stringValue(coordinates.y, "64"),
        z: stringValue(coordinates.z, "0"),
      },
    };
  }
  if (value.type === "player") return { type: "player" };
  return { type: "near-player" };
}

function scenarioName(type: string) {
  if (type === "items") return "Набор предметов";
  if (type === "mobs") return "Отряд мобов";
  if (type === "kit") return "Комплект игрока";
  return "AI-сценарий";
}

function notesFromPlan(plan: ScenarioAiPlan) {
  return Array.isArray(plan.notes)
    ? plan.notes.filter((note): note is string => typeof note === "string").map((note) => note.slice(0, 240))
    : [];
}

function findById<T extends { id: string }>(entries: T[], id: unknown) {
  const targetId = stringValue(id);
  return targetId ? entries.find((entry) => entry.id === targetId) || null : null;
}

function missingLabel(action: ScenarioAiAction, kind: "предмет" | "моб" | "сценарий") {
  return stringValue(
    kind === "предмет" ? action.itemName || action.itemId : kind === "моб" ? action.mobName || action.mobId : action.scenarioId,
    kind,
  );
}

export function applyScenarioAiPlan(plan: ScenarioAiPlan, context: ApplyContext): { draft: ScenarioAiDraft; notes: string[] } {
  const notes = notesFromPlan(plan);
  const rawActions = Array.isArray(plan.actions) ? plan.actions.filter(isRecord) as ScenarioAiAction[] : [];
  const actions: ScenarioAction[] = [];

  rawActions.forEach((action, index) => {
    if (action.type === "give_item") {
      const item = findById(context.items, action.itemId);
      if (!item) {
        notes.push(`Не найден предмет в библиотеке: ${missingLabel(action, "предмет")}. Создай его в библиотеке и добавь в сценарий вручную.`);
        return;
      }
      actions.push({ id: actionId(index), type: "give_item", itemId: item.id, quantity: quantity(action.quantity) });
      return;
    }

    if (action.type === "equip_player") {
      const item = findById(context.items, action.itemId);
      if (!item) {
        notes.push(`Не найден предмет для комплекта: ${missingLabel(action, "предмет")}. Создай его в библиотеке и добавь в слот вручную.`);
        return;
      }
      actions.push({ id: actionId(index), type: "equip_player", itemId: item.id, slot: normalizeSlot(action.slot) });
      return;
    }

    if (action.type === "summon_mob") {
      const mob = findById(context.mobs, action.mobId);
      if (!mob) {
        notes.push(`Не найден моб в библиотеке: ${missingLabel(action, "моб")}. Создай его в библиотеке и добавь в сценарий вручную.`);
        return;
      }
      actions.push({
        id: actionId(index),
        type: "summon_mob",
        mobId: mob.id,
        quantity: quantity(action.quantity),
        spawn: normalizeSpawn(action.spawn),
      });
      return;
    }

    if (action.type === "run_scenario") {
      const scenario = findById(context.scenarios, action.scenarioId);
      if (!scenario) {
        notes.push(`Не найден вложенный сценарий: ${missingLabel(action, "сценарий")}.`);
        return;
      }
      actions.push({ id: actionId(index), type: "run_scenario", scenarioId: scenario.id });
    }
  });

  const type = stringValue(plan.scenarioType);
  return {
    draft: {
      id: "",
      name: stringValue(plan.name, scenarioName(type)).slice(0, 120),
      description: stringValue(plan.description).slice(0, 500),
      enabled: true,
      actions,
    },
    notes: notes.slice(0, 8),
  };
}
