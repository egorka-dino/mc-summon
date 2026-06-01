# Locations design

## Summary

Add a public user feature called "Места" at `/locations`. It lets players save private Minecraft coordinates for bases, portals, chests, farms, structures, danger points, and other important locations.

The code and routes may use the English name `Locations`, but all visible UI text is Russian. The first version does not calculate Nether and Overworld coordinates, does not share locations publicly, and does not add maps, screenshots, teams, or history.

## Goals

- Users can create, view, edit, delete, filter, search, and copy saved places.
- Anonymous users can use the feature through browser `localStorage`.
- Authenticated users can store private places in Neon, scoped to their Clerk user ID.
- Authenticated users can import anonymous browser places into their account.
- The section keeps the current `mc-commands` style: simple panels, compact controls, no heavy new dependencies.

## Non-goals

- Public locations or sharing.
- Team or group locations.
- Permission management beyond "current user owns their own locations".
- Nether to Overworld coordinate conversion.
- `/tp` command generation.
- Screenshot uploads.
- Change history.

## Data model

Location records use English field names internally:

```ts
type LocationType =
  | "Chest"
  | "Portal"
  | "Base"
  | "Structure"
  | "Farm"
  | "Danger"
  | "Other";

type LocationWorld = "Overworld" | "Nether" | "End" | "Other";

type PlayerLocation = {
  id: string;
  userId?: string;
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
```

Russian labels:

- Types: `Chest` -> "Сундук", `Portal` -> "Портал", `Base` -> "База", `Structure` -> "Структура", `Farm` -> "Ферма", `Danger` -> "Опасное место", `Other` -> "Другое".
- Worlds: `Overworld` -> "Обычный мир", `Nether` -> "Незер", `End` -> "Энд", `Other` -> "Другой".

The server table is created lazily, following the existing Neon modules:

```sql
create table if not exists player_locations (
  id text primary key,
  user_id text not null,
  title text not null,
  server text not null,
  world text not null,
  x double precision not null,
  y double precision not null,
  z double precision not null,
  type text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_locations_user_id_idx
  on player_locations (user_id);
```

The server module validates every write and only reads or mutates rows for the current Clerk user ID.

## Storage behavior

### Anonymous users

Anonymous users get a fully working editor backed by `localStorage`.

Local storage key:

```txt
mc-locations:places
```

The page shows this warning:

```txt
Вы не вошли в аккаунт. Места сохраняются только в этом браузере.
```

### Authenticated users

Authenticated users use `/api/locations`, backed by Neon. Each location belongs to the current Clerk user.

If Clerk is not configured or the user is not authenticated, the API returns `401` for account storage and the client stays in local mode.

If `DATABASE_URL` is missing, the authenticated account storage API returns a Russian error. The UI shows the error and keeps the local editor usable instead of crashing the page.

### Import from localStorage

When an authenticated user opens `/locations` and local browser places exist, the page shows:

```txt
Найдены места, сохранённые в этом браузере. Импортировать их в аккаунт?
```

Actions:

- "Импортировать": sends local places to `/api/locations/import`; on success removes imported local places from `localStorage` and reloads the account list.
- "Оставить только в браузере": dismisses the import prompt for the current browser session without deleting local places.
- "Удалить локальные места": clears `mc-locations:places`.

The import endpoint normalizes and inserts places for the current user. Imported locations get new account IDs so local IDs cannot collide with server rows.

## Server selection

The server field is required.

The page reuses existing server data when available:

- Load published community servers through a public API based on the existing `listPublishedExarotonServers()` logic.
- If published servers are available, show a select with their names and a final "Другой сервер" option.
- If the user selects "Другой сервер", no published server list is available, the Exaroton integration is not configured, or the list is empty, show manual server text input.

This keeps the "reuse existing server list" requirement without making location saving depend on Exaroton availability.

## UI

Route: `/locations`.

Page title:

```txt
МЕСТА
```

Page structure:

- Header with a short Russian description.
- Main panel with "Добавить место" button.
- Filters for server, world, and type.
- Search input over title and description.
- List of location cards.
- Empty state when no locations exist.
- In-page form panel for create/edit, shown above the list when adding or editing a place. The current project does not have a shared modal component, so the first version does not add one.

Card contents:

- Title.
- Server.
- World.
- Coordinates as `X Y Z`.
- Type.
- Description, only when filled.
- "Скопировать координаты".
- "Редактировать".
- "Удалить".

Copy format:

```txt
123 64 -456
```

No `/tp` command is generated in the first version.

## Form and validation

Fields:

- "Название"
- "Сервер"
- "Мир"
- "X"
- "Y"
- "Z"
- "Тип"
- "Описание"

Validation messages:

- "Введите название"
- "Выберите сервер"
- "Выберите мир"
- "Введите координату X"
- "Введите координату Y"
- "Введите координату Z"
- "Координата должна быть числом"
- "Выберите тип места"

Coordinates accept finite numbers. Decimal coordinates are allowed because Minecraft positions can be decimal, though examples can use integers.

## API

Add public authenticated endpoints:

- `GET /api/locations`: returns current user's locations.
- `POST /api/locations`: creates or updates one current-user location.
- `DELETE /api/locations?id=...`: deletes one current-user location.
- `POST /api/locations/import`: imports an array of local places into the current account.

Add a public server-list endpoint for the location page:

- `GET /api/servers/public`: returns published community servers or an empty list/error state.

The location endpoints use `getAuthUser()`, lazy Neon initialization through `getSql()`, and Russian errors. They never accept a `userId` from the client.

## Components

Add:

- `app/locations/page.tsx`: server component shell for the page.
- `app/components/locations/LocationsEditor.tsx`: client component for loading auth status, storage mode, form state, filters, list, copying, and import prompt.
- `app/components/locations/data.ts`: type/world labels, validation helpers, local-storage key, and normalization helpers.
- `app/server/locations.ts`: Neon table creation, validation, list/upsert/delete/import functions.
- `app/api/locations/route.ts`: list, create/update, delete.
- `app/api/locations/import/route.ts`: import local places.
- `app/api/servers/public/route.ts`: published server list for public UI reuse.

Keep `LocationsEditor` focused by moving pure validation and normalization into `data.ts` and server persistence into `app/server/locations.ts`.

## Navigation and landing

- Add "Места" to `SiteNav`.
- Add a "МЕСТА" card to the landing page.
- Add a new top release date to "Что нового" because this is visible to regular non-admin users.

## Documentation

Update in the same implementation:

- `docs/user-functionality.md`: public `/locations` behavior, anonymous storage, account storage, import, filters, copy format.
- `docs/developer-documentation.md`: route, storage key, table, API endpoints, auth behavior, server-list reuse.

## Testing

Use test-first implementation for pure behavior:

- Validation rejects missing required fields with Russian messages.
- Validation rejects non-numeric coordinates.
- Normalization maps local/imported data to a safe `PlayerLocation` shape.
- Server-side ownership helpers do not accept client-provided `userId`.
- Local import payload creates normalized account rows with fresh IDs.

Run at least:

```bash
npm run build
```

If UI changes are implemented, also start the local dev server and verify `/locations` in the browser. Per repository instructions, because this is a significant public UI feature, create a Vercel preview deployment and verify the preview URL after local checks.

## Telegram note

This is a user-visible feature. After implementation, offer to publish a Telegram announcement to the user group through `mc-tg-group-notifier`, but do not send anything without explicit confirmation.
