<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Consola local de diagnóstico de agentes · v1.1.0**

Mira qué hizo realmente tu agente.  
Evalúa si la ejecución aguantó.  
Demuestra si la optimización valió el coste.

Run Insights · Agent Scorecard · Cost Report — para OpenClaw, ZeroClaw y flujos JSONL locales de uso real.

<p>
  <a href="https://clawclip.luelan.online">Demo en vivo</a> ·
  <a href="#quick-start">Inicio rápido</a> ·
  <a href="#core-capabilities">Capacidades clave</a> ·
  <a href="#roadmap">Roadmap</a> ·
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

> ClawClip convierte sesiones crudas de agentes en una mesa de revisión en la que puedes confiar.  
> Muestra la ejecución completa como evidencia, evalúa si el agente realmente se sostuvo y conecta la calidad con el gasto para que veas si "mejor" de verdad justificó la factura.
>
> **Límites, dichos claramente:** el análisis de sesiones se hace en local, los datos de ejecución del agente no se suben y la actualización de precios es opcional cuando quieres referencias públicas más recientes.

<a id="core-capabilities"></a>

## Las tres preguntas que ClawClip resuelve

| La pregunta real | Lo que te da ClawClip |
| --- | --- |
| **¿Qué hizo de verdad el agente?** | **Run Insights** reconstruye pasos de razonamiento, llamadas a herramientas, reintentos, errores y resultados como una sola cadena de evidencia revisable |
| **¿La ejecución realmente aguantó?** | **Agent Scorecard** ofrece una lectura heurística y práctica sobre redacción, programación, uso de herramientas, búsqueda, seguridad y relación coste-rendimiento |
| **¿La optimización valió la pena?** | **Cost Report** desglosa el gasto por modelo y por uso para que veas si la mejora justificó la cuenta |

## Qué incluye v1.1.0

| Incluido en esta versión | Por qué importa |
| --- | --- |
| **Prompt Efficiency** | Ver si más tokens y prompts más complejos realmente compran suficiente calidad como para justificarse |
| **Version Compare** | Comparar lado a lado modelos, prompts, configuraciones o ejecuciones para detectar avances reales y regresiones reales |
| **Template Library + Knowledge Base** | Reutilizar patrones que ya funcionan, buscar el historial local y convertir sesiones dispersas en memoria de iteración |
| **Sesiones demo integradas** | Recorrer el flujo completo antes de tocar datos reales del proyecto |

## Local-first, sin promesas infladas

- El descubrimiento, parsing y análisis de sesiones se hacen en tu propia máquina.
- ClawClip no sube datos de ejecución del agente.
- La actualización de precios públicos es opcional y solo sirve para renovar referencias de coste.
- Ese paso no requiere enviar el contenido de tus sesiones a ningún sitio.

<a id="quick-start"></a>

## Inicio rápido

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Abre `http://localhost:8080` para revisar primero las sesiones demo incluidas y después cargar tus propios logs de OpenClaw / ZeroClaw.

## Compatibilidad

ClawClip prioriza las estructuras de sesión oficiales de **OpenClaw** y **ZeroClaw**.  
El soporte para otros runtimes locales basados en JSONL se ampliará gradualmente, según la cobertura real de formatos, no por promesas genéricas.

## Cómo leer el scorecard

> El Agent Scorecard es un **diagnóstico heurístico**, no un ranking benchmark estricto. Lee señales de comportamiento en sesiones reales — como calidad de respuesta, uso de herramientas, pistas de seguridad y estructura de costes — para ayudarte a revisar más rápido y comparar iteraciones con más contexto.

## Fuentes de datos

| Fuente | Notas |
| --- | --- |
| `~/.openclaw/` | Directorio de sesiones por defecto de OpenClaw, detectado automáticamente al iniciar |
| `OPENCLAW_STATE_DIR` | Sobrescribe la ruta de estado por defecto de OpenClaw |
| `CLAWCLIP_LOBSTER_DIRS` | Añade carpetas locales extra para escanear sesiones |
| Sesiones demo incluidas | Permiten explorar Run Insights, Scorecard y Cost Report sin importar datos reales |
| Exportaciones de ZeroClaw / carpetas JSONL adicionales | Compatibilidad ampliada de forma progresiva según madure el parser |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## Después de v1.1.0

- Hacer más clara la validación antes/después de cambios en prompts, modelos y configuraciones
- Profundizar la cobertura de OpenClaw / ZeroClaw y ampliar el soporte para runtimes JSONL locales cercanos
- Añadir más salidas de revisión compartibles para flujos de equipo sin romper el núcleo local-first

## La historia del camarón

> Yo era un pequeño camarón rescatado de la poza de OpenClaw.
>
> Mi dueña dijo: "Trabajas todo el día, pero nadie sabe si realmente estás mejorando o solo te estás volviendo más caro."
>
> Yo respondí: "Entonces dejen de mirar logs crudos. Conviertan mis ejecuciones en evidencia, denme un boletín y enseñen la factura."
>
> Así nació ClawClip como una mesa local para revisar qué hizo un agente, qué tan bien lo hizo y cuánto costó.
>
> — 🍤 Mascota de ClawClip

## Community

- Grupo QQ: `892555092`
- Issues y sugerencias: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
