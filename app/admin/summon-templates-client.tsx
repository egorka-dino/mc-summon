"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SummonEditor } from "../components/summon/SummonEditor";
import type { SummonSnapshot } from "../components/summon/data";
import type { SummonTemplate } from "../server/summon-templates";

type Props = {
  initialTemplates: SummonTemplate[];
  databaseReady: boolean;
};

type Draft = {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  enabled: boolean;
  snapshot: SummonSnapshot;
  hasDatabaseRecord: boolean;
};

function toDraft(template: SummonTemplate): Draft {
  return {
    id: template.id,
    category: template.category,
    name: template.name,
    description: template.description,
    version: template.version,
    enabled: template.enabled,
    snapshot: { mobOrder: template.mobOrder, fields: template.fields },
    hasDatabaseRecord: template.hasDatabaseRecord,
  };
}

function newDraft(): Draft {
  return {
    id: `custom-${Date.now()}`,
    category: "Пользовательские",
    name: "Новый шаблон",
    description: "",
    version: 1,
    enabled: true,
    snapshot: {
      mobOrder: [{ mobType: "zombie" }],
      fields: { "0-mob": "zombie", "0-persist": true, "0-name-visible": true },
    },
    hasDatabaseRecord: false,
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

export function SummonTemplatesClient({ initialTemplates, databaseReady }: Props) {
  const initialDraft = useMemo(
    () => initialTemplates[0] ? toDraft(initialTemplates[0]) : newDraft(),
    [initialTemplates],
  );
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id || "");
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
      `Есть несохранённые правки шаблона «${draft.name}». ${action}?`,
    );
  }

  function selectTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    if (!confirmDiscardUnsavedChanges("Загрузить другой шаблон и потерять эти правки")) return;
    const nextDraft = toDraft(template);
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

  async function refreshTemplates(nextSelectedId = draft.id) {
    const response = await fetch("/api/admin/summon/templates", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось обновить список шаблонов");
    }

    setTemplates(data.templates);
    const nextTemplate =
      data.templates.find((template: SummonTemplate) => template.id === nextSelectedId) ||
      data.templates[0];
    if (nextTemplate) {
      const nextDraft = toDraft(nextTemplate);
      setSelectedId(nextTemplate.id);
      setDraft(nextDraft);
      setCleanDraft(nextDraft);
    } else {
      const emptyDraft = newDraft();
      setSelectedId("");
      setDraft(emptyDraft);
      setCleanDraft(emptyDraft);
    }
  }

  async function saveTemplate() {
    setBusy(true);
    setStatus("");
    try {
      const payload = {
        id: draft.id,
        category: draft.category,
        name: draft.name,
        description: draft.description,
        version: draft.version,
        enabled: draft.enabled,
        mobOrder: draft.snapshot.mobOrder,
        fields: draft.snapshot.fields,
      };
      const response = await fetch("/api/admin/summon/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить шаблон");
      }
      await refreshTemplates(data.template.id);
      setStatus("Шаблон сохранён. /summon увидит изменение после обновления страницы.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Не удалось сохранить шаблон");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOverride() {
    if (!draft.id || !confirm(`Удалить шаблон «${draft.name}»?`)) return;

    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(
        `/api/admin/summon/templates?id=${encodeURIComponent(draft.id)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось удалить шаблон");
      }
      await refreshTemplates();
      setStatus("Шаблон удалён.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Не удалось удалить шаблон");
    } finally {
      setBusy(false);
    }
  }

  function duplicateTemplate() {
    if (!confirmDiscardUnsavedChanges("Создать копию и потерять эти правки")) return;
    const copy = {
      ...draft,
      id: `${draft.id}-copy`,
      name: `${draft.name} копия`,
      hasDatabaseRecord: false,
    };
    setSelectedId("");
    setDraft(copy);
    setStatus("Сохраните копию, чтобы добавить её в общий список.");
  }

  function createTemplate() {
    if (!confirmDiscardUnsavedChanges("Создать новый шаблон и потерять эти правки")) return;
    const emptyDraft = newDraft();
    setSelectedId("");
    setDraft(emptyDraft);
    setCleanDraft(emptyDraft);
    setStatus("");
  }

  return (
    <section className="admin-editor">
      <div className="admin-template-list">
        <div className="admin-toolbar">
          <h2>Шаблоны мобов</h2>
          <button
            type="button"
            onClick={createTemplate}
          >
            Новый
          </button>
        </div>
        {!databaseReady ? (
          <p className="admin-warning">
            Хранилище шаблонов не настроено, сохранять правки нельзя.
          </p>
        ) : null}
        <div className="admin-template-buttons">
          {templates.length ? templates.map((template) => (
            <button
              className={template.id === selectedId ? "active" : ""}
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template.id)}
            >
              <span>{template.name}</span>
              <small>
                {template.category}
                {!template.enabled ? " · выключен" : ""}
              </small>
            </button>
          )) : <p className="admin-warning">Пока нет шаблонов.</p>}
        </div>
      </div>

      <div className="admin-template-form">
        <div className="admin-toolbar">
          <h2>Редактор</h2>
          <div className="admin-inline-actions">
            <button type="button" onClick={duplicateTemplate}>
              Копировать
            </button>
            <button
              type="button"
              disabled={busy || !draft.hasDatabaseRecord}
              onClick={deleteOverride}
            >
              Удалить
            </button>
            <button type="button" disabled={busy || !databaseReady} onClick={saveTemplate}>
              Сохранить
            </button>
          </div>
        </div>

        <div className="admin-form-grid">
          <label>
            <span>ID</span>
            <input
              type="text"
              value={draft.id}
              onChange={(event) => updateDraft("id", event.target.value)}
            />
          </label>
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
          <SummonEditor
            adminMode
            showAiAssistant
            initialSnapshot={draft.snapshot}
            key={draft.id}
            onSnapshotChange={updateSnapshot}
            templates={templates}
          />
        </div>

        {status ? <p className="admin-status">{status}</p> : null}
      </div>
    </section>
  );
}
