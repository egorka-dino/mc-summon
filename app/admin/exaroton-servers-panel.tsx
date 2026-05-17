"use client";

import { useMemo, useState } from "react";
import type { ExarotonServersResult } from "../server/exaroton";
import type {
  ExarotonPublicationSettingsResult,
  ExarotonServerPublication,
} from "../server/exaroton-publications";

type Props = {
  exaroton: ExarotonServersResult;
  publicationSettings: ExarotonPublicationSettingsResult;
};

export function ExarotonServersPanel({ exaroton, publicationSettings }: Props) {
  const [publications, setPublications] = useState<ExarotonServerPublication[]>(
    publicationSettings.publications,
  );
  const [busyServerId, setBusyServerId] = useState("");
  const [status, setStatus] = useState("");
  const publishedIds = useMemo(
    () =>
      new Set(
        publications
          .filter((publication) => publication.published)
          .map((publication) => publication.serverId),
      ),
    [publications],
  );
  const canPublish = publicationSettings.configured && publicationSettings.ok;

  async function setPublished(serverId: string, published: boolean) {
    setBusyServerId(serverId);
    setStatus("");

    try {
      const response = await fetch("/api/admin/servers/publication", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serverId, published }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить публикацию");
      }

      setPublications((current) => {
        const other = current.filter((publication) => publication.serverId !== serverId);
        return [...other, data.publication].sort((left, right) =>
          left.serverId.localeCompare(right.serverId),
        );
      });
      setStatus(
        published
          ? "Сервер опубликован на странице серверов."
          : "Сервер снят со страницы серверов.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось сохранить публикацию");
    } finally {
      setBusyServerId("");
    }
  }

  return (
    <section className="admin-panel admin-exaroton" aria-label="Серверы Exaroton">
      <div className="admin-toolbar">
        <div>
          <p className="admin-kicker">Exaroton</p>
          <h2>Серверы и игроки онлайн</h2>
        </div>
        {exaroton.fetchedAt ? (
          <span className="admin-timestamp">
            Обновлено {new Date(exaroton.fetchedAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
      {!publicationSettings.configured ? (
        <p className="admin-warning">
          Добавь <code>DATABASE_URL</code>, чтобы отмечать серверы для публикации на странице
          серверов.
        </p>
      ) : !publicationSettings.ok ? (
        <p className="admin-warning">
          Не удалось получить настройки публикации: {publicationSettings.error}
        </p>
      ) : null}

      {!exaroton.configured ? (
        <p className="admin-warning">
          Добавь <code>EXAROTON_API_KEY</code> в окружение, чтобы видеть серверы.
        </p>
      ) : !exaroton.ok ? (
        <p className="admin-warning">Не удалось получить серверы Exaroton: {exaroton.error}</p>
      ) : exaroton.servers.length ? (
        <div className="admin-server-grid">
          {exaroton.servers.map((server) => (
            <article className="admin-server-card" key={server.id}>
              <div className="admin-server-head">
                <div>
                  <h3>{server.name}</h3>
                  <p>{server.address || server.id}</p>
                </div>
                <span className={`admin-server-status ${server.statusTone}`}>
                  {server.statusLabel}
                </span>
              </div>
              <label className="admin-check admin-server-publish">
                <input
                  checked={publishedIds.has(server.id)}
                  disabled={!canPublish || busyServerId === server.id}
                  type="checkbox"
                  onChange={(event) => setPublished(server.id, event.target.checked)}
                />
                <span>
                  Показывать на главной
                  {busyServerId === server.id ? " · сохраняю..." : ""}
                </span>
              </label>

              <dl className="admin-server-meta">
                <div>
                  <dt>Игроки</dt>
                  <dd>
                    {server.players.count}
                    {server.players.max !== null ? ` / ${server.players.max}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Версия</dt>
                  <dd>
                    {[server.software?.name, server.software?.version]
                      .filter(Boolean)
                      .join(" ") || "Не указана"}
                  </dd>
                </div>
              </dl>

              <div className="admin-player-list" aria-label={`Игроки на ${server.name}`}>
                {server.players.list.length ? (
                  server.players.list.map((player) => <span key={player}>{player}</span>)
                ) : server.players.count > 0 && !server.players.listAvailable ? (
                  <em>Онлайн {server.players.count}, список игроков не отдан API</em>
                ) : (
                  <em>Сейчас никого нет</em>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="admin-warning">У API-ключа пока нет доступных серверов.</p>
      )}
      {status ? <p className="admin-status">{status}</p> : null}
    </section>
  );
}
