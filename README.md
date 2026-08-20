# Incubadora · Prep PDG

App de repaso para las Pruebas de Grado de Microbiología y Química Clínica.
3 modos: simulacro mini, práctica por área, y modo oral con evaluación tipo tribunal.

## Estructura

```
incubadora-pdg/
  client/       -> app de React (Vite). Esto es lo que se ve en el navegador.
  server/       -> servidor Express: perfiles/progreso (Postgres/Neon, siempre)
                   y proxy a Claude/Groq (solo si MOCK_MODE es false). Se
                   corre directo con "npm start" en desarrollo local.
  api/index.js  -> mismo server/index.js, envuelto como función serverless
                   para Vercel (no se usa en desarrollo local).
  vercel.json   -> config de build/rutas para desplegar el monorepo en Vercel.
```

## 0. El servidor siempre tiene que estar corriendo

Los perfiles, el progreso y las respuestas viven en Postgres (Neon) detrás de
`server/`, sin importar si `MOCK_MODE` está en `true` o `false`. Sin el
servidor corriendo, la app se queda pegada en la pantalla de elegir perfil.

```bash
cd server
npm install
cp .env.example .env
# Edita .env: pega tu DATABASE_URL de Neon (y ANTHROPIC_API_KEY si vas a usar MOCK_MODE = false)
npm start
```

Esto deja el servidor escuchando en `http://localhost:8787` y crea las
tablas (`perfiles`, `respuestas`, `preguntas`, `favoritos`) automáticamente
si no existen.

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

Cuando quieras usar preguntas generadas de verdad (el servidor del paso 0 ya
debe estar corriendo, con `ANTHROPIC_API_KEY` puesta en `server/.env`):

1. En `client/src/api/api.js`, cambia:

   ```js
   export const MOCK_MODE = true
   ```

   a:

   ```js
   export const MOCK_MODE = false
   ```

2. Corre (o deja corriendo) `npm run dev` en `client/` — Vite ya está
   configurado (`vite.config.js`) para reenviar las llamadas a `/api/...`
   hacia tu servidor local en el puerto 8787, así que no hay problemas de
   CORS ni necesidad de exponer la llave en el navegador.

> Importante: nunca pongas tu `ANTHROPIC_API_KEY` (ni `GROQ_API_KEY`)
> directamente en el código del cliente (`client/`). El navegador es
> público — cualquiera que abra las herramientas de desarrollador la vería.
> Por eso existe `server/`.

También puedes usar Groq en vez de Claude para generar (más barato/gratis
para probar): pon `GROQ_API_KEY` en `server/.env` y `PROVIDER = "groq"` en
`client/src/api/api.js` (junto a `MOCK_MODE = false`). Ver comentario en ese
archivo.

## 3. Desplegar en Vercel

El repo es un monorepo (`client/` + `server/`), así que Vercel necesita
ayuda para saber qué construir y cómo servir la API. Ya está configurado:

- `vercel.json` (raíz) le dice a Vercel que instale y compile `client/` como
  el sitio estático, y reenvíe todo `/api/*` hacia una función serverless.
- `api/index.js` (raíz) envuelve la app de Express de `server/index.js` como
  función serverless — no hay servidor persistente en producción, cada
  request la maneja Vercel bajo demanda. `server/index.js` sigue
  funcionando igual para desarrollo local (`npm start`/`npm run dev`
  siguen levantando el servidor de siempre).

Pasos en el dashboard de Vercel (Project Settings), una sola vez:

1. **General → Root Directory**: debe estar vacío (la raíz del repo), NO
   `client/`. Si tu proyecto ya estaba conectado apuntando a `client/`,
   cámbialo — si no, Vercel nunca va a ver `vercel.json` ni `api/`.
2. **Environment Variables**: agrega `DATABASE_URL` (tu cadena de Neon) y
   `ANTHROPIC_API_KEY` (y/o `GROQ_API_KEY` si vas a usar Groq). Estas nunca
   viven en el repo (`server/.env` está en `.gitignore`), hay que pegarlas
   ahí para que la función serverless las tenga en producción.
3. En `client/src/api/api.js`, antes de desplegar, pon `MOCK_MODE = false`
   y el `PROVIDER` que quieras usar en producción — son constantes que se
   compilan dentro del bundle de Vite, no variables de entorno de Vercel.
4. Vuelve a desplegar (push a la rama conectada, o "Redeploy" en el
   dashboard) para que tome el `Root Directory` y las variables nuevas.

Notas:
- La tabla `preguntas`/`favoritos`/etc. se crea sola en el primer request a
  producción (`initSchema()` corre igual en la función serverless).
- Usa la cadena de conexión "pooled" de Neon (con `-pooler` en el host,
  como ya tienes en `.env`) — es la que funciona bien con funciones
  serverless que abren/cierran conexiones seguido.

## Dónde tocar cada cosa

- `client/src/data/areas.js` — las 14 áreas del temario, sus pesos y temas.
  Ahí se ajusta cuántas preguntas de cada área entran al simulacro.
- `client/src/data/mockData.js` — generador de preguntas simuladas.
- `client/src/api/api.js` — toda la lógica de prompts hacia Claude, y el
  switch mock/real.
- `client/src/components/` — un componente por pantalla (Home, Simulacro,
  Practica, Oral, Favoritos) más piezas reutilizables (Header, Dial,
  ProgresoPanel).
- `client/src/hooks/useProgreso.js` — trae y guarda el progreso por área de
  un perfil contra el servidor (Postgres/Neon).
- `client/src/hooks/useFavoritos.js` — trae y guarda las preguntas favoritas
  de un perfil contra el servidor.
- `client/src/components/PerfilSelector.jsx` — pantalla para crear un perfil
  nuevo o continuar uno existente. Sin autenticación: cualquiera puede
  continuar cualquier perfil, solo eligiéndolo de la lista.
- `server/db.js` — conexión a Postgres (Neon) y creación del esquema
  (`perfiles`, `respuestas`, `preguntas`, `favoritos`) si no existe.

### Favoritos

Toda pregunta generada en Práctica o Simulacro se guarda en la tabla
`preguntas` (en modo mock también, sin costo de API — solo se guarda lo que
ya se generó). Desde Práctica (estrella visible desde que aparece la
pregunta) o desde la revisión del Simulacro se puede marcar/desmarcar como
favorita. La pantalla "Favoritos" (accesible desde Inicio) lista las
favoritas de tu perfil y tiene un botón "Generar preguntas parecidas" que
manda a Práctica generando preguntas nuevas usando la favorita como
referencia de estilo/nivel (en modo mock esto no varía el contenido, ya que
el generador mock no usa Claude — funciona igual pero sin steering real).

El perfil elegido se recuerda en `localStorage` del navegador (para no tener
que elegirlo cada vez en el mismo dispositivo), pero el progreso en sí vive
en la base de datos, no en el navegador — por eso el mismo perfil se puede
continuar desde cualquier dispositivo.

## Pendientes / ideas para seguir iterando

- Confirmar antes de salir de un simulacro u oral en curso.
- Guardar historial de simulacros pasados, no solo el progreso acumulado.
- Permitir "Modo Kevin" también en el simulacro completo.
- Cachear preguntas generadas para no repetir tanto en una misma sesión.
- Permitir borrar/renombrar un perfil desde la UI.
- Favoritos en modo oral (hoy solo Práctica y Simulacro).
- Tipos de pregunta nuevos (verdadero/falso, completar espacios, ordenar,
  emparejar) — requeriría un campo `tipo` en `preguntas` y un componente de
  renderizado por tipo.
- Preguntas con imágenes — bloqueado hasta decidir el origen (¿ella sube sus
  fotos de laboratorio/atlas, o se arma un banco curado de imágenes de
  dominio público?). Claude no puede generar imágenes de microorganismos.
- Más interactividad: rachas, temporizador por pregunta en Práctica (el
  Simulacro ya tiene countdown global), feedback visual/sonoro, drag-and-drop
  (ligado a los tipos de pregunta nuevos como ordenar/emparejar).
- Limpieza periódica de preguntas nunca favoriteadas en `preguntas` (hoy se
  guardan todas, sin límite — aceptable para uso de una o dos personas, pero
  crecerá indefinidamente).
