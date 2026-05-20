import { requireAdminResponse } from "../../../../server/admin-guard";
import { getDatabaseUrlStatus } from "../../../../server/db";
import { deleteLibraryItem, listLibraryItems, upsertLibraryItem } from "../../../../server/library-items";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function requireDatabaseResponse() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "Хранилище библиотеки не настроено" }, { status: 503 });
  }

  return null;
}

export async function GET() {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  return Response.json({ ok: true, items: await listLibraryItems() });
}

export async function POST(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  try {
    const item = await upsertLibraryItem(await request.json());
    return Response.json({ ok: true, item });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Не удалось сохранить предмет" },
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
    return Response.json({ ok: false, error: "Не указан предмет" }, { status: 400 });
  }

  await deleteLibraryItem(id);
  return Response.json({ ok: true });
}
