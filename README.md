# Incubadora · Prep PDG

App de repaso para las Pruebas de Grado de Microbiología y Química Clínica.
3 modos: simulacro mini, práctica por área, y modo oral con evaluación tipo tribunal.

## Estructura

```
incubadora-pdg/
  client/     -> app de React (Vite). Esto es lo que se ve en el navegador.
  server/     -> servidor Express: perfiles/progreso (Postgres/Neon, siempre)
                 y proxy a la API de Anthropic (solo si MOCK_MODE es false).
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
