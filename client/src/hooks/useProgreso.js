import { useState, useEffect, useCallback } from "react";

// Progreso compartido entre dispositivos: vive en Postgres (Neon), detrás del
// servidor en server/. Está atado a un perfil (sin autenticación: cualquiera
// puede crear uno o continuar uno existente). Se lee al cargar/cambiar de
// perfil y cada respuesta se manda al servidor en cuanto ocurre. La
// actualización local es "optimista" (se ve al instante en la UI) y no
// bloquea si el guardado tarda o falla.
export function useProgreso(perfilId) {
  const [progreso, setProgreso] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!perfilId) {
      setProgreso({});
      setCargando(false);
      return;
    }
    setCargando(true);
    fetch("/api/progreso?perfilId=" + perfilId)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el progreso (" + r.status + ")");
        return r.json();
      })
      .then((data) => {
        setProgreso(data || {});
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [perfilId]);

  const registrar = useCallback(
    (areaId, correcto, extra) => {
      if (!perfilId) return;

      setProgreso((prev) => {
        const actual = prev[areaId] || { correctas: 0, total: 0 };
        return {
          ...prev,
          [areaId]: {
            correctas: actual.correctas + (correcto ? 1 : 0),
            total: actual.total + 1
          }
        };
      });

      fetch("/api/respuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilId, areaId, correcto, ...extra })
      }).catch((err) => {
        console.error("No se pudo guardar la respuesta en el servidor:", err.message);
      });
    },
    [perfilId]
  );

  return { progreso, registrar, cargando, error };
}
