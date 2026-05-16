import { AuthCorner } from "../components/AuthCorner";
import { GiveEditor } from "../components/give/GiveEditor";

export const dynamic = "force-dynamic";

export default function GivePage() {
  return (
    <>
      <header>
        <a href="/" className="nav-back">mc-commands</a>
        <h1 style={{ color: "var(--accent-2)" }}>ГЕНЕРАТОР /GIVE</h1>
        <p>Minecraft Java Edition 1.21.5 и новее · React</p>
        <AuthCorner currentPath="/give" />
      </header>

      <main className="container">
        <GiveEditor />
      </main>

      <footer>v1.0 · /give generator · Minecraft 1.21.5+</footer>
    </>
  );
}
