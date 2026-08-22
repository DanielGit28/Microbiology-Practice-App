import { useState, useEffect, useCallback } from "react";
import { listarHistorial } from "../api/api.js";

// Historial de preguntas y casos ya respondidos por un perfil (Práctica y
// Simulacro), leído del servidor. Es de solo lectura — a diferencia de
// useFavoritos, aquí no hay agregar/quitar, solo recargar.
export function useHistorial(perfilId) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(() => {
    if (!perfilId) {
      setHistorial([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    listarHistorial(perfilId)
      .then((data) => {
        setHistorial(data || []);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [perfilId]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { historial, cargando, error, recargar };
}
