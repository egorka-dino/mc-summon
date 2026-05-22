import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMinecraftExecutionCommand,
  normalizeExecutionCount,
  normalizeSummonCoordinates,
} from "../.test-build/server/minecraft-command-execution.js";

test("builds give command for selected player with library quantity override", () => {
  const result = buildMinecraftExecutionCommand({
    mode: "give",
    player: "Egorka",
    count: "16",
    snapshot: {
      itemId: "apple",
      target: "@s",
      targetCustom: "",
      count: "1",
      fields: {},
      explosions: [],
      shieldLayers: [],
      potionType: "",
      potionModifier: "normal",
    },
  });

  assert.equal(result.command, "give Egorka minecraft:apple[food={nutrition:0,saturation:0.0f}] 16");
  assert.equal(result.requiresPlayer, true);
  assert.equal(result.validPrefix, "give Egorka ");
});

test("builds summon command at explicit coordinates without requiring player list", () => {
  const result = buildMinecraftExecutionCommand({
    mode: "summon",
    summonSpawn: {
      type: "coordinates",
      coordinates: { x: "10", y: "64", z: "-5" },
    },
    snapshot: {
      mobOrder: [{ mobType: "zombie" }],
      fields: { "0-mob": "zombie" },
    },
  });

  assert.equal(result.command, "summon minecraft:zombie 10 64 -5");
  assert.equal(result.requiresPlayer, false);
  assert.equal(result.validPrefix, "summon ");
});

test("builds summon command near selected player", () => {
  const result = buildMinecraftExecutionCommand({
    mode: "summon",
    player: "Egorka",
    summonSpawn: { type: "near-player" },
    snapshot: {
      mobOrder: [{ mobType: "skeleton" }],
      fields: { "0-mob": "skeleton" },
    },
  });

  assert.equal(result.command, "execute at Egorka run summon minecraft:skeleton ~1 ~ ~");
  assert.equal(result.requiresPlayer, true);
  assert.equal(result.validPrefix, "execute at Egorka run summon ");
});

test("builds equipment command for selected player from library item", () => {
  const result = buildMinecraftExecutionCommand({
    mode: "equip",
    player: "Egorka",
    equipmentSlot: "armor.head",
    snapshot: {
      itemId: "diamond_helmet",
      target: "@s",
      targetCustom: "",
      count: "1",
      fields: { "name": "Шлем рыцаря" },
      explosions: [],
      shieldLayers: [],
      potionType: "",
      potionModifier: "normal",
    },
  });

  assert.equal(result.command, "item replace entity Egorka armor.head with minecraft:diamond_helmet[custom_name='Шлем рыцаря'] 1");
  assert.equal(result.requiresPlayer, true);
  assert.equal(result.validPrefix, "item replace entity Egorka armor.head with ");
});

test("normalizes execution count into Minecraft stack bounds", () => {
  assert.equal(normalizeExecutionCount("0"), "1");
  assert.equal(normalizeExecutionCount("65"), "64");
  assert.equal(normalizeExecutionCount("8.9"), "8");
  assert.equal(normalizeExecutionCount("abc"), "1");
});

test("rejects unsafe summon coordinates", () => {
  assert.throws(
    () => normalizeSummonCoordinates({ x: "10", y: "64", z: "0; kill @a" }),
    /Координаты/,
  );
});
