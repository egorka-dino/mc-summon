import { requireAdminResponse } from "../../../../server/admin-guard";
import { getDatabaseUrlStatus } from "../../../../server/db";
import { deleteLibraryMob, listLibraryMobs, upsertLibraryMob } from "../../../../server/library-mobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requireDatabaseResponse() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "DATABASE_URL не настроен" }, { status: 503 });
  }

  return null;
}

export async function GET() {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  return Response.json({ ok: true, mobs: await listLibraryMobs({ admin: true }) });
}

export async function POST(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  try {
    const mob = await upsertLibraryMob(await request.json());
    return Response.json({ ok: true, mob });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Не удалось сохранить моба" },
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
    return Response.json({ ok: false, error: "Не указан моб" }, { status: 400 });
  }

  await deleteLibraryMob(id);
  return Response.json({ ok: true });
}
