import { currentUser } from "@clerk/nextjs/server";
import { getDatabaseUrlStatus } from "../../../../server/db";
import { isAdminFromMetadata, isClerkConfigured } from "../../../../server/auth";
import {
  deleteSummonTemplate,
  listSummonTemplates,
  upsertSummonTemplate,
} from "../../../../server/summon-templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  if (!isClerkConfigured()) {
    return Response.json({ ok: false, error: "Clerk is not configured" }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminFromMetadata(user)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  return null;
}

export async function GET() {
  const error = await requireAdmin();
  if (error) return error;

  return Response.json({
    ok: true,
    templates: await listSummonTemplates({ admin: true }),
  });
}

export async function POST(request: Request) {
  const error = await requireAdmin();
  if (error) return error;

  try {
    const template = await upsertSummonTemplate(await request.json());
    return Response.json({ ok: true, template });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Не удалось сохранить шаблон" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const error = await requireAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  await deleteSummonTemplate(id);
  return Response.json({ ok: true });
}
