import { getAuthUser } from "../../../server/auth";
import { importUserLocations } from "../../../server/locations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json(
      { ok: false, error: "Войдите в аккаунт, чтобы импортировать места." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const locations = await importUserLocations(user.id, body.locations);
    return Response.json({ ok: true, locations });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Не удалось импортировать места.",
      },
      { status: 400 },
    );
  }
}
