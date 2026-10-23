
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";
import "./style.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage(
          data.session
            ? "¡Registro completado! Ya has iniciado sesión."
            : "Registro enviado. Revisa tu correo para confirmar la cuenta."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        setMessage("¡Bienvenido de nuevo!");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    setMessage(error ? error.message : "Has cerrado sesión.");
  }

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

      {userEmail ? (
        <section className="welcome">
          <p className="eyebrow">SESIÓN ACTIVA</p>
          <h2>¡Bienvenido al equipo!</h2>
          <p>Has iniciado sesión como {userEmail}.</p>
          <button onClick={handleSignOut}>Cerrar sesión</button>
        </section>
      ) : (
        <section className="welcome">
          <p className="eyebrow">TU PRÓXIMO DESAFÍO EMPIEZA AQUÍ</p>
          <h2>Juega con estrategia.<br />Compite por la gloria.</h2>
          <p>Accede a Fantasy NBA para prepararte para la competición.</p>

          <form className="auth-form" onSubmit={handleAuth}>
            <h3>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h3>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="password">Contraseña (mínimo 6 caracteres)</label>
            <input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button type="submit" disabled={loading}>
              {loading
                ? "Un momento..."
                : isRegister
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setMessage("");
              }}
            >
              {isRegister
                ? "Ya tengo una cuenta"
                : "Crear una cuenta nueva"}
            </button>

            {message && <p className="auth-message" role="status">{message}</p>}
          </form>
        </section>
      )}

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

createRoot(document.getElementById("root")!).render(<App />);
