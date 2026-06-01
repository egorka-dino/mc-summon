export const LOCATIONS_STORAGE_KEY = "mc-locations:places";

export const LOCATION_TYPES = ["Chest", "Portal", "Base", "Structure", "Farm", "Danger", "Other"] as const;
export const LOCATION_WORLDS = ["Overworld", "Nether", "End", "Other"] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];
export type LocationWorld = (typeof LOCATION_WORLDS)[number];

export type PlayerLocation = {
  id: string;
  title: string;
  server: string;
  world: LocationWorld;
  x: number;
  y: number;
  z: number;
  type: LocationType;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationInput = Partial<{
  id: unknown;
  title: unknown;
  server: unknown;
  world: unknown;
  x: unknown;
  y: unknown;
  z: unknown;
  type: unknown;
  description: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}>;

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  Chest: "Сундук",
  Portal: "Портал",
  Base: "База",
  Structure: "Структура",
  Farm: "Ферма",
  Danger: "Опасное место",
  Other: "Другое",
};

export const LOCATION_WORLD_LABELS: Record<LocationWorld, string> = {
  Overworld: "Обычный мир",
  Nether: "Незер",
  End: "Энд",
  Other: "Другой",
};

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value).trim()
    : "";
}

function validDate(value: unknown, fallback: string) {
  const raw = text(value);
  return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : fallback;
}

function isLocationWorld(value: string): value is LocationWorld {
  return LOCATION_WORLDS.includes(value as LocationWorld);
}

function isLocationType(value: string): value is LocationType {
  return LOCATION_TYPES.includes(value as LocationType);
}

function readCoordinate(value: unknown, emptyMessage: string) {
  const raw = text(value).replace(",", ".");
  if (!raw) {
    throw new Error(emptyMessage);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error("Координата должна быть числом");
  }
  return parsed;
}

export function createLocationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `loc_${crypto.randomUUID()}`;
  }
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateLocationInput(input: LocationInput) {
  const title = text(input.title);
  const server = text(input.server);
  const world = text(input.world);
  const type = text(input.type);

  if (!title) throw new Error("Введите название");
  if (!server) throw new Error("Выберите сервер");
  if (!world || !isLocationWorld(world)) throw new Error("Выберите мир");
  const x = readCoordinate(input.x, "Введите координату X");
  const y = readCoordinate(input.y, "Введите координату Y");
  const z = readCoordinate(input.z, "Введите координату Z");
  if (!type || !isLocationType(type)) throw new Error("Выберите тип места");

  return {
    title,
    server,
    world,
    x,
    y,
    z,
    type,
    description: text(input.description),
  };
}

export function normalizeLocationInput(
  input: LocationInput,
  options: { id?: string; now?: string } = {},
): PlayerLocation {
  const now = options.now || new Date().toISOString();
  const normalized = validateLocationInput(input);

  return {
    id: options.id || text(input.id) || createLocationId(),
    ...normalized,
    createdAt: validDate(input.createdAt, now),
    updatedAt: validDate(input.updatedAt, now),
  };
}

export function normalizeLocationList(value: unknown): PlayerLocation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    try {
      return [normalizeLocationInput(item as LocationInput)];
    } catch {
      return [];
    }
  });
}

export function formatLocationCoordinates(location: Pick<PlayerLocation, "x" | "y" | "z">) {
  return `${location.x} ${location.y} ${location.z}`;
}
