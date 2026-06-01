"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOCATIONS_STORAGE_KEY,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPES,
  LOCATION_WORLD_LABELS,
  LOCATION_WORLDS,
  createLocationId,
  formatLocationCoordinates,
  normalizeLocationInput,
  normalizeLocationList,
  type LocationInput,
  type LocationType,
  type LocationWorld,
  type PlayerLocation,
} from "./data";

type AuthStatus = {
  configured: boolean;
  authenticated: boolean;
  user: { name: string } | null;
};

type PublicServer = {
  id: string;
  name: string;
  address: string | null;
};

type FormState = {
  id: string;
  title: string;
  serverMode: "known" | "custom";
  server: string;
  customServer: string;
  world: LocationWorld | "";
  x: string;
  y: string;
  z: string;
  type: LocationType | "";
  description: string;
};

const emptyForm: FormState = {
  id: "",
  title: "",
  serverMode: "known",
  server: "",
  customServer: "",
  world: "Overworld",
  x: "",
  y: "",
  z: "",
  type: "Other",
  description: "",
};

function readLocalLocations() {
  try {
    return normalizeLocationList(JSON.parse(localStorage.getItem(LOCATIONS_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeLocalLocations(locations: PlayerLocation[]) {
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
}

function formFromLocation(location: PlayerLocation, servers: PublicServer[]): FormState {
  const known = servers.some((server) => server.name === location.server);
  return {
    id: location.id,
    title: location.title,
    serverMode: known ? "known" : "custom",
    server: known ? location.server : "",
    customServer: known ? "" : location.server,
    world: location.world,
    x: String(location.x),
    y: String(location.y),
    z: String(location.z),
    type: location.type,
    description: location.description,
  };
}

function inputFromForm(form: FormState): LocationInput {
  return {
    id: form.id || createLocationId(),
    title: form.title,
    server: form.serverMode === "custom" ? form.customServer : form.server,
    world: form.world,
    x: form.x,
    y: form.y,
    z: form.z,
    type: form.type,
    description: form.description,
  };
}

export function LocationsEditor() {
  const [auth, setAuth] = useState<AuthStatus | null | undefined>(undefined);
  const [servers, setServers] = useState<PublicServer[]>([]);
  const [locations, setLocations] = useState<PlayerLocation[]>([]);
  const [localLocations, setLocalLocations] = useState<PlayerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accountStorageAvailable, setAccountStorageAvailable] = useState(true);
  const [importDismissed, setImportDismissed] = useState(false);
  const [filters, setFilters] = useState({
    server: "",
    world: "",
    type: "",
    search: "",
  });

  const accountMode = Boolean(auth?.authenticated);
  const useAccountStorage = accountMode && accountStorageAvailable;

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      setLoading(true);
      const browserLocations = readLocalLocations();
      if (!active) return;
      setLocalLocations(browserLocations);

      const [authResponse, serversResponse] = await Promise.all([
        fetch("/api/auth/status", { cache: "no-store", credentials: "same-origin" })
          .then((response) => response.ok ? response.json() : null)
          .catch(() => null),
        fetch("/api/servers/public", { cache: "no-store" })
          .then((response) => response.ok ? response.json() : null)
          .catch(() => null),
      ]);

      if (!active) return;

      setAuth(authResponse);
      setServers(Array.isArray(serversResponse?.servers) ? serversResponse.servers : []);

      if (authResponse?.authenticated) {
        const accountResponse = await fetch("/api/locations", {
          cache: "no-store",
          credentials: "same-origin",
        }).then((response) => response.json().then((data) => ({ response, data }))).catch(() => null);

        if (!active) return;
        if (accountResponse?.response.ok && Array.isArray(accountResponse.data.locations)) {
          setLocations(accountResponse.data.locations);
          setAccountStorageAvailable(true);
        } else {
          setLocations(browserLocations);
          setAccountStorageAvailable(false);
          setError(accountResponse?.data?.error || "Аккаунтное хранилище недоступно. Пока используем места из этого браузера.");
        }
      } else {
        setLocations(browserLocations);
      }

      setLoading(false);
    }

    loadInitialState();
    return () => {
      active = false;
    };
  }, []);

  const visibleLocations = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return locations.filter((location) => {
      if (filters.server && location.server !== filters.server) return false;
      if (filters.world && location.world !== filters.world) return false;
      if (filters.type && location.type !== filters.type) return false;
      if (!search) return true;
      return `${location.title} ${location.description}`.toLowerCase().includes(search);
    });
  }, [filters, locations]);

  const serverOptions = useMemo(
    () => Array.from(new Set([...servers.map((server) => server.name), ...locations.map((location) => location.server)])).filter(Boolean),
    [locations, servers],
  );

  function updateLocal(nextLocations: PlayerLocation[]) {
    setLocations(nextLocations);
    setLocalLocations(nextLocations);
    writeLocalLocations(nextLocations);
  }

  function startCreate() {
    setError("");
    setNotice("");
    setForm({
      ...emptyForm,
      serverMode: servers.length ? "known" : "custom",
    });
    setEditing(true);
  }

  function startEdit(location: PlayerLocation) {
    setError("");
    setNotice("");
    setForm(formFromLocation(location, servers));
    setEditing(true);
  }

  async function saveLocation() {
    try {
      const normalized = normalizeLocationInput(inputFromForm(form), {
        id: form.id || createLocationId(),
      });

      if (useAccountStorage) {
        const response = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(normalized),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Не удалось сохранить место.");
        }
        setLocations((current) => [data.location, ...current.filter((item) => item.id !== data.location.id)]);
      } else {
        const next = [normalized, ...locations.filter((item) => item.id !== normalized.id)];
        updateLocal(next);
      }

      setEditing(false);
      setForm(emptyForm);
      setNotice("Место сохранено.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить место.");
    }
  }

  async function deleteLocation(location: PlayerLocation) {
    setError("");
    setNotice("");
    if (useAccountStorage) {
      const response = await fetch(`/api/locations?id=${encodeURIComponent(location.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.error || "Не удалось удалить место.");
        return;
      }
      setLocations((current) => current.filter((item) => item.id !== location.id));
    } else {
      updateLocal(locations.filter((item) => item.id !== location.id));
    }
  }

  async function copyCoordinates(location: PlayerLocation) {
    try {
      await navigator.clipboard.writeText(formatLocationCoordinates(location));
      setNotice("Координаты скопированы.");
    } catch {
      setError("Не удалось скопировать координаты.");
    }
  }

  async function importLocalLocations() {
    const response = await fetch("/api/locations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ locations: localLocations }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setError(data.error || "Не удалось импортировать места.");
      return;
    }
    localStorage.removeItem(LOCATIONS_STORAGE_KEY);
    setLocalLocations([]);
    setLocations(data.locations);
    setNotice("Локальные места импортированы в аккаунт.");
  }

  function clearLocalLocations() {
    localStorage.removeItem(LOCATIONS_STORAGE_KEY);
    setLocalLocations([]);
    if (!accountMode) {
      setLocations([]);
    }
    setImportDismissed(true);
  }

  return (
    <div className="panel locations-panel">
      <div className="locations-toolbar">
        <h2>Места</h2>
        <button type="button" onClick={startCreate}>Добавить место</button>
      </div>

      {loading ? <p className="locations-empty">Загружаем места...</p> : null}
      {!accountMode ? (
        <p className="locations-notice">Вы не вошли в аккаунт. Места сохраняются только в этом браузере.</p>
      ) : null}
      {error ? <p className="locations-error">{error}</p> : null}
      {notice ? <p className="locations-notice">{notice}</p> : null}

      {accountMode && localLocations.length > 0 && !importDismissed && useAccountStorage ? (
        <div className="locations-notice">
          <p>Найдены места, сохранённые в этом браузере. Импортировать их в аккаунт?</p>
          <div className="locations-import-actions">
            <button type="button" onClick={importLocalLocations}>Импортировать</button>
            <button className="sec" type="button" onClick={() => setImportDismissed(true)}>Оставить только в браузере</button>
            <button className="danger" type="button" onClick={clearLocalLocations}>Удалить локальные места</button>
          </div>
        </div>
      ) : null}

      <div className="locations-filters">
        <label className="locations-search-field">
          <span className="lab">Поиск</span>
          <input type="search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </label>
        <label>
          <span className="lab">Сервер</span>
          <select value={filters.server} onChange={(event) => setFilters({ ...filters, server: event.target.value })}>
            <option value="">Все серверы</option>
            {serverOptions.map((server) => <option key={server} value={server}>{server}</option>)}
          </select>
        </label>
        <label>
          <span className="lab">Мир</span>
          <select value={filters.world} onChange={(event) => setFilters({ ...filters, world: event.target.value })}>
            <option value="">Все миры</option>
            {LOCATION_WORLDS.map((world) => <option key={world} value={world}>{LOCATION_WORLD_LABELS[world]}</option>)}
          </select>
        </label>
        <label>
          <span className="lab">Тип</span>
          <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
            <option value="">Все типы</option>
            {LOCATION_TYPES.map((type) => <option key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
      </div>

      {editing ? (
        <div className="locations-form">
          <div className="locations-form-grid">
            <label>
              <span className="lab">Название</span>
              <input type="text" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            {servers.length ? (
              <label>
                <span className="lab">Сервер</span>
                <select
                  value={form.serverMode === "custom" ? "__custom" : form.server}
                  onChange={(event) => setForm({
                    ...form,
                    serverMode: event.target.value === "__custom" ? "custom" : "known",
                    server: event.target.value === "__custom" ? "" : event.target.value,
                  })}
                >
                  <option value="">- выбери сервер -</option>
                  {servers.map((server) => <option key={server.id} value={server.name}>{server.name}</option>)}
                  <option value="__custom">Другой сервер</option>
                </select>
              </label>
            ) : null}
            {form.serverMode === "custom" || !servers.length ? (
              <label>
                <span className="lab">Сервер</span>
                <input type="text" value={form.customServer} onChange={(event) => setForm({ ...form, customServer: event.target.value })} />
              </label>
            ) : null}
            <label>
              <span className="lab">Мир</span>
              <select value={form.world} onChange={(event) => setForm({ ...form, world: event.target.value as LocationWorld })}>
                {LOCATION_WORLDS.map((world) => <option key={world} value={world}>{LOCATION_WORLD_LABELS[world]}</option>)}
              </select>
            </label>
            <fieldset className="locations-coordinate-fields">
              <legend>Координаты</legend>
              <label>
                <span className="lab">X</span>
                <input type="number" value={form.x} onChange={(event) => setForm({ ...form, x: event.target.value })} />
              </label>
              <label>
                <span className="lab">Y</span>
                <input type="number" value={form.y} onChange={(event) => setForm({ ...form, y: event.target.value })} />
              </label>
              <label>
                <span className="lab">Z</span>
                <input type="number" value={form.z} onChange={(event) => setForm({ ...form, z: event.target.value })} />
              </label>
            </fieldset>
            <label>
              <span className="lab">Тип</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as LocationType })}>
                {LOCATION_TYPES.map((type) => <option key={type} value={type}>{LOCATION_TYPE_LABELS[type]}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span className="lab">Описание</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="btn-row">
            <button type="button" onClick={saveLocation}>Сохранить место</button>
            <button className="sec" type="button" onClick={() => setEditing(false)}>Отменить</button>
          </div>
        </div>
      ) : null}

      {visibleLocations.length ? (
        <div className="locations-list">
          {visibleLocations.map((location) => (
            <article className="locations-card" key={location.id}>
              <div className="locations-card-head">
                <h3>{location.title}</h3>
                <span>{LOCATION_TYPE_LABELS[location.type]}</span>
              </div>
              <div className="locations-meta">
                <span>{location.server}</span>
                <span>{LOCATION_WORLD_LABELS[location.world]}</span>
              </div>
              <div className="locations-coordinates" aria-label={`Координаты ${formatLocationCoordinates(location)}`}>
                <span><strong>X</strong>{location.x}</span>
                <span><strong>Y</strong>{location.y}</span>
                <span><strong>Z</strong>{location.z}</span>
              </div>
              {location.description ? <p className="locations-description">{location.description}</p> : null}
              <div className="locations-card-actions">
                <button type="button" onClick={() => copyCoordinates(location)}>Скопировать координаты</button>
                <button className="sec" type="button" onClick={() => startEdit(location)}>Редактировать</button>
                <button className="danger" type="button" onClick={() => deleteLocation(location)}>Удалить</button>
              </div>
            </article>
          ))}
        </div>
      ) : !loading ? <p className="locations-empty">Мест пока нет.</p> : null}
    </div>
  );
}
