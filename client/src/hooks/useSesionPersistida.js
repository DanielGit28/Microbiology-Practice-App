import { useState, useEffect, useCallback } from "react";

const PREFIJO = "incubadora_sesion_";

// Guarda el estado de una sesión en progreso (Oral, Práctica o Simulacro) en
// localStorage, por perfil y por modo, para que sobreviva a cambiar de
// página dentro de la app o a cerrar el navegador y volver más tarde.
function cargar(perfilId, modo) {
  if (!perfilId) return null;
  try {
    const raw = localStorage.getItem(PREFIJO + modo + "_" + perfilId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardar(perfilId, modo, sesion) {
  if (!perfilId) return;
  try {
    const key = PREFIJO + modo + "_" + perfilId;
    if (sesion) localStorage.setItem(key, JSON.stringify(sesion));
    else localStorage.removeItem(key);
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, etc.) — no es crítico, solo no persiste.
  }
}

export function useSesionPersistida(perfilId, modo) {
  const [sesion, setSesionState] = useState(() => cargar(perfilId, modo));

  // Si cambia el perfil activo (o al montar), carga la sesión guardada de ese perfil.
  useEffect(() => {
    setSesionState(cargar(perfilId, modo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilId, modo]);

  const setSesion = useCallback(
    (actualizador) => {
      setSesionState((prev) => {
        const next = typeof actualizador === "function" ? actualizador(prev) : actualizador;
        guardar(perfilId, modo, next);
        return next;
      });
    },
    [perfilId, modo]
  );

  const limpiar = useCallback(() => {
    setSesionState(null);
    guardar(perfilId, modo, null);
  }, [perfilId, modo]);

  return { sesion, setSesion, limpiar };
}
