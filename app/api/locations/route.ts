import { getAuthUser } from "../../server/auth";
import {
  deleteUserLocation,
  listUserLocations,
  upsertUserLocation,
} from "../../server/locations";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

async function requireUser() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    const locations = await listUserLocations(user.id);
    return Response.json({ ok: true, locations });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы синхронизировать места.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось загрузить места.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const location = await upsertUserLocation(user.id, body);
    return Response.json({ ok: true, location });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы сохранить место.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось сохранить место.");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) {
      return jsonError("Не указан ID места.");
    }
    await deleteUserLocation(user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return jsonError("Войдите в аккаунт, чтобы удалить место.", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Не удалось удалить место.");
  }
}
