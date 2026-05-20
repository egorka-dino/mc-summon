"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ServerCommandExecutor } from "../../../components/ServerCommandExecutor";
import { MobEditor } from "../../../components/summon/MobEditor";
import type { SummonSnapshot } from "../../../components/summon/data";
import type { LibraryMob } from "../../../server/library-mobs";

type Props = {
  initialMobs: LibraryMob[];
  databaseReady: boolean;
};

type Draft = {
  id?: string;
  category: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  snapshot: SummonSnapshot;
};

function toDraft(mob: LibraryMob): Draft {
  return {
    id: mob.id,
    category: mob.category,
    name: mob.name,
    description: mob.description,
    version: mob.version,
    enabled: mob.enabled,
    snapshot: { mobOrder: mob.mobOrder, fields: mob.fields },
  };
}

function newDraft(): Draft {
  return {
    category: "Мобы",
    name: "Новый моб",
    description: "",
    version: 1,
    enabled: true,
    snapshot: {
      mobOrder: [{ mobType: "zombie" }],
      fields: { "0-mob": "zombie", "0-persist": true, "0-name-visible": true },
    },
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

function cloneSnapshot(snapshot: SummonSnapshot): SummonSnapshot {
  return {
    mobOrder: snapshot.mobOrder.map((mob) => ({ ...mob })),
    fields: { ...snapshot.fields },
  };
}

export function LibraryMobsClient({ initialMobs, databaseReady }: Props) {
  const initialDraft = useMemo(
    () => initialMobs[0] ? toDraft(initialMobs[0]) : newDraft(),
    [initialMobs],
  );
  const [mobs, setMobs] = useState(initialMobs);
  const [selectedId, setSelectedId] = useState(initialMobs[0]?.id || "");
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
      `Есть несохранённые правки моба «${draft.name}». ${action}?`,
    );
  }

  function selectMob(id: string) {
    const mob = mobs.find((entry) => entry.id === id);
    if (!mob) return;
    if (!confirmDiscardUnsavedChanges("Загрузить другого моба и потерять эти правки")) return;
    const nextDraft = toDraft(mob);
    setSelectedId(id);
    setDraft(nextDraft);
    setCleanDraft(nextDraft);
    setStatus("");
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const updateSnapshot = useCallback((snapshot: SummonSnapshot) => {
    setDraft((current) => ({ ...current, snapshot }));
  }, []);

  async function refreshMobs(nextSelectedId?: string) {
    const response = await fetch("/api/admin/library/mobs", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось обновить библиотеку мобов");
    }

    setMobs(data.mobs);
    const nextMob =
      data.mobs.find((mob: LibraryMob) => mob.id === nextSelectedId) ||
      data.mobs[0];
    if (nextMob) {
      const nextDraft = toDraft(nextMob);
      setSelectedId(nextMob.id);
      setDraft(nextDraft);
      setCleanDraft(nextDraft);
    } else {
      const emptyDraft = newDraft();
      setSelectedId("");
      setDraft(emptyDraft);
      setCleanDraft(emptyDraft);
    }
  }

  async function saveMob() {
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
        mobOrder: draft.snapshot.mobOrder,
        fields: draft.snapshot.fields,
      };
      const response = await fetch("/api/admin/library/mobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить моба");
      }
      await refreshMobs(data.mob.id);
      setStatus("Моб сохранён в библиотеке. /summon увидит изменение после обновления страницы.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить моба");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMob() {
    if (!draft.id || !confirm(`Удалить моба «${draft.name}»?`)) return;

    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/library/mobs?id=${encodeURIComponent(draft.id)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось удалить моба");
      }
      await refreshMobs();
      setStatus("Моб удалён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось удалить моба");
    } finally {
      setBusy(false);
    }
  }

  async function refreshMobList() {
    if (!databaseReady) return;
    if (!confirmDiscardUnsavedChanges("Обновить список и потерять эти правки")) return;

    setBusy(true);
    setStatus("");
    try {
      await refreshMobs(selectedId || undefined);
      setStatus("Список мобов обновлён.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось обновить библиотеку мобов");
    } finally {
      setBusy(false);
    }
  }

  function duplicateMob() {
    if (!confirmDiscardUnsavedChanges("Создать копию и потерять эти правки")) return;
    setSelectedId("");
    setDraft({
      ...draft,
      id: undefined,
      name: `${draft.name} копия`,
      snapshot: cloneSnapshot(draft.snapshot),
    });
    setStatus("Сохраните копию, чтобы добавить её в библиотеку.");
  }

  function createMob() {
    if (!confirmDiscardUnsavedChanges("Создать нового моба и потерять эти правки")) return;
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
          <h2>Библиотека мобов</h2>
          <div className="admin-inline-actions admin-library-actions">
            <button type="button" disabled={busy || !databaseReady} onClick={refreshMobList}>
              Обновить
            </button>
            <button type="button" onClick={createMob}>
              Создать моба
            </button>
          </div>
        </div>
        {!databaseReady ? (
          <p className="admin-warning">
            Хранилище библиотеки не настроено, сохранять правки нельзя.
          </p>
        ) : null}
        <div className="admin-template-buttons">
          {mobs.length ? mobs.map((mob) => (
            <button
              className={mob.id === selectedId ? "active" : ""}
              key={mob.id}
              type="button"
              onClick={() => selectMob(mob.id)}
            >
              <span>{mob.name}</span>
              <small>
                {mob.category}
                {!mob.enabled ? " · скрыт" : ""}
              </small>
            </button>
          )) : (
            <div className="admin-library-empty">
              <strong>Пока нет мобов</strong>
              <span>Создай первого моба, чтобы показывать его в библиотеке `/summon`.</span>
            </div>
          )}
        </div>
      </div>

      <div className="admin-template-form">
        <div className="admin-toolbar">
          <h2>Редактор</h2>
          <div className="admin-inline-actions">
            <button type="button" onClick={duplicateMob}>
              Дублировать
            </button>
            <button
              type="button"
              disabled={busy || !databaseReady || !draft.id}
              onClick={deleteMob}
            >
              Удалить
            </button>
            <button type="button" disabled={busy || !databaseReady} onClick={saveMob}>
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
          <span>Показывать на /summon</span>
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
          <MobEditor
            adminMode
            showAiAssistant
            initialSnapshot={draft.snapshot}
            key={draft.id || "new-mob"}
            onSnapshotChange={updateSnapshot}
            templates={mobs}
          />
        </div>

        <ServerCommandExecutor
          defaultSummonSpawnType="near-player"
          mode="summon"
          showSummonSpawnControl
          snapshot={draft.snapshot}
          title="Призвать моба"
        />

        {status ? <p className="admin-status">{status}</p> : null}
      </div>
    </section>
  );
}
