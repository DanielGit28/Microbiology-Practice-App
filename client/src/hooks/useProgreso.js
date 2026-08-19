import { useState, useEffect, useCallback } from "react";

const KEY = "incubadora-progreso";

export function useProgreso() {
  const [progreso, setProgreso] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progreso));
    } catch (e) {
      // localStorage puede fallar en modo privado/incógnito; no es crítico.
    }
  }, [progreso]);

  const registrar = useCallback((areaId, correcto) => {
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
  }, []);

  return { progreso, registrar };
}
