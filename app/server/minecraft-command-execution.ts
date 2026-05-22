import { buildGiveCommand, defaultGiveSnapshot, type GiveSnapshot } from "../components/give/engine";
import { buildSummonCommand, normalizeSnapshot, toSnapshot } from "../components/summon/engine";
import type { SummonSnapshot } from "../components/summon/data";

export type EquipmentSlot =
  | "armor.head"
  | "armor.chest"
  | "armor.legs"
  | "armor.feet"
  | "weapon.mainhand"
  | "weapon.offhand";

export type ExecutionMode = "give" | "summon" | "equip";
export type SummonSpawn =
  | { type: "coordinates"; coordinates?: { x?: unknown; y?: unknown; z?: unknown } }
  | { type: "near-player" }
  | { type: "player" };

type ExecutionInput = {
  mode: ExecutionMode;
  snapshot: unknown;
  player?: string;
  count?: unknown;
  summonSpawn?: unknown;
  equipmentSlot?: unknown;
};

type ExecutionCommand = {
  command: string;
  requiresPlayer: boolean;
  validPrefix: string;
};

const coordinatePattern = /^-?\d+(?:\.\d+)?$/;
const equipmentSlots = new Set<EquipmentSlot>([
  "armor.head",
  "armor.chest",
  "armor.legs",
  "armor.feet",
  "weapon.mainhand",
  "weapon.offhand",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeExecutionCount(value: unknown) {
  const parsed = Number(String(value ?? "1").trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return "1";
  return String(Math.min(64, Math.max(1, Math.trunc(parsed))));
}

export function normalizeSummonCoordinates(value: unknown) {
  const source = asRecord(value);
  const x = String(source.x ?? "0").trim();
  const y = String(source.y ?? "64").trim();
  const z = String(source.z ?? "0").trim();

  if (!coordinatePattern.test(x) || !coordinatePattern.test(y) || !coordinatePattern.test(z)) {
    throw new Error("Координаты должны быть числами");
  }

  return `${x} ${y} ${z}`;
}

function asGiveSnapshot(value: unknown, count: unknown): GiveSnapshot {
  const source = asRecord(value);
  const fallback = defaultGiveSnapshot();

  return {
    ...fallback,
    itemId: typeof source.itemId === "string" ? source.itemId : fallback.itemId,
    target: "@s",
    targetCustom: "",
    count: normalizeExecutionCount(count ?? source.count),
    fields: asRecord(source.fields) as GiveSnapshot["fields"],
    explosions: Array.isArray(source.explosions) ? source.explosions as GiveSnapshot["explosions"] : fallback.explosions,
    shieldLayers: Array.isArray(source.shieldLayers) ? source.shieldLayers as GiveSnapshot["shieldLayers"] : fallback.shieldLayers,
    potionType: typeof source.potionType === "string" ? source.potionType : fallback.potionType,
    potionModifier: typeof source.potionModifier === "string" ? source.potionModifier : fallback.potionModifier,
  };
}

function asSummonSnapshot(value: unknown): SummonSnapshot {
  const source = asRecord(value);
  const mobOrder = Array.isArray(source.mobOrder) ? source.mobOrder : toSnapshot(["zombie"]).mobOrder;
  return normalizeSnapshot({
    mobOrder: mobOrder
      .map((item) => asRecord(item))
      .map((item) => ({ mobType: typeof item.mobType === "string" ? item.mobType : "zombie" })),
    fields: asRecord(source.fields) as SummonSnapshot["fields"],
  });
}

function stripSlash(command: string) {
  return command.replace(/^\//, "");
}

function normalizeEquipmentSlot(value: unknown): EquipmentSlot {
  if (typeof value === "string" && equipmentSlots.has(value as EquipmentSlot)) {
    return value as EquipmentSlot;
  }
  return "weapon.mainhand";
}

function buildItemStack(snapshot: unknown, count: unknown) {
  const target = "__mc_commands_target__";
  const command = buildGiveCommand({
    ...asGiveSnapshot(snapshot, count),
    target: "@s",
    targetCustom: target,
  });
  const prefix = `/give ${target} `;
  if (!command.startsWith(prefix)) {
    throw new Error("Не удалось собрать предмет для экипировки");
  }
  return command.slice(prefix.length).replace(/ \d+$/, "");
}

export function buildMinecraftExecutionCommand(input: ExecutionInput): ExecutionCommand {
  const player = String(input.player || "").trim();

  if (input.mode === "give") {
    const command = stripSlash(buildGiveCommand({
      ...asGiveSnapshot(input.snapshot, input.count),
      target: "@s",
      targetCustom: player,
    }));
    return {
      command,
      requiresPlayer: true,
      validPrefix: `give ${player} `,
    };
  }

  if (input.mode === "equip") {
    const slot = normalizeEquipmentSlot(input.equipmentSlot);
    const itemStack = buildItemStack(input.snapshot, 1);
    return {
      command: `item replace entity ${player} ${slot} with ${itemStack} 1`,
      requiresPlayer: true,
      validPrefix: `item replace entity ${player} ${slot} with `,
    };
  }

  const spawn = asRecord(input.summonSpawn);
  const spawnType = spawn.type === "coordinates" || spawn.type === "near-player" || spawn.type === "player"
    ? spawn.type
    : "near-player";
  const snapshot = asSummonSnapshot(input.snapshot);

  if (spawnType === "coordinates") {
    return {
      command: stripSlash(buildSummonCommand(snapshot, normalizeSummonCoordinates(spawn.coordinates))),
      requiresPlayer: false,
      validPrefix: "summon ",
    };
  }

  const coords = spawnType === "near-player" ? "~1 ~ ~" : "~ ~ ~";
  return {
    command: `execute at ${player} run ${stripSlash(buildSummonCommand(snapshot, coords))}`,
    requiresPlayer: true,
    validPrefix: `execute at ${player} run summon `,
  };
}
