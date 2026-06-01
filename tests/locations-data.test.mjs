import assert from "node:assert/strict";
import test from "node:test";

import {
  formatLocationCoordinates,
  normalizeLocationInput,
  validateLocationInput,
} from "../.test-build/components/locations/data.js";

test("validates required location fields with Russian messages", () => {
  assert.throws(
    () => validateLocationInput({
      title: "",
      server: "",
      world: "",
      x: "",
      y: "",
      z: "",
      type: "",
      description: "",
    }),
    /Введите название/,
  );

  assert.throws(
    () => validateLocationInput({
      title: "Портал",
      server: "",
      world: "Nether",
      x: "1",
      y: "64",
      z: "2",
      type: "Portal",
      description: "",
    }),
    /Выберите сервер/,
  );
});

test("rejects non-numeric coordinates with Russian messages", () => {
  assert.throws(
    () => validateLocationInput({
      title: "Сундук",
      server: "Survival",
      world: "Nether",
      x: "abc",
      y: "64",
      z: "-456",
      type: "Chest",
      description: "",
    }),
    /Координата должна быть числом/,
  );
});

test("normalizes imported data to a safe location shape", () => {
  const normalized = normalizeLocationInput(
    {
      id: "../bad",
      userId: "attacker",
      title: "  Сундук у лавы  ",
      server: " Survival ",
      world: "Nether",
      x: "123",
      y: "64",
      z: "-456",
      type: "Chest",
      description: "  алмазы  ",
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    },
    {
      id: "loc_test",
      now: "2026-06-01T12:00:00.000Z",
    },
  );

  assert.deepEqual(normalized, {
    id: "loc_test",
    title: "Сундук у лавы",
    server: "Survival",
    world: "Nether",
    x: 123,
    y: 64,
    z: -456,
    type: "Chest",
    description: "алмазы",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
  });
  assert.equal("userId" in normalized, false);
});

test("formats coordinates as plain X Y Z text", () => {
  assert.equal(
    formatLocationCoordinates({ x: 123, y: 64, z: -456 }),
    "123 64 -456",
  );
});
