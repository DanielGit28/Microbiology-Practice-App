import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mientras MOCK_MODE esté en true en src/api/api.js, este proxy no se usa.
// Cuando lo pases a false, esto reenvía las llamadas a /api/* hacia tu
// servidor local (server/) en el puerto 8787, sin problemas de CORS.
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
