import { useState } from "react";
import Header from "./Header.jsx";
import Dial from "./Dial.jsx";
import { ORAL_TOTAL_SECS } from "../data/areas.js";
import { generarPreguntasOrales, evaluarRespuestaOral } from "../api/api.js";
import { useCountdown } from "../hooks/useCountdown.js";

export default function Oral({ onBack }) {
  const [status, setStatus] = useState("idle"); // idle | loading | active | error
  const [preguntas, setPreguntas] = useState([]);
  const [respuestasTexto, setRespuestasTexto] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loadingEval, setLoadingEval] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const countdown = useCountdown(ORAL_TOTAL_SECS);

  function iniciar() {
    setStatus("loading");
    setLoadError(null);
    generarPreguntasOrales()
      .then((qs) => {
        setPreguntas(qs);
        setRespuestasTexto(qs.map(() => ""));
        setEvaluaciones(qs.map(() => null));
        setLoadingEval(qs.map(() => false));
        setStatus("active");
        countdown.reset(ORAL_TOTAL_SECS);
        countdown.start();
      })
      .catch((err) => {
        setStatus("error");
        setLoadError("No se pudieron generar las preguntas orales. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function actualizarTexto(i, valor) {
    setRespuestasTexto((prev) => prev.map((t, idx) => (idx === i ? valor : t)));
  }

  function evaluar(i) {
    setLoadingEval((prev) => prev.map((v, idx) => (idx === i ? true : v)));
    evaluarRespuestaOral(preguntas[i], respuestasTexto[i])
      .then((res) => {
        setEvaluaciones((prev) => prev.map((e, idx) => (idx === i ? res : e)));
        setLoadingEval((prev) => prev.map((v, idx) => (idx === i ? false : v)));
      })
      .catch(() => {
        setLoadingEval((prev) => prev.map((v, idx) => (idx === i ? false : v)));
        setEvaluaciones((prev) =>
          prev.map((e, idx) => (idx === i ? { error: true, msg: "No se pudo evaluar la respuesta. Intenta de nuevo." } : e))
        );
      });
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Modo oral
      </p>

      {status === "idle" && (
        <div className="panel">
          <h2>Antes de empezar</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)" }}>
            3 preguntas abiertas de áreas al azar, como en el tribunal real. Escribe (o dicta) tu respuesta como
            si la estuvieras diciendo en voz alta, y pide retroalimentación cuando termines cada una.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Generar 3 preguntas
            </button>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando preguntas orales…
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="panel">
          <div className="error-box">{loadError}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {status === "active" && (
        <>
          <div
            className="panel"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Tribunal simulado</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
                Responde las 3 preguntas a tu ritmo.
              </p>
            </div>
            <Dial seconds={countdown.seconds} totalSeconds={ORAL_TOTAL_SECS} color="var(--culture)" />
          </div>

          {preguntas.map((p, i) => {
            const ev = evaluaciones[i];
            return (
              <div className="panel" key={i}>
                <div className="area-header">
                  <span className="tag">{p.area}</span>
                  <span className="tag normal">Pregunta {i + 1}</span>
                </div>
                <p className="q-text">{p.pregunta}</p>
                <textarea
                  className="textarea-field"
                  placeholder="Escribe aquí lo que responderías en voz alta…"
                  value={respuestasTexto[i] || ""}
                  onChange={(e) => actualizarTexto(i, e.target.value)}
                />
                <div className="btn-row">
                  <button className="btn btn-primary btn-sm" disabled={loadingEval[i]} onClick={() => evaluar(i)}>
                    {loadingEval[i] ? "Evaluando…" : "Evaluar mi respuesta"}
                  </button>
                </div>

                {ev && ev.error && <div className="error-box">{ev.msg}</div>}

                {ev && !ev.error && (
                  <div className="callout callout-exp">
                    <strong>Nota estimada del tribunal: {ev.nota_estimada}</strong>
                    <p style={{ fontWeight: 700, marginTop: 8 }}>Fortalezas</p>
                    <ul className="puntos-clave">
                      {ev.fortalezas.map((f, fi) => (
                        <li key={fi}>{f}</li>
                      ))}
                    </ul>
                    <p style={{ fontWeight: 700, marginTop: 8 }}>Por mejorar</p>
                    <ul className="puntos-clave">
                      {ev.areas_mejora.map((f, fi) => (
                        <li key={fi}>{f}</li>
                      ))}
                    </ul>
                    <p style={{ marginTop: 8 }}>{ev.comentario_general}</p>
                  </div>
                )}

                <details style={{ marginTop: 10, fontSize: "12.5px", color: "var(--muted)" }}>
                  <summary style={{ cursor: "pointer" }}>Ver puntos clave esperados</summary>
                  <ul className="puntos-clave">
                    {p.puntos_clave.map((k, ki) => (
                      <li key={ki}>{k}</li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={iniciar}>
              Generar otras 3 preguntas
            </button>
          </div>
        </>
      )}
    </>
  );
}
