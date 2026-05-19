import { currentUser } from "@clerk/nextjs/server";
import { isAdminFromMetadata, isClerkConfigured } from "./auth";

export async function requireAdminResponse() {
  if (!isClerkConfigured()) {
    return Response.json({ ok: false, error: "Clerk не настроен" }, { status: 503 });
  }

  const user = await currentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Войдите в админку" }, { status: 401 });
  }

  if (!isAdminFromMetadata(user)) {
    return Response.json({ ok: false, error: "Доступно только администратору" }, { status: 403 });
  }

  return null;
}
