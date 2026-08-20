import { useState } from "react";
import Home from "./components/Home.jsx";
import Simulacro from "./components/Simulacro.jsx";
import Practica from "./components/Practica.jsx";
import Oral from "./components/Oral.jsx";
import Favoritos from "./components/Favoritos.jsx";
import PerfilSelector from "./components/PerfilSelector.jsx";
import { useProgreso } from "./hooks/useProgreso.js";
import { useFavoritos } from "./hooks/useFavoritos.js";
import { MOCK_MODE } from "./api/api.js";

const PERFIL_KEY = "incubadora_perfil";

function cargarPerfilGuardado() {
  try {
    const raw = localStorage.getItem(PERFIL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState("home");
  const [perfil, setPerfil] = useState(cargarPerfilGuardado);
  const [seedPregunta, setSeedPregunta] = useState(null);
  const { progreso, registrar } = useProgreso(perfil?.id);
  const favoritos = useFavoritos(perfil?.id);

  function elegirPerfil(p) {
    setPerfil(p);
    localStorage.setItem(PERFIL_KEY, JSON.stringify(p));
    setView("home");
  }

  function cambiarPerfil() {
    setPerfil(null);
    localStorage.removeItem(PERFIL_KEY);
  }

  function irAHome() {
    setSeedPregunta(null);
    setView("home");
  }

  function generarSimilaresA(favorita) {
    setSeedPregunta(favorita);
    setView("practica");
  }

  return (
    <div className="wrap">
      {MOCK_MODE && (
        <div className="mock-banner">
          Modo demo: preguntas simuladas, sin conexión a la API de Claude
        </div>
      )}
      {!perfil && <PerfilSelector onElegir={elegirPerfil} />}
      {perfil && view === "home" && (
        <Home onNavigate={setView} progreso={progreso} perfilNombre={perfil.nombre} onCambiarPerfil={cambiarPerfil} />
      )}
      {perfil && view === "simulacro" && (
        <Simulacro onBack={irAHome} registrar={registrar} perfilId={perfil.id} favoritos={favoritos} />
      )}
      {perfil && view === "practica" && (
        <Practica
          onBack={irAHome}
          registrar={registrar}
          perfilId={perfil.id}
          favoritos={favoritos}
          seedPregunta={seedPregunta}
        />
      )}
      {perfil && view === "oral" && <Oral onBack={irAHome} />}
      {perfil && view === "favoritos" && (
        <Favoritos onBack={irAHome} favoritos={favoritos} onGenerarSimilares={generarSimilaresA} />
      )}
    </div>
  );
}
