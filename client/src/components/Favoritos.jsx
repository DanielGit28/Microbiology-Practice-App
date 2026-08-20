import Header from "./Header.jsx";
import { areaById } from "../data/areas.js";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function Favoritos({ onBack, favoritos, onGenerarSimilares }) {
  const { favoritos: lista, cargando, error, quitarPorFavoritoId } = favoritos;

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Favoritos
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Preguntas que guardaste desde Práctica o el Simulacro. Desde aquí puedes volver a verlas o pedir preguntas
        nuevas parecidas a una de ellas.
      </p>

      {cargando && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Cargando favoritos…
          </div>
        </div>
      )}

      {error && (
        <div className="panel">
          <div className="error-box">{error}</div>
        </div>
      )}

      {!cargando && !error && lista.length === 0 && (
        <p className="empty-note">Aún no tienes preguntas favoritas. Guárdalas desde Práctica o el Simulacro.</p>
      )}

      {!cargando &&
        lista.map((f) => {
          const area = areaById(f.area_id);
          return (
            <div className="panel oral-block" key={f.favorito_id}>
              <div className="area-header">
                <span className="tag">{area ? area.name : f.area_id}</span>
                <span className={"tag " + (f.dificultad === "kevin" ? "kevin" : "normal")}>
                  {f.dificultad === "kevin" ? "🔥 Kevin" : "Estándar"}
                </span>
              </div>
              <p className="q-text" style={{ fontSize: 14 }}>
                {f.pregunta}
              </p>
              <div className="opciones">
                {f.opciones.map((op, oi) => {
                  let cls = "opcion disabled";
                  if (oi === f.respuesta_correcta) cls += " correcta";
                  return (
                    <div className={cls} key={oi}>
                      <span className="opcion-letra">{LETRAS[oi]}</span>
                      <span className="opcion-texto">{op}</span>
                    </div>
                  );
                })}
              </div>
              {f.explicacion && (
                <div className="callout callout-exp">
                  <strong>Explicación</strong>
                  {f.explicacion}
                </div>
              )}
              <div className="btn-row">
                <button className="btn btn-primary btn-sm" onClick={() => onGenerarSimilares(f)}>
                  Generar preguntas parecidas
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => quitarPorFavoritoId(f.favorito_id)}>
                  Quitar de favoritos
                </button>
              </div>
            </div>
          );
        })}
    </>
  );
}
