import { useState, useEffect, useCallback } from "react";
import { listarFavoritos, favoritoAgregar, favoritoQuitar } from "../api/api.js";

// Preguntas favoritas de un perfil, guardadas en el servidor (Postgres/Neon).
// Igual que useProgreso: se carga al montar/cambiar de perfil, y las
// acciones son optimistas (se ven al instante, no bloquean si el guardado
// tarda o falla).
export function useFavoritos(perfilId) {
  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!perfilId) {
      setFavoritos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    listarFavoritos(perfilId)
      .then((data) => {
        setFavoritos(data || []);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, [perfilId]);

  const esFavorito = useCallback(
    (preguntaId) => favoritos.some((f) => f.id === preguntaId),
    [favoritos]
  );

  const agregar = useCallback(
    (pregunta, areaId) => {
      if (!perfilId || !pregunta?.id) return;
      favoritoAgregar(perfilId, pregunta.id)
        .then((res) => {
          setFavoritos((prev) =>
            prev.some((f) => f.id === pregunta.id)
              ? prev
              : [
                  {
                    favorito_id: res.id,
                    id: pregunta.id,
                    area_id: areaId,
                    pregunta: pregunta.pregunta,
                    opciones: pregunta.opciones,
                    respuesta_correcta: pregunta.respuesta_correcta,
                    explicacion: pregunta.explicacion,
                    pista: pregunta.pista,
                    dificultad: pregunta.dificultad
                  },
                  ...prev
                ]
          );
        })
        .catch((err) => console.error("No se pudo guardar el favorito:", err.message));
    },
    [perfilId]
  );

  const quitar = useCallback((preguntaId) => {
    setFavoritos((prev) => {
      const fav = prev.find((f) => f.id === preguntaId);
      if (fav) {
        favoritoQuitar(fav.favorito_id).catch((err) =>
          console.error("No se pudo quitar el favorito:", err.message)
        );
      }
      return prev.filter((f) => f.id !== preguntaId);
    });
  }, []);

  const quitarPorFavoritoId = useCallback((favoritoId) => {
    setFavoritos((prev) => prev.filter((f) => f.favorito_id !== favoritoId));
    favoritoQuitar(favoritoId).catch((err) => console.error("No se pudo quitar el favorito:", err.message));
  }, []);

  return { favoritos, cargando, error, esFavorito, agregar, quitar, quitarPorFavoritoId };
}
