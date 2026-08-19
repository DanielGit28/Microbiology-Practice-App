import { useState } from "react";
import Header from "./Header.jsx";
import { AREAS, areaById } from "../data/areas.js";
import { generarPreguntaPractica, generarExplicacionExtendida } from "../api/api.js";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function Practica({ onBack, registrar }) {
  const [areaId, setAreaId] = useState(AREAS[0].id);
  const [kevin, setKevin] = useState(false);
  const [pregunta, setPregunta] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [respondido, setRespondido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarPista, setMostrarPista] = useState(false);
  const [explicacionExtendida, setExplicacionExtendida] = useState(null);
  const [loadingExplicacion, setLoadingExplicacion] = useState(false);

  const area = areaById(areaId);

  function nuevaPregunta() {
    setLoading(true);
    setError(null);
    setPregunta(null);
    setSeleccion(null);
    setRespondido(false);
    setMostrarPista(false);
    setExplicacionExtendida(null);

    generarPreguntaPractica(area, kevin)
      .then((q) => {
        setPregunta(q);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setError("No se pudo generar la pregunta. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function confirmar() {
    if (seleccion === null) return;
    setRespondido(true);
    registrar(areaId, seleccion === pregunta.respuesta_correcta);
  }

  function pedirExplicacion() {
    setLoadingExplicacion(true);
    generarExplicacionExtendida(area, pregunta)
      .then((texto) => {
        setExplicacionExtendida(texto.trim());
        setLoadingExplicacion(false);
      })
      .catch(() => {
        setLoadingExplicacion(false);
        setExplicacionExtendida("No se pudo generar la explicación extendida. Intenta de nuevo.");
      });
  }

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Práctica por área
      </p>

      <div className="panel">
        <label className="field-label" htmlFor="sel-area">
          Área
        </label>
        <select
          id="sel-area"
          className="select-field"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            setPregunta(null);
            setError(null);
          }}
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.codigo} · {a.name}
            </option>
          ))}
        </select>
        <label className="checkbox-row">
          <input type="checkbox" checked={kevin} onChange={(e) => setKevin(e.target.checked)} />
          Modo Kevin (dificultad extra desde el inicio)
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={nuevaPregunta}>
            {pregunta ? "Nueva pregunta" : "Generar pregunta"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando pregunta de {area.name}…
          </div>
        </div>
      )}

      {error && (
        <div className="panel">
          <div className="error-box">{error}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={nuevaPregunta}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {pregunta && !loading && (
        <div className="panel">
          <div className="area-header">
            <span className="tag">{area.name}</span>
            <span className={"tag " + (pregunta.dificultad === "kevin" ? "kevin" : "normal")}>
              {pregunta.dificultad === "kevin" ? "🔥 Kevin" : "Estándar"}
            </span>
          </div>
          <p className="q-text">{pregunta.pregunta}</p>
          <div className="opciones">
            {pregunta.opciones.map((op, i) => {
              let cls = "opcion";
              if (respondido) {
                cls += " disabled";
                if (i === pregunta.respuesta_correcta) cls += " correcta";
                else if (i === seleccion) cls += " incorrecta";
              } else if (seleccion === i) {
                cls += " selected";
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={respondido}
                  onClick={() => !respondido && setSeleccion(i)}
                >
                  <span className="opcion-letra">{LETRAS[i]}</span>
                  <span className="opcion-texto">{op}</span>
                </button>
              );
            })}
          </div>

          {!respondido ? (
            <>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" onClick={() => setMostrarPista((v) => !v)}>
                  {mostrarPista ? "Ocultar pista" : "Ver pista"}
                </button>
                <button className="btn btn-primary" disabled={seleccion === null} onClick={confirmar}>
                  Confirmar respuesta
                </button>
              </div>
              {mostrarPista && (
                <div className="callout callout-hint">
                  <strong>Pista</strong>
                  {pregunta.pista}
                </div>
              )}
            </>
          ) : (
            <>
              <div
                className="callout callout-exp"
                style={{
                  borderColor: seleccion === pregunta.respuesta_correcta ? "var(--culture)" : "var(--safranin)"
                }}
              >
                <strong>{seleccion === pregunta.respuesta_correcta ? "Correcto" : "Incorrecto"} — Explicación</strong>
                {pregunta.explicacion}
              </div>
              {explicacionExtendida && (
                <div className="callout callout-exp">
                  <strong>Para entenderlo mejor</strong>
                  {explicacionExtendida
                    .split("\n")
                    .filter((p) => p.trim())
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                </div>
              )}
              <div className="btn-row">
                {!explicacionExtendida && (
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={loadingExplicacion}
                    onClick={pedirExplicacion}
                  >
                    {loadingExplicacion ? "Generando…" : "Quiero entender mejor este tema"}
                  </button>
                )}
                <button className="btn btn-primary" onClick={nuevaPregunta}>
                  Siguiente pregunta
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!pregunta && !loading && !error && (
        <p className="empty-note">Elige un área y genera tu primera pregunta.</p>
      )}
    </>
  );
}
