import { useState, useEffect } from "react";
import Header from "./Header.jsx";

// Sin autenticación: cualquiera puede crear un perfil nuevo o continuar uno
// existente con solo elegirlo de la lista. Pensado para uso entre pocas
// personas de confianza, no para compartir públicamente.
export default function PerfilSelector({ onElegir }) {
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarPerfiles();
  }, []);

  function cargarPerfiles() {
    setCargando(true);
    setError(null);
    fetch("/api/perfiles")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los perfiles (" + r.status + ")");
        return r.json();
      })
      .then((data) => {
        setPerfiles(data || []);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }

  function crearPerfil(e) {
    e.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setCreando(true);
    setError(null);
    fetch("/api/perfiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre })
    })
      .then((r) => {
        if (!r.ok) return r.json().then((b) => Promise.reject(new Error(b.error || "Error creando el perfil")));
        return r.json();
      })
      .then((perfil) => {
        setCreando(false);
        onElegir(perfil);
      })
      .catch((err) => {
        setCreando(false);
        setError(err.message);
      });
  }

  return (
    <>
      <Header />
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Elige tu perfil para guardar tu progreso, o crea uno nuevo. No hace falta contraseña — cualquier perfil
        puede continuarse desde cualquier dispositivo.
      </p>

      {error && (
        <div className="panel">
          <div className="error-box">{error}</div>
        </div>
      )}

      <div className="panel">
        <h2>Perfiles existentes</h2>
        {cargando && (
          <div className="loading-line">
            <span className="spinner" /> Cargando perfiles…
          </div>
        )}
        {!cargando && perfiles.length === 0 && (
          <p className="empty-note" style={{ margin: 0 }}>
            Todavía no hay ningún perfil. Crea el primero abajo.
          </p>
        )}
        {!cargando && perfiles.length > 0 && (
          <div className="btn-row" style={{ marginTop: 0 }}>
            {perfiles.map((p) => (
              <button key={p.id} className="btn btn-ghost" onClick={() => onElegir(p)}>
                {p.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Crear un perfil nuevo</h2>
        <form onSubmit={crearPerfil}>
          <label className="field-label" htmlFor="nombre-perfil">
            Nombre
          </label>
          <input
            id="nombre-perfil"
            className="select-field"
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. María"
            maxLength={60}
          />
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={creando || !nombreNuevo.trim()}>
              {creando ? "Creando…" : "Crear y empezar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
