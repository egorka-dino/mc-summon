import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeLocationForUser,
  normalizeLocationsForImport,
} from "../.test-build/server/locations.js";

test("normalizes a location for the authenticated user only", () => {
  const location = normalizeLocationForUser("user_real", {
    id: "loc_client",
    userId: "user_attacker",
    title: "База",
    server: "Survival",
    world: "Overworld",
    x: "10",
    y: "70",
    z: "-20",
    type: "Base",
    description: "",
  }, { now: "2026-06-01T12:00:00.000Z" });

  assert.equal(location.userId, "user_real");
  assert.equal(location.id, "loc_client");
  assert.equal(location.title, "База");
});

test("import creates fresh account IDs", () => {
  const imported = normalizeLocationsForImport("user_real", [
    {
      id: "loc_local",
      title: "Портал",
      server: "Survival",
      world: "Nether",
      x: "1",
      y: "64",
      z: "2",
      type: "Portal",
      description: "",
    },
  ], {
    now: "2026-06-01T12:00:00.000Z",
    createId: () => "loc_account",
  });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, "loc_account");
  assert.equal(imported[0].userId, "user_real");
});
