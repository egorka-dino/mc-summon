import { readFile } from "node:fs/promises";
import { getAuthUser, isClerkConfigured, type AuthUser } from "../server/auth";

type LegacyPage = "home" | "summon" | "give";

const LEGACY_FILES: Record<LegacyPage, URL> = {
  home: new URL("../../index.html", import.meta.url),
  summon: new URL("../../summon.html", import.meta.url),
  give: new URL("../../give.html", import.meta.url),
};

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
};

function normalizeLinks(html: string) {
  return html
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="summon.html"', 'href="/summon"')
    .replaceAll('href="give.html"', 'href="/give"')
    .replaceAll('href="style.css', 'href="/style.css');
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAuthCorner(user: AuthUser, currentPath: string) {
  if (!user) {
    if (!isClerkConfigured()) {
      return `
<div class="auth-corner">
  <span class="auth-text">Clerk-вход почти готов: осталось заполнить ключи проекта.</span>
</div>`;
    }

    const callbackUrl = encodeURIComponent(currentPath);

    return `
<div class="auth-corner">
  <a class="auth-button" href="/sign-in?redirect_url=${callbackUrl}">Войти через Google</a>
</div>`;
  }

  const name = escapeHtml(user.name);
  const image = user.imageUrl
    ? `<img src="${escapeHtml(user.imageUrl)}" alt="" class="auth-avatar">`
    : "";
  const callbackUrl = encodeURIComponent(currentPath);
  const adminLink = user.isAdmin
    ? `<a class="auth-link admin-link" href="/admin">Админка</a>`
    : "";

  return `
<div class="auth-corner signed-in">
  <span class="auth-user">${image}<span>${name}</span></span>
  ${adminLink}
  <a class="auth-link" href="/sign-out?redirect_url=${callbackUrl}">Выйти</a>
</div>`;
}

function injectAuthCorner(html: string, user: AuthUser, currentPath: string) {
  return html.replace("</header>", `${renderAuthCorner(user, currentPath)}\n</header>`);
}

export async function legacyHtmlResponse(page: LegacyPage, currentPath: string) {
  const html = await readFile(LEGACY_FILES[page], "utf8");
  const user = await getAuthUser();
  const pageHtml = injectAuthCorner(normalizeLinks(html), user, currentPath);

  return new Response(pageHtml, { headers: HTML_HEADERS });
}
