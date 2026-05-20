type Props = {
  active?: "servers" | "library-items" | "library-mobs" | "scenarios";
};

const adminLinks = [
  { href: "/admin/servers", key: "servers", label: "Серверы Exaroton" },
  { href: "/admin/library/items", key: "library-items", label: "Библиотека предметов" },
  { href: "/admin/library/mobs", key: "library-mobs", label: "Библиотека мобов" },
  { href: "/admin/scenarios", key: "scenarios", label: "Сценарии" },
] as const;

export function AdminNav({ active }: Props) {
  return (
    <section className="admin-section-nav" aria-label="Разделы админки">
      {adminLinks.map((link) => (
        <a
          aria-current={active === link.key ? "page" : undefined}
          className={active === link.key ? "active" : ""}
          href={link.href}
          key={link.key}
        >
          {link.label}
        </a>
      ))}
    </section>
  );
}
