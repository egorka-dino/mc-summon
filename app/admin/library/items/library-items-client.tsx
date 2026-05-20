"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServerCommandExecutor } from "../../../components/ServerCommandExecutor";
import { ItemEditor } from "../../../components/give/ItemEditor";
import { defaultGiveSnapshot, type GiveSnapshot } from "../../../components/give/engine";
import type { LibraryItem } from "../../../server/library-items";

type Props = {
  initialItems: LibraryItem[];
  databaseReady: boolean;
};

type Draft = {
  id?: string;
  category: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  snapshot: GiveSnapshot;
};

function toDraft(item: LibraryItem): Draft {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    description: item.description,
    version: item.version,
    enabled: item.enabled,
    snapshot: item.snapshot,
  };
}

function newDraft(): Draft {
  return {
    category: "Предметы",
    name: "Новый предмет",
    description: "",
    version: 1,
    enabled: true,
    snapshot: defaultGiveSnapshot(),
  };
}

function sortForCompare(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForCompare);
  }
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

export function LibraryItemsClient({ initialItems, databaseReady }: Props) {
  const initialDraft = useMemo(
    () => initialItems[0] ? toDraft(initialItems[0]) : newDraft(),
    [initialItems],
  );
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id || "");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [cleanDraft, setCleanDraft] = useState<Draft>(initialDraft);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const hasUnsavedChanges = useMemo(
    () => serializeDraft(draft) !== serializeDraft(cleanDraft),
    [draft, cleanDraft],
  );

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
    return window.confirm(
      `Есть несохранённые правки предмета «${draft.name}». ${action}?`,
    );
  }

  function selectItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    if (!confirmDiscardUnsavedChanges("Загрузить другой предмет и потерять эти правки")) return;
    const nextDraft = toDraft(item);
    setSelectedId(id);
    setDraft(nextDraft);
    setCleanDraft(nextDraft);
    setStatus("");
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const updateSnapshot = useCallback((snapshot: GiveSnapshot) => {
    setDraft((current) => ({ ...current, snapshot }));
  }, []);

  async function refreshItems(nextSelectedId?: string) {
    const response = await fetch("/api/admin/library/items", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось обновить библиотеку предметов");
    }

    setItems(data.items);
    const nextItem =
      data.items.find((item: LibraryItem) => item.id === nextSelectedId) ||
      data.items[0];
    if (nextItem) {
      const nextDraft = toDraft(nextItem);
      setSelectedId(nextItem.id);
      setDraft(nextDraft);
      setCleanDraft(nextDraft);
    } else {
      const emptyDraft = newDraft();
      setSelectedId("");
      setDraft(emptyDraft);
      setCleanDraft(emptyDraft);
    }
  }

  async function saveItem() {
    setBusy(true);
    setStatus("");
    try {
      const payload = {
        ...(draft.id ? { id: draft.id } : {}),
        category: draft.category,
        name: draft.name,
        description: draft.description,
        version: draft.version,
        enabled: draft.enabled,
        snapshot: draft.snapshot,
      };
      const response = await fetch("/api/admin/library/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить предмет");
      }
      await refreshItems(data.item.id);
      setStatus("Предмет сохранён в библиотеке.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить предмет");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!draft.id || !confirm(`Удалить предмет «${draft.name}»?`)) return;

    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/library/items?id=${encodeURIComponent(draft.id)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось удалить предмет");
      }
      await refreshItems();
      setStatus("Предмет удалён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить предмет");
    } finally {
      setBusy(false);
    }
  }

  async function refreshItemList() {
    if (!databaseReady) return;
    if (!confirmDiscardUnsavedChanges("Обновить список и потерять эти правки")) return;

    setBusy(true);
    setStatus("");
    try {
      await refreshItems(selectedId || undefined);
      setStatus("Список предметов обновлён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось обновить библиотеку предметов");
    } finally {
      setBusy(false);
    }
  }

  function duplicateItem() {
    if (!confirmDiscardUnsavedChanges("Создать копию и потерять эти правки")) return;
    setSelectedId("");
    setDraft({
      ...draft,
      id: undefined,
      name: `${draft.name} копия`,
      snapshot: {
        ...draft.snapshot,
        fields: { ...draft.snapshot.fields },
        explosions: draft.snapshot.explosions.map((explosion) => ({ ...explosion })),
        shieldLayers: draft.snapshot.shieldLayers.map((layer) => ({ ...layer })),
      },
    });
    setStatus("Сохраните копию, чтобы добавить её в библиотеку.");
  }

  function createItem() {
    if (!confirmDiscardUnsavedChanges("Создать новый предмет и потерять эти правки")) return;
    const emptyDraft = newDraft();
    setSelectedId("");
    setDraft(emptyDraft);
    setCleanDraft(emptyDraft);
    setStatus("");
  }

  return (
    <section className="admin-editor">
      <div className="admin-template-list">
        <div className="admin-toolbar admin-library-toolbar">
          <h2>Библиотека предметов</h2>
          <div className="admin-inline-actions admin-library-actions">
            <button type="button" disabled={busy || !databaseReady} onClick={refreshItemList}>
              Обновить
            </button>
            <button type="button" onClick={createItem}>
              Создать предмет
            </button>
          </div>
        </div>
        {!databaseReady ? (
          <p className="admin-warning">
            Хранилище библиотеки не настроено, сохранять правки нельзя.
          </p>
        ) : null}
        <div className="admin-template-buttons">
          {items.length ? items.map((item) => (
            <button
              className={item.id === selectedId ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => selectItem(item.id)}
            >
              <span>{item.name}</span>
              <small>
                {item.category}
                {!item.enabled ? " · скрыт" : ""}
              </small>
            </button>
          )) : (
            <div className="admin-library-empty">
              <strong>Пока нет предметов</strong>
              <span>Создай первый предмет, чтобы позже использовать его в сценариях.</span>
            </div>
          )}
        </div>
      </div>

      <div className="admin-template-form">
        <div className="admin-toolbar">
          <h2>Редактор</h2>
          <div className="admin-inline-actions">
            <button type="button" onClick={duplicateItem}>
              Дублировать
            </button>
            <button
              type="button"
              disabled={busy || !databaseReady || !draft.id}
              onClick={deleteItem}
            >
              Удалить
            </button>
            <button type="button" disabled={busy || !databaseReady} onClick={saveItem}>
              Сохранить
            </button>
          </div>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>Категория</span>
            <input
              type="text"
              value={draft.category}
              onChange={(event) => updateDraft("category", event.target.value)}
            />
          </label>
          <label>
            <span>Название</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
            />
          </label>
          <label>
            <span>Версия</span>
            <input
              min={1}
              type="number"
              value={draft.version}
              onChange={(event) => updateDraft("version", Number(event.target.value))}
            />
          </label>
        </div>

        <label className="admin-check">
          <input
            checked={draft.enabled}
            type="checkbox"
            onChange={(event) => updateDraft("enabled", event.target.checked)}
          />
          <span>Показывать в библиотеке</span>
        </label>

        <label>
          <span>Описание</span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => updateDraft("description", event.target.value)}
          />
        </label>

        <div className="admin-summon-editor">
          <ItemEditor
            adminMode
            showAiAssistant
            initialSnapshot={draft.snapshot}
            key={draft.id || "new-item"}
            onSnapshotChange={updateSnapshot}
          />
        </div>

        <ServerCommandExecutor
          mode="give"
          showCountControl
          snapshot={draft.snapshot}
          title="Выдать предмет"
        />

        {status ? <p className="admin-status">{status}</p> : null}
      </div>
    </section>
  );
}
