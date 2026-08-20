// Punto de entrada para Vercel: envuelve la app de Express de server/index.js
// como función serverless. vercel.json reenvía /api/(.*) hacia esta misma
// función, y Express se encarga del ruteo interno (/api/perfiles, etc.) con
// la URL original — no hay que duplicar rutas aquí.
import app from "../server/index.js";

export default app;
