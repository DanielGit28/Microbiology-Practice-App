import { useState } from "react";
import Header from "./Header.jsx";
import { areaById } from "../data/areas.js";

const LETRAS = ["A", "B", "C", "D", "E"];

// Al expandir un caso favorito, las 3 preguntas se responden como en
// Práctica (hay que elegir y confirmar) en vez de mostrar la respuesta
// correcta de una vez — así sigue sirviendo para repasar, no solo para leer.
function SubpreguntaFavorita({ pregunta, indice }) {
  const [seleccion, setSeleccion] = useState(null);
  const [respondido, setRespondido] = useState(false);

  return (
    <div className="callout callout-exp" style={{ marginTop: 12 }}>
      <strong>Pregunta {indice + 1}</strong>
      <p style={{ margin: "6px 0" }}>{pregunta.pregunta}</p>
      <div className="opciones">
        {pregunta.opciones.map((op, oi) => {
          let cls = "opcion";
          if (respondido) {
            cls += " disabled";
            if (oi === pregunta.respuesta_correcta) cls += " correcta";
            else if (oi === seleccion) cls += " incorrecta";
          } else if (seleccion === oi) {
            cls += " selected";
          }
          return (
            <button key={oi} className={cls} disabled={respondido} onClick={() => setSeleccion(oi)}>
              <span className="opcion-letra">{LETRAS[oi]}</span>
              <span className="opcion-texto">{op}</span>
            </button>
          );
        })}
      </div>
      {!respondido ? (
        <div className="btn-row">
          <button
            className="btn btn-primary btn-sm"
            disabled={seleccion === null}
            onClick={() => setRespondido(true)}
          >
            Confirmar respuesta
          </button>
        </div>
      ) : (
        <p style={{ marginTop: 8 }}>
          <strong>{seleccion === pregunta.respuesta_correcta ? "Correcto — " : "Incorrecto — "}</strong>
          {pregunta.explicacion}
        </p>
      )}
    </div>
  );
}

export default function Favoritos({ onBack, favoritos, onGenerarSimilares }) {
  const { favoritos: lista, cargando, error, quitarPorFavoritoId } = favoritos;
  const [expandidos, setExpandidos] = useState(() => new Set());

  function toggleExpandir(favoritoId) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(favoritoId)) next.delete(favoritoId);
      else next.add(favoritoId);
      return next;
    });
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Favoritos
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Casos y preguntas que guardaste desde Práctica o el Simulacro. Desde aquí puedes volver a verlos o pedir un
        caso o pregunta nuevos parecidos.
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
        <p className="empty-note">Aún no tienes favoritos. Guárdalos desde Práctica o el Simulacro.</p>
      )}

      {!cargando &&
        lista.map((f) => {
          const area = areaById(f.area_id);

          if (f.tipo === "caso") {
            const expandido = expandidos.has(f.favorito_id);
            return (
              <div className="panel oral-block" key={f.favorito_id}>
                <div className="area-header">
                  <span className="tag">{area ? area.name : f.area_id}</span>
                  <span className="tag normal">Caso clínico</span>
                  {f.dificultad === "kevin" && <span className="tag kevin">🔥 Kevin</span>}
                </div>
                <p className="q-text" style={{ fontSize: 14, fontWeight: 400 }}>
                  {f.caso}
                </p>

                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleExpandir(f.favorito_id)}>
                    {expandido ? "Ocultar las 3 preguntas" : "Ver las 3 preguntas"}
                  </button>
                </div>

                {expandido && f.preguntas.map((p, pi) => <SubpreguntaFavorita key={p.id || pi} pregunta={p} indice={pi} />)}

                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!f.preguntas.length}
                    onClick={() => onGenerarSimilares({ area_id: f.area_id, ...f.preguntas[0] })}
                  >
                    Generar caso parecido
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => quitarPorFavoritoId(f.favorito_id)}>
                    Quitar de favoritos
                  </button>
                </div>
              </div>
            );
          }

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
