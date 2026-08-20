import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// MOCK_MODE en src/api/api.js solo evita llamar /api/generate (preguntas).
// Los perfiles, el progreso y las respuestas siempre pasan por el servidor
// (server/), así que necesitas tenerlo corriendo aunque MOCK_MODE esté en
// true. Este proxy reenvía /api/* hacia tu servidor local en el puerto 8787,
// sin problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  }
});
