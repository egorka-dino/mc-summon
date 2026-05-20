import { requireAdminResponse } from "../../../../server/admin-guard";
import { getDatabaseUrlStatus } from "../../../../server/db";
import { executeScenario } from "../../../../server/scenario-execution";
import { listLibraryItems } from "../../../../server/library-items";
import { listLibraryMobs } from "../../../../server/library-mobs";
import { listScenarios } from "../../../../server/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requireDatabaseResponse() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "Хранилище сценариев не настроено" }, { status: 503 });
  }

  return null;
}

export async function POST(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  const body = asRecord(await request.json().catch(() => null));
  const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId.trim() : "";
  const serverId = typeof body.serverId === "string" ? body.serverId.trim() : "";
  const player = typeof body.player === "string" ? body.player.trim() : "";

  if (!scenarioId) {
    return Response.json({ ok: false, error: "Выберите сценарий" }, { status: 400 });
  }

  try {
    const [scenarios, items, mobs] = await Promise.all([
      listScenarios(),
      listLibraryItems(),
      listLibraryMobs({ admin: true }),
    ]);
    const result = await executeScenario({ scenarioId, scenarios, items, mobs, serverId, player });
    return Response.json({ ok: result.ok, results: result.results }, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Не удалось выполнить сценарий" },
      { status: 400 },
    );
  }
}
