import { useState, useMemo } from "react";
import Header from "./Header.jsx";
import { AREAS, areaById } from "../data/areas.js";
import { useHistorial } from "../hooks/useHistorial.js";

const LETRAS = ["A", "B", "C", "D", "E"];

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString("es-CR", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

// Muestra una pregunta ya respondida, sin poder volver a contestarla: la
// opción correcta se marca en verde y, si falló, su elección en rojo — es
// un repaso de lo ya hecho, no un nuevo intento (para eso está Práctica).
function PreguntaRespondida({ pregunta }) {
  return (
    <div>
      <p className="q-text" style={{ fontSize: 14 }}>
        {pregunta.pregunta}
      </p>
      <div className="opciones">
        {pregunta.opciones.map((op, oi) => {
          let cls = "opcion disabled";
          if (oi === pregunta.respuesta_correcta) cls += " correcta";
          else if (oi === pregunta.seleccion) cls += " incorrecta";
          return (
            <div className={cls} key={oi}>
              <span className="opcion-letra">{LETRAS[oi]}</span>
              <span className="opcion-texto">{op}</span>
            </div>
          );
        })}
      </div>
      {pregunta.explicacion && (
        <div className="callout callout-exp">
          <strong>Explicación</strong>
          {pregunta.explicacion}
        </div>
      )}
    </div>
  );
}

// Las preguntas orales no se califican (se evalúan con IA al momento, sin
// guardar esa evaluación) — solo se muestra la pregunta y los puntos clave
// esperados, como referencia de repaso, no como resultado.
function PreguntaOral({ pregunta }) {
  return (
    <div>
      <p className="q-text" style={{ fontSize: 14 }}>
        {pregunta.pregunta}
      </p>
      {Array.isArray(pregunta.puntos_clave) && pregunta.puntos_clave.length > 0 && (
        <div className="callout callout-hint">
          <strong>Puntos clave esperados</strong>
          <ul className="puntos-clave">
            {pregunta.puntos_clave.map((k, ki) => (
              <li key={ki}>{k}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Historial({ onBack, perfilId }) {
  const { historial, cargando, error } = useHistorial(perfilId);
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [expandidos, setExpandidos] = useState(() => new Set());

  const lista = useMemo(
    () => (areaFiltro === "todas" ? historial : historial.filter((h) => h.area_id === areaFiltro)),
    [historial, areaFiltro]
  );

  function toggleExpandir(id) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Historial
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Preguntas y casos que ya respondiste en Práctica o el Simulacro, y casos que salieron en el modo oral, más
        recientes primero.
      </p>

      <div className="panel">
        <label className="field-label" htmlFor="sel-area-historial">
          Área
        </label>
        <select
          id="sel-area-historial"
          className="select-field"
          value={areaFiltro}
          onChange={(e) => setAreaFiltro(e.target.value)}
        >
          <option value="todas">Todas las áreas</option>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.codigo} · {a.name}
            </option>
          ))}
        </select>
      </div>

      {cargando && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Cargando historial…
          </div>
        </div>
      )}

      {error && (
        <div className="panel">
          <div className="error-box">{error}</div>
        </div>
      )}

      {!cargando && !error && lista.length === 0 && (
        <p className="empty-note">
          {historial.length === 0
            ? "Aún no has respondido preguntas. Practica o haz un simulacro primero."
            : "No hay preguntas respondidas de esta área todavía."}
        </p>
      )}

      {!cargando &&
        lista.map((h) => {
          const area = areaById(h.area_id);

          if (h.tipo === "caso") {
            const expandido = expandidos.has("caso-" + h.id);
            const correctas = h.preguntas.filter((p) => p.correcto).length;
            return (
              <div className="panel oral-block" key={"caso-" + h.id}>
                <div className="area-header">
                  <span className="tag">{area ? area.name : h.area_id}</span>
                  <span className="tag normal">Caso clínico</span>
                  {h.dificultad === "kevin" && <span className="tag kevin">🔥 Kevin</span>}
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
                    {formatFecha(h.actividad_en)}
                  </span>
                </div>
                <p className="q-text" style={{ fontSize: 14, fontWeight: 400 }}>
                  {h.caso}
                </p>
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleExpandir("caso-" + h.id)}>
                    {expandido
                      ? "Ocultar preguntas"
                      : "Ver " + h.preguntas.length + " pregunta(s) respondida(s) — " + correctas + "/" + h.preguntas.length + " correctas"}
                  </button>
                </div>
                {expandido &&
                  h.preguntas.map((p, pi) => (
                    <div key={p.id || pi} style={{ marginTop: 14 }}>
                      <PreguntaRespondida pregunta={p} />
                    </div>
                  ))}
              </div>
            );
          }

          if (h.tipo === "caso-oral") {
            const expandido = expandidos.has("caso-oral-" + h.id);
            return (
              <div className="panel oral-block" key={"caso-oral-" + h.id}>
                <div className="area-header">
                  <span className="tag">{area ? area.name : h.area_id}</span>
                  <span className="tag normal">Caso oral</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
                    {formatFecha(h.actividad_en)}
                  </span>
                </div>
                <p className="q-text" style={{ fontSize: 14, fontWeight: 400 }}>
                  {h.caso}
                </p>
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleExpandir("caso-oral-" + h.id)}>
                    {expandido ? "Ocultar preguntas" : "Ver " + h.preguntas.length + " pregunta(s)"}
                  </button>
                </div>
                {expandido &&
                  h.preguntas.map((p, pi) => (
                    <div key={p.id || pi} style={{ marginTop: 14 }}>
                      <PreguntaOral pregunta={p} />
                    </div>
                  ))}
              </div>
            );
          }

          return (
            <div className="panel oral-block" key={"pregunta-" + h.respuesta_id}>
              <div className="area-header">
                <span className="tag">{area ? area.name : h.area_id}</span>
                <span className={"tag " + (h.dificultad === "kevin" ? "kevin" : "normal")}>
                  {h.dificultad === "kevin" ? "🔥 Kevin" : "Estándar"}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto" }}>
                  {formatFecha(h.creado_en)}
                </span>
              </div>
              <PreguntaRespondida pregunta={h} />
            </div>
          );
        })}
    </>
  );
}
