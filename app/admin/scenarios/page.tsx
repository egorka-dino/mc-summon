import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminNav } from "../admin-nav";
import { getAuthUser, isAdminFromMetadata, isClerkConfigured } from "../../server/auth";
import { getDatabaseUrlStatus } from "../../server/db";
import { listLibraryItems, type LibraryItem } from "../../server/library-items";
import { listLibraryMobs, type LibraryMob } from "../../server/library-mobs";
import { listScenarios, type Scenario } from "../../server/scenarios";
import { ScenariosClient } from "./scenarios-client";

export const dynamic = "force-dynamic";

export default async function AdminScenariosPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <h1>Сценарии</h1>
          <p>Clerk ещё не настроен: добавь ключи проекта, чтобы включить вход и роли.</p>
        </section>
      </main>
    );
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?redirect_url=/admin/scenarios");
  }

  const authUser = await getAuthUser();
  const isAdmin = isAdminFromMetadata(user);

  if (!isAdmin || !authUser) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-kicker">Доступ закрыт</p>
          <h1>Сценарии</h1>
          <p>Эта страница доступна только пользователям с ролью <code>admin</code> в Clerk.</p>
        </section>
      </main>
    );
  }

  const databaseReady = getDatabaseUrlStatus().configured;
  let scenarios: Scenario[] = [];
  let items: LibraryItem[] = [];
  let mobs: LibraryMob[] = [];

  if (databaseReady) {
    try {
      [scenarios, items, mobs] = await Promise.all([
        listScenarios(),
        listLibraryItems(),
        listLibraryMobs({ admin: true }),
      ]);
    } catch {
      scenarios = [];
      items = [];
      mobs = [];
    }
  }

  return (
    <main className="admin-page">
      <AdminNav active="scenarios" />
      <ScenariosClient
        databaseReady={databaseReady}
        initialItems={items}
        initialMobs={mobs}
        initialScenarios={scenarios}
      />
    </main>
  );
}
