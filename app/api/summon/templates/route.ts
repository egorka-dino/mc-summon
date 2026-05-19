import { getDatabaseUrlStatus } from "../../../server/db";
import { listLibraryMobs } from "../../../server/library-mobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({
      ok: true,
      source: "library_mobs",
      templates: [],
    });
  }

  try {
    return Response.json({
      ok: true,
      source: "library_mobs",
      templates: await listLibraryMobs(),
    });
  } catch {
    return Response.json({
      ok: true,
      source: "library_mobs",
      templates: [],
    });
  }
}
