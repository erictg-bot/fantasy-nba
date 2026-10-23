
import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🏀</span>
          <div>
            <h1>Fantasy NBA</h1>
            <p>Tu liga. Tus decisiones. Tu campeonato.</p>
          </div>
        </div>
        <span className="status">MI TEMPORADA</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">TU PRÓXIMO DESAFÍO EMPIEZA AQUÍ</p>
        <h2>Juega con estrategia.<br />Compite por la gloria.</h2>
        <p>Gestiona tu equipo, sigue las estadísticas y demuestra quién sabe más de NBA.</p>
        <button onClick={() => alert("La creación de ligas estará disponible próximamente.")}>
          + Crear una liga
        </button>
      </section>

      <section className="dashboard">
        <article className="panel">
          <span className="panel-icon">👥</span>
          <h3>Mis ligas</h3>
          <p>Reúnete con tus amigos y empieza a competir.</p>
          <span className="panel-footer">Próximamente</span>
        </article>

        <article className="panel">
          <span className="panel-icon">🏆</span>
          <h3>Clasificación</h3>
          <p>Descubre quién domina la temporada.</p>
          <span className="panel-footer">Próximamente</span>
        </article>

        <article className="panel">
          <span className="panel-icon">📊</span>
          <h3>Estadísticas NBA</h3>
          <p>Consulta partidos y rendimiento de jugadores.</p>
          <span className="panel-footer">En preparación</span>
        </article>
      </section>

      <footer>
        <p>FANTASY NBA · CONSTRUYE TU LEGADO</p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
