import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminNav } from "../../admin-nav";
import { LibraryMobsClient } from "./library-mobs-client";
import { getAuthUser, isAdminFromMetadata, isClerkConfigured } from "../../../server/auth";
import { getDatabaseUrlStatus } from "../../../server/db";
import { listLibraryMobs, type LibraryMob } from "../../../server/library-mobs";

export const dynamic = "force-dynamic";

export default async function AdminLibraryMobsPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <h1>Библиотека мобов</h1>
          <p>Clerk ещё не настроен: добавь ключи проекта, чтобы включить вход и роли.</p>
        </section>
      </main>
    );
  }

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/admin/library/mobs");
  }

  const authUser = await getAuthUser();
  const isAdmin = isAdminFromMetadata(user);

  if (!isAdmin || !authUser) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-kicker">Доступ закрыт</p>
          <h1>Библиотека мобов</h1>
          <p>
            Эта страница доступна только пользователям с ролью <code>admin</code> в Clerk.
          </p>
        </section>
      </main>
    );
  }

  const databaseReady = getDatabaseUrlStatus().configured;
  let mobs: LibraryMob[] = [];

  if (databaseReady) {
    try {
      mobs = await listLibraryMobs({ admin: true });
    } catch {
      mobs = [];
    }
  }

  return (
    <main className="admin-page">
      <AdminNav active="library-mobs" />
      <LibraryMobsClient initialMobs={mobs} databaseReady={databaseReady} />
    </main>
  );
}
