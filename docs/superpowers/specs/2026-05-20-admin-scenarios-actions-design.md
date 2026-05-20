# Admin Scenarios With Actions Design

## Goal

Добавить в админку раздел «Сценарии», где сценарий хранится как упорядоченный список действий. Первый релиз сценариев доступен только администраторам и не появляется в публичном UI.

## Model

Сценарий хранится в Neon в таблице `scenarios`:

- `id text primary key`;
- `name text not null`;
- `description text not null default ''`;
- `enabled boolean not null default true`;
- `actions jsonb not null`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

Действия:

```ts
type ScenarioAction =
  | { id: string; type: "give_item"; itemId: string; quantity: number }
  | { id: string; type: "summon_mob"; mobId: string; quantity: number; spawn: ScenarioSpawn }
  | { id: string; type: "run_scenario"; scenarioId: string }
  | { id: string; type: "future"; kind: string; payload: Record<string, unknown> };

type ScenarioSpawn =
  | { type: "near-player" }
  | { type: "player" }
  | { type: "coordinates"; coordinates: { x: string; y: string; z: string } };
```

`future` сохраняется в типах, но в UI первой фазы не создаётся и не выполняется.

## Admin UI

`/admin/scenarios` добавляет пункт «Сценарии» в админскую навигацию. Слева список сценариев, справа форма выбранного сценария.

Форма содержит:

- название;
- описание;
- флаг включённости;
- список действий;
- кнопки создать, сохранить, дублировать, удалить;
- блок выполнения сценария.

Действия показываются компактно. Полные `ItemEditor` и `MobEditor` внутри сценария не используются. Для `give_item` выбирается предмет из библиотеки и количество. Для `summon_mob` выбирается моб из библиотеки, количество и место спавна. Для `run_scenario` выбирается другой сценарий.

## Execution

Серверный executor разворачивает сценарий в последовательность действий и выполняет их по порядку на выбранном Exaroton-сервере.

- `give_item` пересобирает `/give` из `library_items`.
- `summon_mob` пересобирает `/summon` из `library_mobs`.
- `run_scenario` рекурсивно выполняет другой сценарий в том же контексте запуска.
- Вложенные сценарии защищены от циклов через `visited` и ограничение глубины `5`.
- При первой ошибке выполнение останавливается, а клиент получает результат по уже выполненным действиям и ошибочное действие.

Контекст запуска: `serverId`, опциональный `player`, координаты по умолчанию для координатных действий. Действия у игрока требуют online-игрока из Exaroton; координатный summon игрока не требует.

## API

- `GET /api/admin/scenarios` — список сценариев, предметов и мобов для редактора.
- `POST /api/admin/scenarios` — создать или обновить сценарий.
- `DELETE /api/admin/scenarios?id=...` — удалить сценарий.
- `POST /api/admin/scenarios/execute` — выполнить сценарий.

Все маршруты доступны только администраторам.

## Documentation And Changelog

Обновляется `docs/developer-documentation.md`. В «Что нового» запись не добавляется, потому что функционал admin-only.
