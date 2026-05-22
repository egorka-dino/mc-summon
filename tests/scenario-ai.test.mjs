import assert from "node:assert/strict";
import test from "node:test";

import {
  applyScenarioAiPlan,
} from "../.test-build/server/scenario-ai.js";

const items = [
  { id: "iron-sword", name: "Железный меч", description: "", category: "Оружие", version: 1, enabled: true, snapshot: {} },
  { id: "apple", name: "Яблоко", description: "", category: "Еда", version: 1, enabled: true, snapshot: {} },
  { id: "helmet", name: "Шлем рыцаря", description: "", category: "Броня", version: 1, enabled: true, snapshot: {} },
];

const mobs = [
  { id: "skeleton-rider", name: "Скелет-всадник", description: "", category: "Мобы", version: 1, enabled: true, mobOrder: [], fields: {} },
];

test("builds item scenario draft from known library items", () => {
  const result = applyScenarioAiPlan(
    {
      name: "Стартовый набор",
      scenarioType: "items",
      actions: [
        { type: "give_item", itemId: "iron-sword", quantity: 1 },
        { type: "give_item", itemId: "apple", quantity: 16 },
      ],
    },
    { items, mobs, scenarios: [] },
  );

  assert.equal(result.draft.name, "Стартовый набор");
  assert.deepEqual(result.draft.actions.map((action) => action.type), ["give_item", "give_item"]);
  assert.equal(result.draft.actions[1].quantity, 16);
  assert.deepEqual(result.notes, []);
});

test("builds player kit actions and reports missing library items", () => {
  const result = applyScenarioAiPlan(
    {
      name: "Рыцарь",
      scenarioType: "kit",
      actions: [
        { type: "equip_player", itemId: "helmet", slot: "armor.head" },
        { type: "equip_player", itemName: "Алмазный нагрудник", slot: "armor.chest" },
      ],
    },
    { items, mobs, scenarios: [] },
  );

  assert.equal(result.draft.actions.length, 1);
  assert.equal(result.draft.actions[0].type, "equip_player");
  assert.equal(result.draft.actions[0].slot, "armor.head");
  assert.match(result.notes[0], /Алмазный нагрудник/);
});

test("builds mob squad action from known library mobs", () => {
  const result = applyScenarioAiPlan(
    {
      name: "Кавалерия",
      scenarioType: "mobs",
      actions: [
        { type: "summon_mob", mobId: "skeleton-rider", quantity: 10, spawn: { type: "coordinates", coordinates: { x: "1", y: "64", z: "-2" } } },
      ],
    },
    { items, mobs, scenarios: [] },
  );

  assert.equal(result.draft.actions.length, 1);
  assert.equal(result.draft.actions[0].type, "summon_mob");
  assert.equal(result.draft.actions[0].quantity, 10);
  assert.deepEqual(result.draft.actions[0].spawn, { type: "coordinates", coordinates: { x: "1", y: "64", z: "-2" } });
});
