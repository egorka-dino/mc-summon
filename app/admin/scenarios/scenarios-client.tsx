"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryItem } from "../../server/library-items";
import type { LibraryMob } from "../../server/library-mobs";
import type { Scenario, ScenarioAction, ScenarioSpawn } from "../../server/scenarios";
import { canReferenceScenario } from "../../shared/scenario-cycles";

type ExarotonServer = {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  players: { count: number; max: number | null; list: string[]; listAvailable: boolean };
};

type Props = {
  databaseReady: boolean;
  initialItems: LibraryItem[];
  initialMobs: LibraryMob[];
  initialScenarios: Scenario[];
};

type Draft = Scenario;
type ExecuteResult = { ok: boolean; label: string; command?: string; error?: string };
type ScenarioActionType = "give_item" | "equip_player" | "summon_mob" | "run_scenario";

const equipmentSlots = [
  { value: "armor.head", label: "Шлем" },
  { value: "armor.chest", label: "Нагрудник" },
  { value: "armor.legs", label: "Поножи" },
  { value: "armor.feet", label: "Ботинки" },
  { value: "weapon.mainhand", label: "Основная рука" },
  { value: "weapon.offhand", label: "Левая рука" },
] as const;

function actionId() {
  return `action-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newDraft(): Draft {
  return {
    id: "",
    name: "Новый сценарий",
    description: "",
    enabled: true,
    actions: [],
  };
}

function cloneDraft(scenario: Scenario): Draft {
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    enabled: scenario.enabled,
    actions: scenario.actions.map((action) => ({ ...action, id: action.id || actionId() }) as ScenarioAction),
  };
}

function sortForCompare(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForCompare);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForCompare(entry)]),
    );
  }
  return value;
}

function serializeDraft(draft: Draft) {
  return JSON.stringify(sortForCompare(draft));
}

function defaultSpawn(): ScenarioSpawn {
  return { type: "near-player" };
}

function defaultCoordinatesSpawn(): ScenarioSpawn {
  return { type: "coordinates", coordinates: { x: "0", y: "64", z: "0" } };
}

function describeAction(action: ScenarioAction, items: LibraryItem[], mobs: LibraryMob[], scenarios: Scenario[]) {
  if (action.type === "give_item") {
    const item = items.find((entry) => entry.id === action.itemId);
    return item ? `Выдать ${item.name} x${action.quantity}` : "Выдать предмет";
  }
  if (action.type === "equip_player") {
    const item = items.find((entry) => entry.id === action.itemId);
    const slot = equipmentSlots.find((entry) => entry.value === action.slot);
    return item ? `${slot?.label || action.slot}: ${item.name}` : "Экипировать предмет";
  }
  if (action.type === "summon_mob") {
    const mob = mobs.find((entry) => entry.id === action.mobId);
    return mob ? `Призвать ${mob.name} x${action.quantity}` : "Призвать моба";
  }
  if (action.type === "run_scenario") {
    const scenario = scenarios.find((entry) => entry.id === action.scenarioId);
    return scenario ? `Выполнить сценарий «${scenario.name}»` : "Выполнить сценарий";
  }
  return `Действие будущего типа: ${action.kind}`;
}

function quantity(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(64, Math.max(1, Math.trunc(parsed)));
}

export function ScenariosClient({ databaseReady, initialItems, initialMobs, initialScenarios }: Props) {
  const initialDraft = useMemo(
    () => initialScenarios[0] ? cloneDraft(initialScenarios[0]) : newDraft(),
    [initialScenarios],
  );
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [items, setItems] = useState(initialItems);
  const [mobs, setMobs] = useState(initialMobs);
  const [selectedId, setSelectedId] = useState(initialScenarios[0]?.id || "");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [cleanDraft, setCleanDraft] = useState<Draft>(initialDraft);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [servers, setServers] = useState<ExarotonServer[]>([]);
  const [serverId, setServerId] = useState("");
  const [player, setPlayer] = useState("");
  const [serverError, setServerError] = useState("");
  const [loadingServers, setLoadingServers] = useState(false);
  const [executeResults, setExecuteResults] = useState<ExecuteResult[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const hasUnsavedChanges = useMemo(
    () => serializeDraft(draft) !== serializeDraft(cleanDraft),
    [draft, cleanDraft],
  );
  const selectedServer = servers.find((server) => server.id === serverId) || null;
  const players = selectedServer?.players.list || [];
  const needsPlayer = draft.actions.some((action) => action.type !== "summon_mob" || action.spawn.type !== "coordinates");
  const canExecute = Boolean(selectedId && selectedServer && (!needsPlayer || player) && !busy);

  useEffect(() => {
    refreshServers();
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function confirmDiscardUnsavedChanges(action: string) {
    if (!hasUnsavedChanges) return true;
    return window.confirm(`Есть несохранённые правки сценария «${draft.name}». ${action}?`);
  }

  async function refreshScenarios(nextSelectedId?: string) {
    const response = await fetch("/api/admin/scenarios", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось обновить сценарии");
    }
    setScenarios(data.scenarios);
    setItems(data.items);
    setMobs(data.mobs);
    const nextScenario =
      data.scenarios.find((scenario: Scenario) => scenario.id === nextSelectedId) ||
      data.scenarios[0];
    if (nextScenario) {
      const nextDraft = cloneDraft(nextScenario);
      setSelectedId(nextScenario.id);
      setDraft(nextDraft);
      setCleanDraft(nextDraft);
    } else {
      const emptyDraft = newDraft();
      setSelectedId("");
      setDraft(emptyDraft);
      setCleanDraft(emptyDraft);
    }
  }

  async function refreshServers() {
    setLoadingServers(true);
    setServerError("");
    setServerId("");
    setPlayer("");
    try {
      const response = await fetch("/api/admin/minecraft/servers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.exaroton?.ok) {
        throw new Error(data.exaroton?.error || data.error || "Не удалось загрузить серверы");
      }
      setServers(data.exaroton.servers.filter((server: ExarotonServer) => server.status === 1));
    } catch (error) {
      setServers([]);
      setServerError(error instanceof Error ? error.message : "Не удалось загрузить серверы");
    } finally {
      setLoadingServers(false);
    }
  }

  function selectScenario(id: string) {
    const scenario = scenarios.find((entry) => entry.id === id);
    if (!scenario) return;
    if (!confirmDiscardUnsavedChanges("Загрузить другой сценарий и потерять эти правки")) return;
    const nextDraft = cloneDraft(scenario);
    setSelectedId(id);
    setDraft(nextDraft);
    setCleanDraft(nextDraft);
    setStatus("");
    setExecuteResults([]);
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAction(id: string, patch: Partial<ScenarioAction>) {
    setDraft((current) => ({
      ...current,
      actions: current.actions.map((action) => action.id === id ? ({ ...action, ...patch } as ScenarioAction) : action),
    }));
  }

  function createPreset(type: "items" | "mobs" | "kit") {
    if (!confirmDiscardUnsavedChanges("Создать сценарий по заготовке и потерять эти правки")) return;
    const itemId = items[0]?.id || "";
    const mobId = mobs[0]?.id || "";
    const actions: ScenarioAction[] =
      type === "items"
        ? [
          { id: actionId(), type: "give_item", itemId, quantity: 1 },
          { id: actionId(), type: "give_item", itemId, quantity: 1 },
        ]
        : type === "mobs"
          ? [
            { id: actionId(), type: "summon_mob", mobId, quantity: 1, spawn: defaultSpawn() },
            { id: actionId(), type: "summon_mob", mobId, quantity: 1, spawn: defaultSpawn() },
          ]
          : [
            ...equipmentSlots.map((slot) => ({ id: actionId(), type: "equip_player" as const, itemId, slot: slot.value })),
            { id: actionId(), type: "give_item", itemId, quantity: 1 },
          ];
    const nextDraft: Draft = {
      id: "",
      name: type === "items" ? "Набор предметов" : type === "mobs" ? "Отряд мобов" : "Комплект игрока",
      description: "",
      enabled: true,
      actions,
    };
    setSelectedId("");
    setDraft(nextDraft);
    setCleanDraft(newDraft());
    setExecuteResults([]);
    setStatus("Заготовка создана. Замени элементы библиотеки и сохрани сценарий.");
  }

  function addAction(type: ScenarioActionType) {
    const availableScenario = scenarios.find((scenario) => canReferenceScenario(draft.id, scenario.id, scenarios));
    const action =
      type === "give_item"
        ? { id: actionId(), type, itemId: items[0]?.id || "", quantity: 1 }
        : type === "equip_player"
          ? { id: actionId(), type, itemId: items[0]?.id || "", slot: "weapon.mainhand" }
        : type === "summon_mob"
          ? { id: actionId(), type, mobId: mobs[0]?.id || "", quantity: 1, spawn: defaultSpawn() }
          : { id: actionId(), type, scenarioId: availableScenario?.id || "" };
    setDraft((current) => ({ ...current, actions: [...current.actions, action as ScenarioAction] }));
  }

  function duplicateAction(id: string) {
    setDraft((current) => {
      const index = current.actions.findIndex((action) => action.id === id);
      if (index < 0) return current;
      const copy = { ...current.actions[index], id: actionId() } as ScenarioAction;
      return {
        ...current,
        actions: [...current.actions.slice(0, index + 1), copy, ...current.actions.slice(index + 1)],
      };
    });
  }

  function removeAction(id: string) {
    setDraft((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== id) }));
  }

  function moveAction(id: string, dir: -1 | 1) {
    setDraft((current) => {
      const index = current.actions.findIndex((action) => action.id === id);
      const nextIndex = index + dir;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.actions.length) return current;
      const actions = [...current.actions];
      [actions[index], actions[nextIndex]] = [actions[nextIndex], actions[index]];
      return { ...current, actions };
    });
  }

  function createScenario() {
    if (!confirmDiscardUnsavedChanges("Создать новый сценарий и потерять эти правки")) return;
    const emptyDraft = newDraft();
    setSelectedId("");
    setDraft(emptyDraft);
    setCleanDraft(emptyDraft);
    setStatus("");
    setExecuteResults([]);
  }

  function duplicateScenario() {
    if (!confirmDiscardUnsavedChanges("Создать копию и потерять эти правки")) return;
    setSelectedId("");
    setDraft({
      ...draft,
      id: "",
      name: `${draft.name} копия`,
      actions: draft.actions.map((action) => ({ ...action, id: actionId() }) as ScenarioAction),
    });
    setStatus("Сохраните копию, чтобы добавить её в сценарии.");
  }

  async function saveScenario() {
    setBusy(true);
    setStatus("");
    try {
      const payload = {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name,
        description: draft.description,
        enabled: draft.enabled,
        actions: draft.actions,
      };
      const response = await fetch("/api/admin/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить сценарий");
      }
      await refreshScenarios(data.scenario.id);
      setStatus("Сценарий сохранён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить сценарий");
    } finally {
      setBusy(false);
    }
  }

  async function deleteScenario() {
    if (!draft.id || !confirm(`Удалить сценарий «${draft.name}»?`)) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/scenarios?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось удалить сценарий");
      }
      await refreshScenarios();
      setStatus("Сценарий удалён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить сценарий");
    } finally {
      setBusy(false);
    }
  }

  async function executeScenario() {
    if (!selectedId || !serverId || (needsPlayer && !player)) return;
    setBusy(true);
    setExecuteResults([]);
    setStatus("");
    try {
      const response = await fetch("/api/admin/scenarios/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: selectedId, serverId, player }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (Array.isArray(data.results)) setExecuteResults(data.results);
        throw new Error(data.error || "Сценарий выполнен с ошибкой");
      }
      setExecuteResults(data.results || []);
      setStatus("Сценарий выполнен.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось выполнить сценарий");
    } finally {
      setBusy(false);
    }
  }

  async function fillScenarioWithAi() {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    if (!confirmDiscardUnsavedChanges("Заменить текущий черновик результатом AI")) return;
    setAiBusy(true);
    setAiNotes([]);
    setStatus("");
    try {
      const response = await fetch("/api/admin/scenarios/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "AI не смог заполнить сценарий");
      }
      const nextDraft = data.draft as Draft;
      setSelectedId("");
      setDraft(nextDraft);
      setCleanDraft(newDraft());
      setExecuteResults([]);
      setAiNotes(Array.isArray(data.notes) ? data.notes : []);
      setStatus("AI заполнил черновик. Проверь действия, выбери сервер и сохрани сценарий вручную.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI не смог заполнить сценарий");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="admin-editor">
      <div className="admin-template-list">
        <div className="admin-toolbar admin-library-toolbar">
          <h2>Сценарии</h2>
          <div className="admin-inline-actions admin-library-actions">
            <button type="button" disabled={busy || !databaseReady} onClick={() => refreshScenarios(selectedId || undefined)}>
              Обновить
            </button>
            <button type="button" onClick={createScenario}>Создать сценарий</button>
          </div>
        </div>
        {!databaseReady ? <p className="admin-warning">Хранилище сценариев не настроено, сохранять правки нельзя.</p> : null}
        <div className="admin-template-buttons">
          {scenarios.length ? scenarios.map((scenario) => (
            <button
              className={scenario.id === selectedId ? "active" : ""}
              key={scenario.id}
              type="button"
              onClick={() => selectScenario(scenario.id)}
            >
              <span>{scenario.name}</span>
              <small>{scenario.actions.length} действ.</small>
            </button>
          )) : (
            <div className="admin-library-empty">
              <strong>Пока нет сценариев</strong>
              <span>Создай сценарий из действий библиотеки.</span>
            </div>
          )}
        </div>
      </div>

      <div className="admin-template-form">
        <div className="admin-toolbar">
          <h2>Редактор</h2>
          <div className="admin-inline-actions">
            <button type="button" onClick={duplicateScenario}>Дублировать</button>
            <button type="button" disabled={busy || !databaseReady || !draft.id} onClick={deleteScenario}>Удалить</button>
            <button type="button" disabled={busy || !databaseReady} onClick={saveScenario}>Сохранить</button>
          </div>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Название</span>
            <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
          </label>
        </div>

        <label className="admin-check">
          <input checked={draft.enabled} type="checkbox" onChange={(event) => updateDraft("enabled", event.target.checked)} />
          <span>Включить сценарий</span>
        </label>

        <label>
          <span>Описание</span>
          <textarea rows={3} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
        </label>

        <section className="panel ai-panel admin-scenario-ai">
          <h2>Заполнить сценарий словами <span className="sub">AI-помощник</span></h2>
          <textarea
            rows={3}
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Например: стартовый набор: железный меч, железная кирка, 16 яблок и 5 факелов"
          />
          <div className="btn-row ai-actions">
            <button type="button" onClick={fillScenarioWithAi} disabled={aiBusy || !aiPrompt.trim()}>
              {aiBusy ? "Думаю..." : "Заполнить черновик"}
            </button>
            <button className="sec" type="button" onClick={() => { setAiPrompt(""); setAiNotes([]); }} disabled={aiBusy || (!aiPrompt && !aiNotes.length)}>Очистить</button>
          </div>
          <p className="hint">AI только заполняет форму из элементов библиотеки. Сценарий нужно проверить, сохранить и выполнить вручную.</p>
          {aiNotes.length ? <ul className="ai-notes">{aiNotes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul> : null}
        </section>

        <section className="admin-scenario-actions">
          <div className="admin-toolbar">
            <h2>Действия</h2>
            <div className="admin-inline-actions">
              <button type="button" onClick={() => addAction("give_item")}>Выдать предмет</button>
              <button type="button" onClick={() => addAction("equip_player")}>Экипировать игрока</button>
              <button type="button" onClick={() => addAction("summon_mob")}>Призвать моба</button>
              <button type="button" onClick={() => addAction("run_scenario")}>Выполнить сценарий</button>
            </div>
          </div>
          <div className="scenario-presets">
            <button type="button" onClick={() => createPreset("items")}>Набор предметов</button>
            <button type="button" onClick={() => createPreset("mobs")}>Отряд мобов</button>
            <button type="button" onClick={() => createPreset("kit")}>Комплект игрока</button>
          </div>

          <div className="scenario-action-list">
            {draft.actions.length ? draft.actions.map((action, index) => (
              <ActionEditor
                action={action}
                currentScenarioId={draft.id}
                index={index}
                items={items}
                key={action.id}
                mobs={mobs}
                onDuplicate={() => duplicateAction(action.id)}
                onMoveDown={() => moveAction(action.id, 1)}
                onMoveUp={() => moveAction(action.id, -1)}
                onRemove={() => removeAction(action.id)}
                onUpdate={(patch) => updateAction(action.id, patch)}
                scenarios={scenarios}
              />
            )) : <p className="admin-library-empty">Добавь первое действие сценария.</p>}
          </div>
        </section>

        <section className="panel server-execute-panel admin-scenario-execute">
          <h2>Выполнить сценарий <span className="sub">только для админа</span></h2>
          {serverError ? <p className="server-execute-message error">{serverError}</p> : null}
          {loadingServers ? <p className="server-execute-message">Загружаем серверы Exaroton...</p> : null}
          <div className="grid-2">
            <label>
              <span className="lab">Сервер</span>
              <select value={serverId} onChange={(event) => { setServerId(event.target.value); setPlayer(""); }}>
                <option value="">- выбери сервер -</option>
                {servers.map((server) => <option key={server.id} value={server.id}>{server.name} - {server.statusLabel}</option>)}
              </select>
            </label>
            {needsPlayer ? (
              <label>
                <span className="lab">Игрок</span>
                <select value={player} onChange={(event) => setPlayer(event.target.value)} disabled={!selectedServer || !selectedServer.players.listAvailable || !players.length}>
                  <option value="">- выбери игрока -</option>
                  {players.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          <div className="btn-row server-execute-actions">
            <button type="button" onClick={executeScenario} disabled={!canExecute}>{busy ? "Выполняем..." : "Выполнить сценарий"}</button>
            <button className="sec" type="button" onClick={refreshServers} disabled={busy || loadingServers}>Обновить серверы</button>
          </div>
          {executeResults.length ? (
            <div className="scenario-results">
              {executeResults.map((result, index) => (
                <p className={`server-execute-message ${result.ok ? "success" : "error"}`} key={`${result.label}-${index}`}>
                  {result.label}: {result.ok ? "успешно" : result.error || "ошибка"}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        {status ? <p className="admin-status">{status}</p> : null}
      </div>
    </section>
  );
}

function ActionEditor({
  action,
  currentScenarioId,
  index,
  items,
  mobs,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRemove,
  onUpdate,
  scenarios,
}: {
  action: ScenarioAction;
  currentScenarioId: string;
  index: number;
  items: LibraryItem[];
  mobs: LibraryMob[];
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ScenarioAction>) => void;
  scenarios: Scenario[];
}) {
  const availableScenarios = scenarios.filter((scenario) => canReferenceScenario(currentScenarioId, scenario.id, scenarios));
  const selectedScenarioIsBlocked =
    action.type === "run_scenario" &&
    Boolean(action.scenarioId) &&
    !availableScenarios.some((scenario) => scenario.id === action.scenarioId);
  const selectedScenario = action.type === "run_scenario"
    ? scenarios.find((scenario) => scenario.id === action.scenarioId)
    : null;

  return (
    <div className="scenario-action-card">
      <div className="scenario-action-head">
        <div>
          <strong>{index + 1}. {describeAction(action, items, mobs, scenarios)}</strong>
          <small>{action.type === "give_item" ? "Выдача предмета" : action.type === "equip_player" ? "Слот игрока" : action.type === "summon_mob" ? "Призыв моба" : action.type === "run_scenario" ? "Вложенный сценарий" : "Будущий тип"}</small>
        </div>
        <div className="admin-inline-actions">
          <button className="small" type="button" onClick={onMoveUp}>↑</button>
          <button className="small" type="button" onClick={onMoveDown}>↓</button>
          <button className="small" type="button" onClick={onDuplicate}>Дублировать</button>
          <button className="small danger" type="button" onClick={onRemove}>Удалить</button>
        </div>
      </div>

      {action.type === "give_item" ? (
        <div className="admin-form-grid scenario-action-fields">
          <label>
            <span>Предмет</span>
            <select value={action.itemId} onChange={(event) => onUpdate({ itemId: event.target.value } as Partial<ScenarioAction>)}>
              <option value="">- выбери предмет -</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Количество</span>
            <input min={1} max={64} type="number" value={action.quantity} onChange={(event) => onUpdate({ quantity: quantity(event.target.value) } as Partial<ScenarioAction>)} />
          </label>
        </div>
      ) : null}

      {action.type === "equip_player" ? (
        <div className="admin-form-grid scenario-action-fields">
          <label>
            <span>Слот</span>
            <select value={action.slot} onChange={(event) => onUpdate({ slot: event.target.value } as Partial<ScenarioAction>)}>
              {equipmentSlots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
            </select>
          </label>
          <label>
            <span>Предмет</span>
            <select value={action.itemId} onChange={(event) => onUpdate({ itemId: event.target.value } as Partial<ScenarioAction>)}>
              <option value="">- выбери предмет -</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      ) : null}

      {action.type === "summon_mob" ? (
        <div className="admin-form-grid scenario-action-fields">
          <label>
            <span>Моб</span>
            <select value={action.mobId} onChange={(event) => onUpdate({ mobId: event.target.value } as Partial<ScenarioAction>)}>
              <option value="">- выбери моба -</option>
              {mobs.map((mob) => <option key={mob.id} value={mob.id}>{mob.name}</option>)}
            </select>
          </label>
          <label>
            <span>Количество</span>
            <input min={1} max={64} type="number" value={action.quantity} onChange={(event) => onUpdate({ quantity: quantity(event.target.value) } as Partial<ScenarioAction>)} />
          </label>
          <SpawnEditor action={action} onUpdate={onUpdate} />
        </div>
      ) : null}

      {action.type === "run_scenario" ? (
        <div className="admin-form-grid scenario-action-fields">
          <label>
            <span>Сценарий</span>
            <select value={action.scenarioId} onChange={(event) => onUpdate({ scenarioId: event.target.value } as Partial<ScenarioAction>)}>
              <option value="">- выбери сценарий -</option>
              {selectedScenarioIsBlocked ? (
                <option value={action.scenarioId}>{selectedScenario?.name || action.scenarioId} - создаёт цикл</option>
              ) : null}
              {availableScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
              ))}
            </select>
          </label>
          {selectedScenarioIsBlocked ? (
            <p className="admin-warning">Этот вложенный сценарий создаёт цикл. Выбери другой сценарий перед сохранением.</p>
          ) : null}
          {!availableScenarios.length ? (
            <p className="admin-library-empty">Нет сценариев, которые можно вложить без цикла.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SpawnEditor({ action, onUpdate }: { action: Extract<ScenarioAction, { type: "summon_mob" }>; onUpdate: (patch: Partial<ScenarioAction>) => void }) {
  const spawn = action.spawn || defaultSpawn();
  const coordinates = spawn.type === "coordinates" ? spawn.coordinates : { x: "0", y: "64", z: "0" };

  function updateSpawn(next: ScenarioSpawn) {
    onUpdate({ spawn: next } as Partial<ScenarioAction>);
  }

  return (
    <>
      <label>
        <span>Место спавна</span>
        <select
          value={spawn.type}
          onChange={(event) => {
            const type = event.target.value;
            updateSpawn(type === "coordinates" ? defaultCoordinatesSpawn() : { type } as ScenarioSpawn);
          }}
        >
          <option value="near-player">Рядом с игроком</option>
          <option value="player">На позиции игрока</option>
          <option value="coordinates">Координаты</option>
        </select>
      </label>
      {spawn.type === "coordinates" ? (["x", "y", "z"] as const).map((axis) => (
        <label key={axis}>
          <span>{axis.toUpperCase()}</span>
          <input
            value={coordinates[axis]}
            onChange={(event) => updateSpawn({
              type: "coordinates",
              coordinates: { ...coordinates, [axis]: event.target.value },
            })}
          />
        </label>
      )) : null}
    </>
  );
}
