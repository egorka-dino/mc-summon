import assert from "node:assert/strict";
import test from "node:test";

import {
  executeWithConcurrencyLimit,
  flattenScenarioActions,
  normalizeScenarioActions,
} from "../.test-build/server/scenario-execution.js";
import scenariosModule from "../.test-build/server/scenarios.js";

const { assertScenarioHasNoCycles, canReferenceScenario } = scenariosModule;

const scenarios = [
  {
    id: "scenario-one",
    name: "Сценарий 1",
    description: "",
    enabled: true,
    actions: [
      { id: "a1", type: "give_item", itemId: "iron-sword", quantity: 1 },
      { id: "a2", type: "summon_mob", mobId: "skeleton-ravager", quantity: 1, spawn: { type: "near-player" } },
    ],
  },
  {
    id: "scenario-two",
    name: "Сценарий 2",
    description: "",
    enabled: true,
    actions: [
      { id: "b1", type: "run_scenario", scenarioId: "scenario-one" },
      { id: "b2", type: "give_item", itemId: "totem", quantity: 1 },
    ],
  },
];

test("normalizes scenario actions for supported action types", () => {
  const actions = normalizeScenarioActions([
    { type: "give_item", itemId: "apple", quantity: 70 },
    { type: "summon_mob", mobId: "zombie", quantity: 0, spawn: { type: "coordinates", coordinates: { x: "1", y: "64", z: "-2" } } },
    { type: "run_scenario", scenarioId: "other" },
    { type: "future", kind: "delay", payload: { ticks: 20 } },
  ]);

  assert.equal(actions.length, 4);
  assert.equal(actions[0].quantity, 64);
  assert.equal(actions[1].quantity, 1);
  assert.deepEqual(actions[1].spawn, { type: "coordinates", coordinates: { x: "1", y: "64", z: "-2" } });
  assert.equal(actions[2].scenarioId, "other");
  assert.equal(actions[3].kind, "delay");
});

test("flattens nested run_scenario actions preserving order", () => {
  const flattened = flattenScenarioActions("scenario-two", scenarios);

  assert.deepEqual(flattened.map((entry) => entry.action.type), ["give_item", "summon_mob", "give_item"]);
  assert.deepEqual(flattened.map((entry) => entry.path), ["Сценарий 2 / Сценарий 1", "Сценарий 2 / Сценарий 1", "Сценарий 2"]);
});

test("rejects scenario cycles", () => {
  assert.throws(
    () => flattenScenarioActions("loop-a", [
      { id: "loop-a", name: "A", description: "", enabled: true, actions: [{ id: "a", type: "run_scenario", scenarioId: "loop-b" }] },
      { id: "loop-b", name: "B", description: "", enabled: true, actions: [{ id: "b", type: "run_scenario", scenarioId: "loop-a" }] },
    ]),
    /циклический/,
  );
});

test("rejects saving scenario changes that would create a cycle", () => {
  assert.throws(
    () => assertScenarioHasNoCycles(
      { id: "loop-b", name: "B", description: "", enabled: true, actions: [{ id: "b", type: "run_scenario", scenarioId: "loop-a" }] },
      [
        { id: "loop-a", name: "A", description: "", enabled: true, actions: [{ id: "a", type: "run_scenario", scenarioId: "loop-b" }] },
        { id: "loop-b", name: "B", description: "", enabled: true, actions: [] },
      ],
    ),
    /циклический/,
  );
});

test("allows unsaved scenarios to reference existing scenarios in the editor", () => {
  assert.equal(canReferenceScenario("", "scenario-one", scenarios), true);
});

test("runs repeated summon commands with concurrency limit", async () => {
  let active = 0;
  let maxActive = 0;
  const results = await executeWithConcurrencyLimit(
    Array.from({ length: 25 }, (_, index) => index),
    10,
    async (index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return index;
    },
  );

  assert.deepEqual(results, Array.from({ length: 25 }, (_, index) => index));
  assert.equal(maxActive, 10);
});
