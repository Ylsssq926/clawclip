<div align="center">

<img src="luelan-logo.png" alt="Logotipo de ClawClip" width="96" />

# ClawClip

**Consola local de diagnóstico de agentes · v1.1.0**

Mira qué hizo realmente tu agente.  
Comprueba si la ejecución se sostuvo.  
Compara el resultado con el coste.

Run Insights · Agent Scorecard · Cost Report — para OpenClaw, ZeroClaw y la revisión local de sesiones JSONL.

<p>
  <a href="https://clawclip.luelan.online">Demo en vivo</a> ·
  <a href="#quick-start">Inicio rápido</a> ·
  <a href="#visual-proof">Vista previa</a> ·
  <a href="./docs/FAQ.es.md">FAQ</a> ·
  <a href="#core-capabilities">Capacidades clave</a> ·
  <a href="#roadmap">Hoja de ruta</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <strong>Español</strong> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="Demo en vivo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="Licencia MIT" /></a>
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="El análisis de sesiones se hace en local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw y ZeroClaw" />
</p>

</div>

> Abre una sesión y mira qué pasó.  
> Comprueba si la ejecución realmente se sostuvo.  
> Compara el resultado con el coste antes de quedarte con el cambio.

<a id="visual-proof"></a>

## Míralo en 15 segundos

Carga una ejecución y responde rápido a tres preguntas: qué pasó, si se sostuvo y si el gasto realmente valió la pena.

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip convierte una ejecución de agente en Run Insights, Agent Scorecard y Cost Report" />
</p>

<a id="core-capabilities"></a>

## Tres preguntas que puedes resolver rápido

| La pregunta real | Lo que te da ClawClip |
| --- | --- |
| **¿Qué hizo de verdad el agente?** | **Run Insights** despliega la ejecución paso a paso para que puedas revisarla sin excavar en logs crudos |
| **¿La ejecución realmente se sostuvo?** | **Agent Scorecard** te da un diagnóstico rápido en seis partes: redacción, código, uso de herramientas, búsqueda, seguridad y relación coste-rendimiento |
| **¿La optimización valió la pena?** | **Cost Report** desglosa el gasto por modelo y por uso para que veas si la mejora justificó la factura |

## Qué incluye v1.1.0

| Incluido en esta versión | Por qué importa |
| --- | --- |
| **Prompt Efficiency** | Comprueba si más tokens y prompts más complejos están comprando suficiente calidad de salida como para justificarse |
| **Version Compare** | Compara lado a lado modelos, prompts, configuraciones o ejecuciones para detectar mejoras y retrocesos |
| **Template Library + Knowledge Base** | Reutiliza patrones que ya funcionan, busca en el historial local y reúne en un solo lugar lo aprendido en tus sesiones |
| **Sesiones demo integradas** | Recorre el flujo completo antes de tocar datos reales del proyecto |

## Lo que se queda en local

- El descubrimiento, parsing y análisis de sesiones se hacen en tu propia máquina.
- ClawClip no sube datos de ejecución del agente.
- La actualización de precios públicos es opcional si quieres referencias de precio más recientes.
- Ese paso no envía el contenido de tus sesiones a ningún sitio.

<a id="quick-start"></a>

## Inicio rápido

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Abre `http://localhost:8080` para revisar primero las sesiones demo incluidas en local y después cargar tus propios logs de OpenClaw / ZeroClaw.

## Compatibilidad

ClawClip da prioridad actualmente a las estructuras de sesión oficiales de **OpenClaw** y **ZeroClaw**.  
La compatibilidad con otros runtimes locales basados en JSONL irá ampliándose a medida que crezca la cobertura del parser.

## Cómo leer el scorecard

> El Agent Scorecard es una **lectura heurística**, no una tabla de posiciones tipo benchmark. Se fija en señales de la sesión — como calidad de respuesta, uso de herramientas, indicios de seguridad y estructura de costes — para que puedas comparar iteraciones más rápido.

## Fuentes de sesión

| Fuente | Para qué sirve |
| --- | --- |
| `~/.openclaw/` | Directorio de sesiones por defecto de OpenClaw, detectado automáticamente al iniciar |
| `OPENCLAW_STATE_DIR` | Sobrescribe la ruta de estado por defecto de OpenClaw |
| `CLAWCLIP_LOBSTER_DIRS` | Añade carpetas locales extra al escaneo de sesiones |
| Sesiones demo integradas | Te permiten explorar Run Insights, Agent Scorecard y Cost Report sin importar datos reales |
| Exportaciones de ZeroClaw / carpetas JSONL adicionales | Se irán soportando de forma progresiva a medida que aumente la cobertura de formatos |

## Por qué la mascota es un camarón

> La mascota es un camarón porque ClawClip nació revisando ejecuciones de OpenClaw.
>
> Y de ahí quedó la pregunta importante: «¿Este agente realmente mejoró, o solo se volvió más caro?»
>
> Esa pregunta sigue definiendo el producto: reproducir la ejecución, ver si se sostuvo y comparar el resultado con el coste.
>
> — 🍤 Mascota de ClawClip

<a id="roadmap"></a>

## Después de v1.1.0

- Hacer más clara la validación del antes y después en cambios de prompts, modelos y configuraciones
- Profundizar la cobertura de OpenClaw / ZeroClaw y ampliar el soporte para runtimes JSONL locales cercanos
- Añadir más salidas de revisión compartibles para flujos de equipo sin sacar las sesiones de local

## Comunidad

- Grupo QQ: `892555092`
- Issues y sugerencias: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## Licencia

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
