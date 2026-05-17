import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAuthUser, isAdminFromMetadata, isClerkConfigured } from "../../server/auth";
import { listExarotonServers } from "../../server/exaroton";
import { listExarotonServerPublications } from "../../server/exaroton-publications";
import { AdminNav } from "../admin-nav";
import { ExarotonServersPanel } from "../exaroton-servers-panel";

export const dynamic = "force-dynamic";

export default async function AdminServersPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <h1>Серверы</h1>
          <p>Clerk ещё не настроен: добавь ключи проекта, чтобы включить вход и роли.</p>
        </section>
      </main>
    );
  }

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/admin/servers");
  }

  const authUser = await getAuthUser();
  const isAdmin = isAdminFromMetadata(user);

  if (!isAdmin || !authUser) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-kicker">Доступ закрыт</p>
          <h1>Серверы</h1>
          <p>
            Эта страница доступна только пользователям с ролью <code>admin</code> в Clerk.
          </p>
        </section>
      </main>
    );
  }

  const [exaroton, publicationSettings] = await Promise.all([
    listExarotonServers(),
    listExarotonServerPublications(),
  ]);

  return (
    <main className="admin-page">
      <AdminNav active="servers" />
      <ExarotonServersPanel exaroton={exaroton} publicationSettings={publicationSettings} />
    </main>
  );
}
