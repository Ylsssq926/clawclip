# ClawClip FAQ / Preguntas frecuentes

> Se aplica a `v1.1.x` (incluida `v1.1.0`). Esta FAQ responde en corto a las dudas que más se repiten.

- ¿Necesitas los límites exactos de compatibilidad? Mira [COMPATIBILITY.md](./COMPATIBILITY.md)
- ¿Necesitas detalles de instalación o alojamiento propio? Mira [DEPLOYMENT.md](./DEPLOYMENT.md)

## ¿Por qué solo veo datos Demo?

ClawClip muestra los datos Demo integrados cuando todavía no ha encontrado sesiones locales reales compatibles. La demo pública en vivo usa datos de ejemplo a propósito.

- Si quieres ver tus propias ejecuciones, usa tu instancia local o autoalojada.
- El siguiente paso más seguro es ejecutar primero algunas tareas y luego apuntar ClawClip a la carpeta que contiene `agents/<agent>/sessions/*.jsonl` o `<root>/sessions/*.jsonl`.
- Si sigue quedándose en Demo, salta a **«¿Por qué se abre la página pero no aparecen sesiones?»** más abajo.

## ¿Cómo hago que ClawClip escanee un directorio de logs personalizado?

Apunta ClawClip al **directorio raíz de datos**, no a un único archivo de transcript.

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw
CLAWCLIP_LOBSTER_DIRS=/data/runs;/data/export
CLAWCLIP_SESSION_EXTENSIONS=.jsonl,.ndjson
```

- `OPENCLAW_STATE_DIR`: sustituye la raíz de estado por defecto de OpenClaw.
- `CLAWCLIP_LOBSTER_DIRS`: añade una o más raíces extra; puedes separarlas con comas o punto y coma.
- `CLAWCLIP_SESSION_EXTENSIONS`: solo hace falta si tus transcripts no usan `.jsonl`.
- Las estructuras más seguras son `agents/<agent>/sessions/*.jsonl` o `<root>/sessions/*.jsonl`.
- En Docker, estas rutas deben ser **rutas dentro del contenedor**, no rutas del host.

## ¿Qué nivel de soporte real tienen OpenClaw / ZeroClaw / Claw / custom JSONL?

Versión corta: **OpenClaw y ZeroClaw son la vía principal. Claw y custom JSONL tienen soporte best-effort; no significa que “todo vaya a funcionar”.**

- Lo mejor soportado hoy son las estructuras locales de sesiones JSONL al estilo oficial de OpenClaw / ZeroClaw.
- ClawClip también escanea `~/.claw` cuando encuentra transcripts compatibles.
- El parser ya cubre eventos comunes del estilo OpenClaw, múltiples `tool_calls`, `tool_result` / `function_call_output`, bloques de reasoning / thinking y algunas líneas antiguas tipo chat-completions.
- La lectura directa de SQLite / `.db` / `.sqlite` **todavía no** está soportada.
- `sessions.json` puede ayudar con metadatos, pero **no es el transcript en sí**.
- Si necesitas el límite exacto, lee [COMPATIBILITY.md](./COMPATIBILITY.md).

## ¿Se subirán mis datos?

Por defecto, no. El descubrimiento de sesiones, el parsing, la reproducción y el análisis del scorecard se ejecutan en tu propia máquina o en tu despliegue.

- ClawClip **no** sube por defecto los datos de ejecución de tu agente.
- El único paso opcional con red es la actualización de precios públicos; solo refresca referencias de precio y **no** envía el contenido de tus sesiones.
- Si alojas ClawClip tú mismo, tus datos se quedan donde **tú** lo despliegas.

## ¿Cuándo debería usar Docker, `npm start` o el modo dev?

Usa la configuración más pequeña que encaje con lo que estás haciendo.

- `npm start`: la forma más rápida de usar ClawClip en tu máquina o en un servidor sencillo.
- Docker / `docker compose up --build`: mejor cuando quieres un despliegue aislado, montajes de volumen más claros o una operación de servidor más cómoda.
- `npm run dev:server` + `npm run dev:web`: solo para quien esté desarrollando ClawClip.
- Si arrancas solo `dev:server`, al abrir `/` sin frontend compilado puedes ver un mensaje del backend en lugar de la app completa. Es lo esperado.

Para una guía más completa, mira [DEPLOYMENT.md](./DEPLOYMENT.md).

## ¿Por qué se abre la página pero no aparecen sesiones?

La mayoría de las veces ClawClip funciona bien; simplemente todavía no ha encontrado transcripts compatibles.

- Asegúrate de haber ejecutado tareas de verdad y de que se hayan generado transcripts.
- Comprueba que la ruta de escaneo apunta a la carpeta **por encima de** `agents/<agent>/sessions`, no a un solo archivo JSONL.
- En Docker, confirma que la carpeta del host esté montada correctamente y que las variables de entorno apunten a la **ruta dentro del contenedor**.
- Si tu runtime guarda las sesiones sobre todo en SQLite / DB, primero exporta o sincroniza a JSONL.
- Si tus archivos usan otra extensión, configura `CLAWCLIP_SESSION_EXTENSIONS`.
- Si solo tienes archivos de configuración o `sessions.json`, eso aún no cuenta como un transcript reproducible.

## ¿Por qué la puntuación no es una “puntuación benchmark estándar”?

Porque ClawClip no está calificando a tu agente contra un único conjunto de pruebas universal. El Agent Scorecard es un **diagnóstico heurístico** construido a partir del comportamiento de tus propias ejecuciones locales.

- Úsalo para comparar antes y después, orientar iteraciones y revisar más rápido.
- **No** lo tomes como prueba de benchmark de un proveedor ni como ranking universal entre equipos.
- Las puntuaciones y curvas de la Demo son ilustrativas; las sesiones reales importan mucho más.

## ¿Los datos de precios son en tiempo real?

No en el sentido estricto de un “panel de facturación en vivo”. ClawClip incluye una tabla estática de respaldo ya verificada, y puede refrescar referencias públicas de precios más recientes cuando la red está habilitada.

- Úsalo para entender la dirección del coste y si una optimización realmente valió la pena.
- No lo uses como autoridad final para discutir línea por línea una factura de proveedor.
- Los modelos muy nuevos o con nombres poco habituales pueden caer temporalmente en una estimación hasta que el mapeo de precios se ponga al día.
.
