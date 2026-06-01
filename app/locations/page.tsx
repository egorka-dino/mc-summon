import { LocationsEditor } from "../components/locations/LocationsEditor";

export const dynamic = "force-dynamic";

export default function LocationsPage() {
  return (
    <>
      <header>
        <h1>МЕСТА</h1>
        <p>Личные координаты Minecraft: базы, порталы, сундуки, фермы и важные точки</p>
      </header>

      <main>
        <section className="container landing-container">
          <LocationsEditor />
        </section>
      </main>

      <footer>v1.0 · Minecraft Java Edition 1.21.5+</footer>
    </>
  );
}
