import Header from "./Header.jsx";
import ProgresoPanel from "./ProgresoPanel.jsx";

export default function Home({ onNavigate, progreso }) {
  return (
    <>
      <Header />
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
        Tres formas de repasar antes de la Prueba de Grado. Las preguntas se generan al momento, así que nunca
        son exactamente iguales.
      </p>
      <div className="grid-cards">
        <button className="card" onClick={() => onNavigate("simulacro")}>
          <div className="card-top">
            <span className="cap violet" />
            <span className="card-id">MUESTRA-01</span>
          </div>
          <h3 className="card-title">Simulacro mini</h3>
          <p className="card-desc">
            21 preguntas mezcladas de las 14 áreas, 25 min, sin pistas hasta el final. Como el examen real, en
            miniatura.
          </p>
        </button>

        <button className="card" onClick={() => onNavigate("practica")}>
          <div className="card-top">
            <span className="cap agar" />
            <span className="card-id">MUESTRA-02</span>
          </div>
          <h3 className="card-title">Práctica por área</h3>
          <p className="card-desc">
            Elige un área, responde, y recibe explicación al instante. Activa el modo Kevin cuando quieras subir
            la dificultad.
          </p>
        </button>

        <button className="card" onClick={() => onNavigate("oral")}>
          <div className="card-top">
            <span className="cap culture" />
            <span className="card-id">MUESTRA-03</span>
          </div>
          <h3 className="card-title">Modo oral</h3>
          <p className="card-desc">
            3 preguntas abiertas al azar. Escribe o dicta tu respuesta y recibe retroalimentación tipo tribunal.
          </p>
        </button>
      </div>
      <ProgresoPanel progreso={progreso} />
    </>
  );
}
