import { useState, useEffect, useCallback } from "react";
import { listarFavoritos, favoritoAgregar, favoritoCasoAgregar, favoritoQuitar } from "../api/api.js";

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

  // Dos tipos de favorito conviven en la misma lista: "pregunta" (suelta,
  // típicamente del Simulacro) y "caso" (un caso clínico completo con sus 3
  // preguntas embebidas, típicamente de Práctica). Se distinguen por f.tipo.
  const esFavorito = useCallback(
    (preguntaId) => favoritos.some((f) => f.tipo === "pregunta" && f.id === preguntaId),
    [favoritos]
  );

  const esFavoritoCaso = useCallback(
    (casoId) => favoritos.some((f) => f.tipo === "caso" && f.id === casoId),
    [favoritos]
  );

  const agregar = useCallback(
    (pregunta, areaId) => {
      if (!perfilId || !pregunta?.id) return;
      favoritoAgregar(perfilId, pregunta.id)
        .then((res) => {
          setFavoritos((prev) =>
            prev.some((f) => f.tipo === "pregunta" && f.id === pregunta.id)
              ? prev
              : [
                  {
                    tipo: "pregunta",
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

  const agregarCaso = useCallback(
    (caso, areaId) => {
      if (!perfilId || !caso?.id) return;
      favoritoCasoAgregar(perfilId, caso.id)
        .then((res) => {
          setFavoritos((prev) =>
            prev.some((f) => f.tipo === "caso" && f.id === caso.id)
              ? prev
              : [
                  {
                    tipo: "caso",
                    favorito_id: res.id,
                    id: caso.id,
                    area_id: areaId,
                    modo: "practica",
                    caso: caso.caso,
                    dificultad: caso.dificultad,
                    preguntas: caso.preguntas
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
      const fav = prev.find((f) => f.tipo === "pregunta" && f.id === preguntaId);
      if (fav) {
        favoritoQuitar(fav.favorito_id).catch((err) =>
          console.error("No se pudo quitar el favorito:", err.message)
        );
      }
      return prev.filter((f) => !(f.tipo === "pregunta" && f.id === preguntaId));
    });
  }, []);

  const quitarCaso = useCallback((casoId) => {
    setFavoritos((prev) => {
      const fav = prev.find((f) => f.tipo === "caso" && f.id === casoId);
      if (fav) {
        favoritoQuitar(fav.favorito_id).catch((err) =>
          console.error("No se pudo quitar el favorito:", err.message)
        );
      }
      return prev.filter((f) => !(f.tipo === "caso" && f.id === casoId));
    });
  }, []);

  const quitarPorFavoritoId = useCallback((favoritoId) => {
    setFavoritos((prev) => prev.filter((f) => f.favorito_id !== favoritoId));
    favoritoQuitar(favoritoId).catch((err) => console.error("No se pudo quitar el favorito:", err.message));
  }, []);

  return {
    favoritos,
    cargando,
    error,
    esFavorito,
    esFavoritoCaso,
    agregar,
    agregarCaso,
    quitar,
    quitarCaso,
    quitarPorFavoritoId
  };
}
