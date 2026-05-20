import { requireAdminResponse } from "../../../server/admin-guard";
import { getDatabaseUrlStatus } from "../../../server/db";
import { listLibraryItems } from "../../../server/library-items";
import { listLibraryMobs } from "../../../server/library-mobs";
import { deleteScenario, listScenarios, upsertScenario } from "../../../server/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requireDatabaseResponse() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "Хранилище сценариев не настроено" }, { status: 503 });
  }

  return null;
}

export async function GET() {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  const [scenarios, items, mobs] = await Promise.all([
    listScenarios(),
    listLibraryItems(),
    listLibraryMobs({ admin: true }),
  ]);

  return Response.json({ ok: true, scenarios, items, mobs });
}

export async function POST(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  try {
    const scenario = await upsertScenario(await request.json());
    return Response.json({ ok: true, scenario });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Не удалось сохранить сценарий" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ ok: false, error: "Не указан сценарий" }, { status: 400 });
  }

  await deleteScenario(id);
  return Response.json({ ok: true });
}
