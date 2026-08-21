import { useState, useEffect } from "react";
import Header from "./Header.jsx";
import { AREAS, areaById } from "../data/areas.js";
import { generarCasoPractica, generarExplicacionExtendida } from "../api/api.js";
import { useSesionPersistida } from "../hooks/useSesionPersistida.js";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function Practica({ onBack, registrar, perfilId, favoritos, seedPregunta }) {
  const { sesion, setSesion, limpiar } = useSesionPersistida(perfilId, "practica");
  const [areaId, setAreaId] = useState(() => sesion?.areaId || (seedPregunta ? seedPregunta.area_id : AREAS[0].id));
  const [kevin, setKevin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pistaVisible, setPistaVisible] = useState(() => new Set());
  const [explicacionCargando, setExplicacionCargando] = useState(() => new Set());

  const area = areaById(areaId);

  // Si se llega desde "Generar preguntas parecidas" en Favoritos, esa
  // favorita manda: se descarta cualquier caso guardado de una sesión
  // anterior y se preselecciona el área correspondiente.
  useEffect(() => {
    if (seedPregunta) {
      limpiar();
      setAreaId(seedPregunta.area_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nuevoCaso() {
    setLoading(true);
    setError(null);
    setPistaVisible(new Set());
    setExplicacionCargando(new Set());

    generarCasoPractica(area, kevin, perfilId, seedPregunta)
      .then((c) => {
        setSesion({
          areaId,
          kevin,
          caso: c,
          seleccion: c.preguntas.map(() => null),
          respondido: c.preguntas.map(() => false),
          explicacionExtendida: c.preguntas.map(() => null)
        });
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setError("No se pudo generar el caso clínico. " + (err?.message || "Intenta de nuevo."));
      });
  }

  function elegir(i, op) {
    if (sesion.respondido[i]) return;
    setSesion((prev) => ({ ...prev, seleccion: prev.seleccion.map((v, idx) => (idx === i ? op : v)) }));
  }

  function confirmar(i) {
    if (sesion.seleccion[i] === null) return;
    setSesion((prev) => ({ ...prev, respondido: prev.respondido.map((v, idx) => (idx === i ? true : v)) }));
    registrar(sesion.areaId, sesion.seleccion[i] === sesion.caso.preguntas[i].respuesta_correcta);
  }

  function togglePista(i) {
    setPistaVisible((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function pedirExplicacion(i) {
    setExplicacionCargando((prev) => new Set(prev).add(i));
    generarExplicacionExtendida(areaById(sesion.areaId), sesion.caso.preguntas[i], sesion.caso.caso)
      .then((texto) => {
        setSesion((prev) => ({
          ...prev,
          explicacionExtendida: prev.explicacionExtendida.map((v, idx) => (idx === i ? texto.trim() : v))
        }));
        setExplicacionCargando((prev) => {
          const next = new Set(prev);
          next.delete(i);
          return next;
        });
      })
      .catch(() => {
        setExplicacionCargando((prev) => {
          const next = new Set(prev);
          next.delete(i);
          return next;
        });
        setSesion((prev) => ({
          ...prev,
          explicacionExtendida: prev.explicacionExtendida.map((v, idx) =>
            idx === i ? "No se pudo generar la explicación extendida. Intenta de nuevo." : v
          )
        }));
      });
  }

  const caso = sesion?.caso || null;

  return (
    <>
      <Header onBack={onBack} />
      <p className="eyebrow" style={{ marginBottom: 2 }}>
        Práctica por área — casos clínicos
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
            limpiar();
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
          <button className="btn btn-primary" onClick={nuevoCaso}>
            {caso ? "Nuevo caso" : "Generar caso clínico"}
          </button>
          {caso && (
            <button className="btn btn-ghost" onClick={limpiar}>
              Generar nuevo
            </button>
          )}
        </div>
        {seedPregunta && (
          <div className="callout callout-hint" style={{ marginTop: 14 }}>
            <strong>Basado en una favorita — {areaById(seedPregunta.area_id)?.name || "esta área"}</strong>
            <em>"{seedPregunta.pregunta}"</em>
          </div>
        )}
      </div>

      {loading && (
        <div className="panel">
          <div className="loading-line">
            <span className="spinner" /> Generando caso clínico de {area.name}…
          </div>
        </div>
      )}

      {error && (
        <div className="panel">
          <div className="error-box">{error}</div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={nuevoCaso}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      {caso && !loading && (
        <>
          <div className="panel">
            <div className="area-header">
              <span className="tag">{areaById(sesion.areaId)?.name || sesion.areaId}</span>
              <span className="tag normal">Caso clínico</span>
              {favoritos && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!caso.id}
                  onClick={() =>
                    favoritos.esFavoritoCaso(caso.id)
                      ? favoritos.quitarCaso(caso.id)
                      : favoritos.agregarCaso(caso, sesion.areaId)
                  }
                  title={!caso.id ? "No se pudo guardar este caso" : undefined}
                >
                  {favoritos.esFavoritoCaso(caso.id) ? "★ Caso favorito" : "☆ Guardar caso en favoritos"}
                </button>
              )}
            </div>
            <p className="q-text" style={{ fontWeight: 400 }}>
              {caso.caso}
            </p>
          </div>

          {caso.preguntas.map((pregunta, i) => (
            <div className="panel" key={i}>
              <div className="area-header">
                <span className="tag normal">Pregunta {i + 1} de 3</span>
                <span className={"tag " + (pregunta.dificultad === "kevin" ? "kevin" : "normal")}>
                  {pregunta.dificultad === "kevin" ? "🔥 Kevin" : "Estándar"}
                </span>
              </div>
              <p className="q-text">{pregunta.pregunta}</p>
              <div className="opciones">
                {pregunta.opciones.map((op, oi) => {
                  let cls = "opcion";
                  if (sesion.respondido[i]) {
                    cls += " disabled";
                    if (oi === pregunta.respuesta_correcta) cls += " correcta";
                    else if (oi === sesion.seleccion[i]) cls += " incorrecta";
                  } else if (sesion.seleccion[i] === oi) {
                    cls += " selected";
                  }
                  return (
                    <button key={oi} className={cls} disabled={sesion.respondido[i]} onClick={() => elegir(i, oi)}>
                      <span className="opcion-letra">{LETRAS[oi]}</span>
                      <span className="opcion-texto">{op}</span>
                    </button>
                  );
                })}
              </div>

              {!sesion.respondido[i] ? (
                <>
                  <div className="btn-row">
                    <button className="btn btn-ghost btn-sm" onClick={() => togglePista(i)}>
                      {pistaVisible.has(i) ? "Ocultar pista" : "Ver pista"}
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={sesion.seleccion[i] === null}
                      onClick={() => confirmar(i)}
                    >
                      Confirmar respuesta
                    </button>
                  </div>
                  {pistaVisible.has(i) && (
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
                      borderColor:
                        sesion.seleccion[i] === pregunta.respuesta_correcta ? "var(--culture)" : "var(--safranin)"
                    }}
                  >
                    <strong>
                      {sesion.seleccion[i] === pregunta.respuesta_correcta ? "Correcto" : "Incorrecto"} — Explicación
                    </strong>
                    {pregunta.explicacion}
                  </div>
                  {sesion.explicacionExtendida[i] && (
                    <div className="callout callout-exp">
                      <strong>Para entenderlo mejor</strong>
                      {sesion.explicacionExtendida[i]
                        .split("\n")
                        .filter((p) => p.trim())
                        .map((p, pi) => (
                          <p key={pi}>{p}</p>
                        ))}
                    </div>
                  )}
                  {!sesion.explicacionExtendida[i] && (
                    <div className="btn-row">
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={explicacionCargando.has(i)}
                        onClick={() => pedirExplicacion(i)}
                      >
                        {explicacionCargando.has(i) ? "Generando…" : "Quiero entender mejor este tema"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={nuevoCaso}>
              Siguiente caso
            </button>
          </div>
        </>
      )}

      {!caso && !loading && !error && (
        <p className="empty-note">Elige un área y genera tu primer caso clínico.</p>
      )}
    </>
  );
}
