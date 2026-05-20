import type { LibraryItem } from "./library-items";
import type { LibraryMob } from "./library-mobs";
import { executeExarotonCommand, listExarotonServers } from "./exaroton";
import { buildMinecraftExecutionCommand } from "./minecraft-command-execution";
import { normalizeScenarioActions, type Scenario, type ScenarioAction, type ScenarioSpawn } from "./scenarios";

export type FlattenedScenarioAction = {
  action: Exclude<ScenarioAction, { type: "run_scenario" }>;
  scenarioId: string;
  scenarioName: string;
  path: string;
};

export type ScenarioExecutionResult = {
  ok: boolean;
  label: string;
  command?: string;
  error?: string;
};

const maxScenarioDepth = 5;
const playerNamePattern = /^[A-Za-z0-9_]{1,16}$/;

export { normalizeScenarioActions };

function findScenarioOrThrow(id: string, scenarios: Scenario[]) {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    throw new Error("Сценарий не найден");
  }
  return scenario;
}

export function flattenScenarioActions(
  scenarioId: string,
  scenarios: Scenario[],
  stack: string[] = [],
): FlattenedScenarioAction[] {
  if (stack.includes(scenarioId)) {
    throw new Error("Найден циклический запуск сценариев");
  }
  if (stack.length >= maxScenarioDepth) {
    throw new Error("Слишком глубокая вложенность сценариев");
  }

  const scenario = findScenarioOrThrow(scenarioId, scenarios);
  const path = [...stack, scenarioId];
  const pathNames = path.map((id) => findScenarioOrThrow(id, scenarios).name).join(" / ");
  const flattened: FlattenedScenarioAction[] = [];

  for (const action of scenario.actions) {
    if (action.type === "run_scenario") {
      flattened.push(...flattenScenarioActions(action.scenarioId, scenarios, path));
    } else {
      flattened.push({
        action,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        path: pathNames,
      });
    }
  }

  return flattened;
}

function itemLabel(item: LibraryItem | undefined, quantity: number) {
  return item ? `Выдать ${item.name} x${quantity}` : "Выдать предмет";
}

function mobLabel(mob: LibraryMob | undefined, quantity: number) {
  return mob ? `Призвать ${mob.name} x${quantity}` : "Призвать моба";
}

function toExecutionSpawn(spawn: unknown) {
  if (!spawn || typeof spawn !== "object" || !("type" in spawn)) return undefined;
  return spawn as ScenarioSpawn;
}

function commandError(result: { ok: boolean; error?: string }) {
  return result.ok ? undefined : result.error || "Команда не выполнена";
}

function serversError(result: { ok: boolean; error?: string }) {
  return result.ok ? "" : result.error || "Не удалось получить серверы Exaroton";
}

function validatePlayerForCommand(command: { requiresPlayer: boolean }, player: string, server: { players: { listAvailable: boolean; list: string[] } }) {
  if (!command.requiresPlayer) return;
  if (!playerNamePattern.test(player)) {
    throw new Error("Выберите игрока из списка сервера");
  }
  if (!server.players.listAvailable) {
    throw new Error("Exaroton не отдал список игроков этого сервера");
  }
  if (!server.players.list.includes(player)) {
    throw new Error("Выбранный игрок сейчас не найден на сервере");
  }
}

export async function executeScenario(params: {
  scenarioId: string;
  scenarios: Scenario[];
  items: LibraryItem[];
  mobs: LibraryMob[];
  serverId: string;
  player?: string;
}) {
  const serverId = params.serverId.trim();
  const player = String(params.player || "").trim();

  if (!serverId) {
    throw new Error("Выберите сервер");
  }

  const serversResult = await listExarotonServers();
  if (!serversResult.configured) {
    throw new Error("EXAROTON_API_KEY не настроен");
  }
  if (!serversResult.ok) {
    throw new Error(`Не удалось получить серверы Exaroton: ${serversError(serversResult)}`);
  }

  const server = serversResult.servers.find((item) => item.id === serverId);
  if (!server) {
    throw new Error("Сервер не найден в Exaroton");
  }
  if (server.status !== 1) {
    throw new Error(`Сервер сейчас не онлайн: ${server.statusLabel}`);
  }

  const flattened = flattenScenarioActions(params.scenarioId, params.scenarios);
  const results: ScenarioExecutionResult[] = [];

  for (const entry of flattened) {
    if (entry.action.type === "future") {
      results.push({ ok: false, label: `${entry.path}: действие будущего типа`, error: "Этот тип действия пока нельзя выполнить" });
      break;
    }

    if (entry.action.type === "give_item") {
      const action = entry.action;
      const item = params.items.find((libraryItem) => libraryItem.id === action.itemId);
      if (!item) {
        results.push({ ok: false, label: itemLabel(item, action.quantity), error: "Предмет не найден в библиотеке" });
        break;
      }
      const command = buildMinecraftExecutionCommand({
        mode: "give",
        player,
        count: action.quantity,
        snapshot: item.snapshot,
      });
      validatePlayerForCommand(command, player, server);
      const result = await executeExarotonCommand(server.id, command.command);
      results.push({
        ok: result.ok,
        label: `${entry.path}: ${itemLabel(item, action.quantity)}`,
        command: command.command,
        error: commandError(result),
      });
      if (!result.ok) break;
    }

    if (entry.action.type === "summon_mob") {
      const action = entry.action;
      const mob = params.mobs.find((libraryMob) => libraryMob.id === action.mobId);
      if (!mob) {
        results.push({ ok: false, label: mobLabel(mob, action.quantity), error: "Моб не найден в библиотеке" });
        break;
      }
      for (let index = 0; index < action.quantity; index += 1) {
        const command = buildMinecraftExecutionCommand({
          mode: "summon",
          player,
          snapshot: { mobOrder: mob.mobOrder, fields: mob.fields },
          summonSpawn: toExecutionSpawn(action.spawn),
        });
        validatePlayerForCommand(command, player, server);
        const result = await executeExarotonCommand(server.id, command.command);
        results.push({
          ok: result.ok,
          label: `${entry.path}: ${mobLabel(mob, action.quantity)}${action.quantity > 1 ? ` (${index + 1}/${action.quantity})` : ""}`,
          command: command.command,
          error: commandError(result),
        });
        if (!result.ok) return { ok: false, results };
      }
    }
  }

  return {
    ok: results.every((result) => result.ok),
    results,
  };
}
