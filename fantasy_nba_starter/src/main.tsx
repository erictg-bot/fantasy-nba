
import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return (
    <main className="app">
      <h1>Fantasy NBA</h1>
      <p>Tu liga. Tus decisiones. Tu campeonato.</p>
      <section className="login-panel">
        <h2>Bienvenido</h2>
        <p>Próximamente podrás registrarte e iniciar sesión.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
