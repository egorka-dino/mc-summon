import { getDatabaseUrlStatus } from "../../../server/db";
import { listSummonTemplates } from "../../../server/summon-templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({
      ok: true,
      source: "database",
      templates: [],
    });
  }

  try {
    return Response.json({
      ok: true,
      source: "database",
      templates: await listSummonTemplates(),
    });
  } catch {
    return Response.json({
      ok: true,
      source: "database",
      templates: [],
    });
  }
}
