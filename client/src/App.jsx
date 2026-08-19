import { useState } from "react";
import Home from "./components/Home.jsx";
import Simulacro from "./components/Simulacro.jsx";
import Practica from "./components/Practica.jsx";
import Oral from "./components/Oral.jsx";
import { useProgreso } from "./hooks/useProgreso.js";
import { MOCK_MODE } from "./api/api.js";

export default function App() {
  const [view, setView] = useState("home");
  const { progreso, registrar } = useProgreso();

  return (
    <div className="wrap">
      {MOCK_MODE && (
        <div className="mock-banner">
          Modo demo: preguntas simuladas, sin conexión a la API de Claude
        </div>
      )}
      {view === "home" && <Home onNavigate={setView} progreso={progreso} />}
      {view === "simulacro" && <Simulacro onBack={() => setView("home")} registrar={registrar} />}
      {view === "practica" && <Practica onBack={() => setView("home")} registrar={registrar} />}
      {view === "oral" && <Oral onBack={() => setView("home")} />}
    </div>
  );
}
