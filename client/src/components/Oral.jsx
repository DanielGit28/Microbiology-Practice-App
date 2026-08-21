import { useState } from "react";
import Header from "./Header.jsx";
import Dial from "./Dial.jsx";
import { AREAS, ORAL_TOTAL_SECS } from "../data/areas.js";
import { generarCasoOral, evaluarRespuestaOral } from "../api/api.js";
import { useSesionPersistida } from "../hooks/useSesionPersistida.js";
import { useSegundosRestantes } from "../hooks/useSegundosRestantes.js";

const TOTAL_CASOS = 3;

function areasAlAzar(cantidad) {
  const copia = [...AREAS];
  const muestra = [];
  for (let i = 0; i < cantidad; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    muestra.push(copia.splice(idx, 1)[0]);
  }
  return muestra;
}

export default function Oral({ onBack, perfilId }) {
  const { sesion, setSesion, limpiar } = useSesionPersistida(perfilId, "oral");
  const [loadingPrimero, setLoadingPrimero] = useState(false);
  const [errorPrimero, setErrorPrimero] = useState(null);
  const [generandoSiguiente, setGenerandoSiguiente] = useState(false);
  const [errorSiguiente, setErrorSiguiente] = useState(null);
  const [evaluando, setEvaluando] = useState(() => new Set());

  const segundosRestantes = useSegundosRestantes(sesion?.finalizaEn, ORAL_TOTAL_SECS);

  // Solo se genera el primer caso al arrancar. Los otros 2 se piden cuando
  // la estudiante decide avanzar (no de una vez): la cuenta gratuita de
  // Groq tiene un límite de tokens por minuto, y pedir los 3 casos seguidos
  // lo agota y obliga a esperar. Así el gasto se reparte en el tiempo real
  // que toma leer y responder cada caso — y como la sesión queda guardada,
  // tampoco hace falta volver a pedir nada si solo cambiaste de página.
  function iniciar() {
    setLoadingPrimero(true);
    setErrorPrimero(null);
    const nuevasAreas = areasAlAzar(TOTAL_CASOS);

    generarCasoOral(nuevasAreas[0])
      .then((caso) => {
        setSesion({
          areas: nuevasAreas,
          casos: [{ ...caso, area: nuevasAreas[0] }],
          respuestasTexto: [caso.preguntas.map(() => "")],
          evaluaciones: [caso.preguntas.map(() => null)],
          finalizaEn: Date.now() + ORAL_TOTAL_SECS * 1000
        });
        setLoadingPrimero(false);
      })
      .catch((err) => {
        setLoadingPrimero(false);
        setErrorPrimero("No se pudo generar el primer caso oral. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function generarNuevo() {
    limpiar();
    setLoadingPrimero(false);
    setErrorPrimero(null);
    setGenerandoSiguiente(false);
    setErrorSiguiente(null);
    setEvaluando(new Set());
  }

  function generarSiguienteCaso() {
    if (!sesion) return;
    const siguienteIndice = sesion.casos.length;
    if (siguienteIndice >= sesion.areas.length) return;
    setGenerandoSiguiente(true);
    setErrorSiguiente(null);
    generarCasoOral(sesion.areas[siguienteIndice])
      .then((caso) => {
        setSesion((prev) => ({
          ...prev,
          casos: [...prev.casos, { ...caso, area: prev.areas[siguienteIndice] }],
          respuestasTexto: [...prev.respuestasTexto, caso.preguntas.map(() => "")],
          evaluaciones: [...prev.evaluaciones, caso.preguntas.map(() => null)]
        }));
        setGenerandoSiguiente(false);
      })
      .catch((err) => {
        setGenerandoSiguiente(false);
        setErrorSiguiente("No se pudo generar el siguiente caso. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function actualizarTexto(ci, qi, valor) {
    setSesion((prev) => ({
      ...prev,
      respuestasTexto: prev.respuestasTexto.map((preguntas, i) =>
        i === ci ? preguntas.map((t, j) => (j === qi ? valor : t)) : preguntas
      )
    }));
  }

  function evaluar(ci, qi) {
    const key = ci + "-" + qi;
    setEvaluando((prev) => new Set(prev).add(key));
    const caso = sesion.casos[ci];
    evaluarRespuestaOral(caso.preguntas[qi], sesion.respuestasTexto[ci][qi], caso.caso)
      .then((res) => {
        setSesion((prev) => ({
          ...prev,
          evaluaciones: prev.evaluaciones.map((evs, i) => (i === ci ? evs.map((e, j) => (j === qi ? res : e)) : evs))
        }));
        setEvaluando((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .catch(() => {
        setEvaluando((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setSesion((prev) => ({
          ...prev,
          evaluaciones: prev.evaluaciones.map((evs, i) =>
            i === ci
              ? evs.map((e, j) =>
                  j === qi ? { error: true, msg: "No se pudo evaluar la respuesta. Intenta de nuevo." } : e
                )
              : evs
          )
        }));
      });
  }

  const faltanCasos = !!sesion && sesion.casos.length < TOTAL_CASOS;

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Modo oral — casos clínicos
      </p>

      {!sesion && !loadingPrimero && !errorPrimero && (
        <div className="panel">
          <h2>Antes de empezar</h2>
          <p style={{ fontSize: "13.5px", color: "var(--muted)" }}>
            3 áreas al azar del temario, como en el tribunal real. Vas a recibir un caso clínico por cada área (3
            casos en total) con 3 preguntas abiertas asociadas a cada uno — 9 preguntas en total. Los casos se van
            generando uno por uno, a tu ritmo: no tienes que esperar a que estén los 3 para empezar, y si sales de
            esta pantalla tu progreso queda guardado. Escribe (o dicta) tu respuesta como si la estuvieras
            diciendo en voz alta, y pide retroalimentación cuando termines cada una. Tienes 30 minutos en total.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Generar primer caso clínico
            </button>
          </div>
        </div>
      )}

      {!sesion && loadingPrimero && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando el primer caso oral…
          </div>
        </div>
      )}

      {!sesion && errorPrimero && (
        <div className="panel">
          <div className="error-box">{errorPrimero}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={iniciar}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {sesion && (
        <>
          <div
            className="panel"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Tribunal simulado</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
                Responde las preguntas de cada caso a tu ritmo. Llevas {sesion.casos.length} de {TOTAL_CASOS} casos.
              </p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={generarNuevo}>
                Generar nuevo
              </button>
            </div>
            <Dial seconds={segundosRestantes} totalSeconds={ORAL_TOTAL_SECS} color="var(--culture)" />
          </div>

          {sesion.casos.map((caso, ci) => (
            <div key={ci}>
              <div className="panel">
                <div className="area-header">
                  <span className="tag">{caso.area.name}</span>
                  <span className="tag normal">
                    Caso {ci + 1} de {TOTAL_CASOS}
                  </span>
                </div>
                <p className="q-text" style={{ fontWeight: 400 }}>
                  {caso.caso}
                </p>
              </div>

              {caso.preguntas.map((p, qi) => {
                const ev = sesion.evaluaciones[ci]?.[qi];
                const cargandoEval = evaluando.has(ci + "-" + qi);
                return (
                  <div className="panel" key={qi}>
                    <div className="area-header">
                      <span className="tag normal">Pregunta {qi + 1} de 3</span>
                    </div>
                    <p className="q-text">{p.pregunta}</p>
                    <textarea
                      className="textarea-field"
                      placeholder="Escribe aquí lo que responderías en voz alta…"
                      value={sesion.respuestasTexto[ci]?.[qi] || ""}
                      onChange={(e) => actualizarTexto(ci, qi, e.target.value)}
                    />
                    <div className="btn-row">
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={cargandoEval}
                        onClick={() => evaluar(ci, qi)}
                      >
                        {cargandoEval ? "Evaluando…" : "Evaluar mi respuesta"}
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
            </div>
          ))}

          {faltanCasos && (
            <div className="panel">
              {errorSiguiente && <div className="error-box">{errorSiguiente}</div>}
              <div className="btn-row">
                <button className="btn btn-primary" disabled={generandoSiguiente} onClick={generarSiguienteCaso}>
                  {generandoSiguiente ? (
                    <>
                      <span className="spinner" /> Generando caso {sesion.casos.length + 1}…
                    </>
                  ) : (
                    "Generar caso " + (sesion.casos.length + 1) + " de " + TOTAL_CASOS
                  )}
                </button>
              </div>
            </div>
          )}

          {!faltanCasos && (
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={generarNuevo}>
                Generar otros 3 casos
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
