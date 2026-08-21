import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import Dial from "./Dial.jsx";
import { AREAS, SIMULACRO_PLAN, SIMULACRO_TOTAL_SECS } from "../data/areas.js";
import { generarLoteSimulacro } from "../api/api.js";
import { useSesionPersistida } from "../hooks/useSesionPersistida.js";
import { useSegundosRestantes } from "../hooks/useSegundosRestantes.js";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function Simulacro({ onBack, registrar, perfilId, favoritos }) {
  const { sesion, setSesion, limpiar } = useSesionPersistida(perfilId, "simulacro");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const segundosRestantes = useSegundosRestantes(sesion?.finalizaEn, SIMULACRO_TOTAL_SECS);

  async function iniciar() {
    setLoading(true);
    setLoadError(null);

    // Se agrupan las 14 áreas de 2 en 2 para mantener cada llamada a la API
    // liviana (menos riesgo de respuestas truncadas o JSON inválido), y se
    // piden una por una (no en paralelo): la cuenta gratuita de Groq tiene
    // un límite de tokens por minuto y 7 llamadas simultáneas lo revientan.
    const pares = [];
    for (let i = 0; i < SIMULACRO_PLAN.length; i += 2) {
      pares.push(SIMULACRO_PLAN.slice(i, i + 2));
    }

    try {
      const todas = [];
      for (const p of pares) {
        const lote = await generarLoteSimulacro(p, perfilId);
        if (Array.isArray(lote)) todas.push(...lote);
      }
      if (todas.length === 0) throw new Error("No se generaron preguntas.");
      setSesion({
        preguntas: todas,
        respuestas: todas.map(() => null),
        indexActual: 0,
        finalizaEn: Date.now() + SIMULACRO_TOTAL_SECS * 1000,
        finalizado: false
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setLoadError("No se pudo generar el simulacro. " + (err?.message || "Intenta de nuevo."));
    }
  }

  function generarNuevo() {
    limpiar();
    setLoading(false);
    setLoadError(null);
  }

  function finalizar() {
    setSesion((prev) => {
      if (!prev || prev.finalizado) return prev;
      prev.preguntas.forEach((p, i) => {
        const area = AREAS.find((a) => a.name === p.area);
        if (area) registrar(area.id, prev.respuestas[i] === p.respuesta_correcta);
      });
      return { ...prev, finalizado: true };
    });
  }

  // Termina automáticamente cuando el tiempo llega a 0.
  useEffect(() => {
    if (sesion && !sesion.finalizado && sesion.finalizaEn && segundosRestantes === 0) {
      finalizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes]);

  function confirmarFinalizar() {
    const sinResponder = sesion.respuestas.filter((r) => r === null).length;
    if (sinResponder > 0) {
      const ok = window.confirm(
        "Tienes " + sinResponder + " pregunta(s) sin responder. ¿Finalizar de todas formas?"
      );
      if (!ok) return;
    }
    finalizar();
  }

  function seleccionar(i) {
    setSesion((prev) => ({
      ...prev,
      respuestas: prev.respuestas.map((r, idx) => (idx === prev.indexActual ? i : r))
    }));
  }

  function irA(indice) {
    setSesion((prev) => ({ ...prev, indexActual: indice }));
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Simulacro mini
      </p>

      {!sesion && !loading && !loadError && (
        <div className="panel">
          <h2>Antes de empezar</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)" }}>
            21 preguntas repartidas entre las 14 áreas del temario (más peso para las áreas grandes:
            Bacteriología, Micología, Virología, Inmunología, Hematología, Banco de Sangre y Bioquímica). 25
            minutos. No verás si acertaste hasta terminar, igual que en el examen real. Mezcla de preguntas
            estándar y estilo Kevin. Si sales de esta pantalla, tu progreso queda guardado.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Generar y empezar
            </button>
          </div>
        </div>
      )}

      {!sesion && loading && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando 21 preguntas del simulacro…
          </div>
        </div>
      )}

      {!sesion && loadError && (
        <div className="panel">
          <div className="error-box">{loadError}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {sesion &&
        !sesion.finalizado &&
        (() => {
          const p = sesion.preguntas[sesion.indexActual];
          return (
            <div className="panel">
              <div className="q-head">
                <span className="tag">
                  Pregunta {sesion.indexActual + 1} de {sesion.preguntas.length}
                </span>
                <Dial seconds={segundosRestantes} totalSeconds={SIMULACRO_TOTAL_SECS} color="var(--agar)" />
              </div>
              <div className="btn-row" style={{ marginBottom: 8 }}>
                <span className="tag" style={{ display: "inline-block" }}>
                  {p.area}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={generarNuevo}>
                  Generar nuevo
                </button>
              </div>
              <p className="q-text">{p.pregunta}</p>
              <div className="opciones">
                {p.opciones.map((op, i) => (
                  <button
                    key={i}
                    className={"opcion" + (sesion.respuestas[sesion.indexActual] === i ? " selected" : "")}
                    onClick={() => seleccionar(i)}
                  >
                    <span className="opcion-letra">{LETRAS[i]}</span>
                    <span className="opcion-texto">{op}</span>
                  </button>
                ))}
              </div>

              <div className="nav-dots">
                {sesion.preguntas.map((_, i) => (
                  <button
                    key={i}
                    className={
                      "dot" +
                      (sesion.respuestas[i] !== null ? " answered" : "") +
                      (i === sesion.indexActual ? " current" : "")
                    }
                    onClick={() => irA(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="btn-row">
                <button
                  className="btn btn-ghost"
                  disabled={sesion.indexActual === 0}
                  onClick={() => irA(Math.max(0, sesion.indexActual - 1))}
                >
                  &larr; Anterior
                </button>
                {sesion.indexActual < sesion.preguntas.length - 1 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => irA(Math.min(sesion.preguntas.length - 1, sesion.indexActual + 1))}
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

      {sesion &&
        sesion.finalizado &&
        (() => {
          const { preguntas, respuestas } = sesion;
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
                  <button className="btn btn-primary" onClick={generarNuevo}>
                    Generar otro simulacro
                  </button>
                </div>
              </div>

              <div className="panel">
                <h2>Revisión pregunta por pregunta</h2>
                {preguntas.map((p, i) => {
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
