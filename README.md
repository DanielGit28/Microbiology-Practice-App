# Incubadora · Prep PDG

App de repaso para las Pruebas de Grado de Microbiología y Química Clínica.
3 modos: simulacro mini, práctica por área, y modo oral con evaluación tipo tribunal.

## Estructura

```
incubadora-pdg/
  client/     -> app de React (Vite). Esto es lo que se ve en el navegador.
  server/     -> mini servidor Express que llama a la API de Anthropic.
                 Solo hace falta cuando MOCK_MODE esté en false.
```

## 1. Probar con preguntas simuladas (sin gastar API)

Por defecto la app corre en **modo mock**: las preguntas, pistas, explicaciones
y evaluaciones orales son generadas localmente (con datos de ejemplo, marcadas
con `[MOCK]`), sin llamar a ningún API. Sirve para probar que toda la
navegación, temporizadores, y flujos funcionan bien.

```bash
cd client
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente http://localhost:5173).
Vas a ver un aviso arriba diciendo "Modo demo" mientras esto esté activo.

## 2. Conectar la API real de Claude

Cuando quieras usar preguntas generadas de verdad:

1. Levanta el servidor (guarda tu llave del lado del servidor, nunca en el
   navegador):

   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edita .env y pega tu ANTHROPIC_API_KEY
   npm start
   ```

   Esto deja el servidor escuchando en `http://localhost:8787`.

2. En `client/src/api/api.js`, cambia:

   ```js
   export const MOCK_MODE = true
   ```

   a:

   ```js
   export const MOCK_MODE = false
   ```

3. Corre (o deja corriendo) `npm run dev` en `client/` — Vite ya está
   configurado (`vite.config.js`) para reenviar las llamadas a `/api/...`
   hacia tu servidor local en el puerto 8787, así que no hay problemas de
   CORS ni necesidad de exponer la llave en el navegador.

> Importante: nunca pongas tu `ANTHROPIC_API_KEY` directamente en el código
> del cliente (`client/`). El navegador es público — cualquiera que abra
> las herramientas de desarrollador la vería. Por eso existe `server/`.

## Dónde tocar cada cosa

- `client/src/data/areas.js` — las 14 áreas del temario, sus pesos y temas.
  Ahí se ajusta cuántas preguntas de cada área entran al simulacro.
- `client/src/data/mockData.js` — generador de preguntas simuladas.
- `client/src/api/api.js` — toda la lógica de prompts hacia Claude, y el
  switch mock/real.
- `client/src/components/` — un componente por pantalla (Home, Simulacro,
  Practica, Oral) más piezas reutilizables (Header, Dial, ProgresoPanel).
- `client/src/hooks/useProgreso.js` — guarda el progreso por área en
  `localStorage` del navegador (persiste entre sesiones, es local a cada
  computadora/navegador).

## Pendientes / ideas para seguir iterando

- Confirmar antes de salir de un simulacro u oral en curso.
- Guardar historial de simulacros pasados, no solo el progreso acumulado.
- Permitir "Modo Kevin" también en el simulacro completo.
- Cachear preguntas generadas para no repetir tanto en una misma sesión.
