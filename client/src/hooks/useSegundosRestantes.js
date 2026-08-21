import { useState, useEffect } from "react";

// El cronómetro se basa en una hora de cierre real (finalizaEn, un
// timestamp), no en un contador que se detiene al desmontar el componente
// — así, si sales de la página y vuelves, el tiempo restante sigue siendo
// el correcto en vez de reiniciarse o congelarse. totalSegundos es lo que
// se devuelve mientras no hay una sesión activa (finalizaEn nulo).
export function useSegundosRestantes(finalizaEn, totalSegundos) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!finalizaEn) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [finalizaEn]);

  if (!finalizaEn) return totalSegundos;
  return Math.max(0, Math.round((finalizaEn - ahora) / 1000));
}
