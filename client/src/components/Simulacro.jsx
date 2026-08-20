import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import Dial from "./Dial.jsx";
import { AREAS, SIMULACRO_PLAN, SIMULACRO_TOTAL_SECS } from "../data/areas.js";
import { generarLoteSimulacro } from "../api/api.js";
import { useCountdown } from "../hooks/useCountdown.js";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function Simulacro({ onBack, registrar, perfilId, favoritos }) {
  const [status, setStatus] = useState("idle"); // idle | loading | active | finished | error
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [indexActual, setIndexActual] = useState(0);
  const [loadError, setLoadError] = useState(null);

  const countdown = useCountdown(SIMULACRO_TOTAL_SECS);

  function iniciar() {
    setStatus("loading");
    setLoadError(null);

    // Se agrupan las 14 áreas de 2 en 2 para mantener cada llamada a la API
    // liviana (menos riesgo de respuestas truncadas o JSON inválido).
    const pares = [];
    for (let i = 0; i < SIMULACRO_PLAN.length; i += 2) {
      pares.push(SIMULACRO_PLAN.slice(i, i + 2));
    }

    Promise.all(pares.map((p) => generarLoteSimulacro(p, perfilId)))
      .then((lotes) => {
        const todas = [];
        lotes.forEach((l) => {
          if (Array.isArray(l)) todas.push(...l);
        });
        if (todas.length === 0) throw new Error("No se generaron preguntas.");
        setPreguntas(todas);
        setRespuestas(todas.map(() => null));
        setIndexActual(0);
        setStatus("active");
        countdown.reset(SIMULACRO_TOTAL_SECS);
        countdown.start();
      })
      .catch((err) => {
        setStatus("error");
        setLoadError("No se pudo generar el simulacro. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function finalizar() {
    preguntas.forEach((p, i) => {
      const area = AREAS.find((a) => a.name === p.area);
      if (area) registrar(area.id, respuestas[i] === p.respuesta_correcta);
    });
    setStatus("finished");
    countdown.stop();
  }

  // Termina automáticamente cuando el tiempo llega a 0.
  useEffect(() => {
    if (status === "active" && countdown.running && countdown.seconds === 0) {
      finalizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown.seconds]);

  function confirmarFinalizar() {
    const sinResponder = respuestas.filter((r) => r === null).length;
    if (sinResponder > 0) {
      const ok = window.confirm(
        "Tienes " + sinResponder + " pregunta(s) sin responder. ¿Finalizar de todas formas?"
      );
      if (!ok) return;
    }
    finalizar();
  }

  function seleccionar(i) {
    setRespuestas((prev) => prev.map((r, idx) => (idx === indexActual ? i : r)));
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Simulacro mini
      </p>

      {status === "idle" && (
        <div className="panel">
          <h2>Antes de empezar</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)" }}>
            21 preguntas repartidas entre las 14 áreas del temario (más peso para las áreas grandes:
            Bacteriología, Micología, Virología, Inmunología, Hematología, Banco de Sangre y Bioquímica). 25
            minutos. No verás si acertaste hasta terminar, igual que en el examen real. Mezcla de preguntas
            estándar y estilo Kevin.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Generar y empezar
            </button>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando 21 preguntas del simulacro…
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

      {status === "active" &&
        (() => {
          const p = preguntas[indexActual];
          return (
            <div className="panel">
              <div className="q-head">
                <span className="tag">
                  Pregunta {indexActual + 1} de {preguntas.length}
                </span>
                <Dial seconds={countdown.seconds} totalSeconds={SIMULACRO_TOTAL_SECS} color="var(--agar)" />
              </div>
              <span className="tag" style={{ marginBottom: 8, display: "inline-block" }}>
                {p.area}
              </span>
              <p className="q-text">{p.pregunta}</p>
              <div className="opciones">
                {p.opciones.map((op, i) => (
                  <button
                    key={i}
                    className={"opcion" + (respuestas[indexActual] === i ? " selected" : "")}
                    onClick={() => seleccionar(i)}
                  >
                    <span className="opcion-letra">{LETRAS[i]}</span>
                    <span className="opcion-texto">{op}</span>
                  </button>
                ))}
              </div>

              <div className="nav-dots">
                {preguntas.map((_, i) => (
                  <button
                    key={i}
                    className={
                      "dot" +
                      (respuestas[i] !== null ? " answered" : "") +
                      (i === indexActual ? " current" : "")
                    }
                    onClick={() => setIndexActual(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="btn-row">
                <button
                  className="btn btn-ghost"
                  disabled={indexActual === 0}
                  onClick={() => setIndexActual((i) => Math.max(0, i - 1))}
                >
                  &larr; Anterior
                </button>
                {indexActual < preguntas.length - 1 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIndexActual((i) => Math.min(preguntas.length - 1, i + 1))}
                  >
                    Siguiente &rarr;
                  </button>
                )}
                <button className="btn btn-violet" onClick={confirmarFinalizar}>
                  Finalizar simulacro
                </button>
              </div>
            </div>
          );
        })()}

      {status === "finished" &&
        (() => {
          const correctas = preguntas.filter((p, i) => respuestas[i] === p.respuesta_correcta).length;
          return (
            <>
              <div className="panel">
                <p className="score-big">
                  {correctas} / {preguntas.length}
                </p>
                <p className="score-sub">
                  {Math.round((correctas / preguntas.length) * 100)}% correcto en este simulacro
                </p>
                <div className="colonias">
                  {preguntas.map((p, i) => (
                    <span
                      key={i}
                      className={"colonia " + (respuestas[i] === p.respuesta_correcta ? "correcta" : "fallo")}
                      title={p.area}
                    />
                  ))}
                </div>
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={iniciar}>
                    Generar otro simulacro
                  </button>
                </div>
              </div>

              <div className="panel">
                <h2>Revisión pregunta por pregunta</h2>
                {preguntas.map((p, i) => {
                  const ok = respuestas[i] === p.respuesta_correcta;
                  return (
                    <div className="oral-block" key={i}>
                      <div className="area-header">
                        <span className="tag">{p.area}</span>
                        <span className={"tag " + (p.dificultad === "kevin" ? "kevin" : "normal")}>
                          {p.dificultad === "kevin" ? "🔥 Kevin" : "Estándar"}
                        </span>
                        {favoritos && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={!p.id}
                            onClick={() => {
                              const area = AREAS.find((a) => a.name === p.area);
                              favoritos.esFavorito(p.id) ? favoritos.quitar(p.id) : favoritos.agregar(p, area?.id);
                            }}
                            title={!p.id ? "No se pudo guardar esta pregunta" : undefined}
                          >
                            {favoritos.esFavorito(p.id) ? "★ Favorita" : "☆ Guardar en favoritos"}
                          </button>
                        )}
                      </div>
                      <p className="q-text" style={{ fontSize: 14 }}>
                        {i + 1}. {p.pregunta}
                      </p>
                      <div className="opciones">
                        {p.opciones.map((op, oi) => {
                          let cls = "opcion disabled";
                          if (oi === p.respuesta_correcta) cls += " correcta";
                          else if (oi === respuestas[i]) cls += " incorrecta";
                          return (
                            <div className={cls} key={oi}>
                              <span className="opcion-letra">{LETRAS[oi]}</span>
                              <span className="opcion-texto">{op}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="callout callout-exp">
                        <strong>Explicación</strong>
                        {p.explicacion}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
    </>
  );
}
