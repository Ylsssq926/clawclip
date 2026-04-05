<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Herramienta local de diagnóstico para AI Agents**

Run Insights · Agent Scorecard · Cost Report — para OpenClaw, ZeroClaw y flujos JSONL locales realmente útiles.

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
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw y ZeroClaw" />
</p>

</div>

> ClawClip es una herramienta de diagnóstico local-first para AI Agents.  
> Convierte logs de sesión JSONL en evidencia revisable, puntúa a tu agente en 6 dimensiones y rastrea cada céntimo gastado.  
> 100% local. Cero nube. Cero llamadas a API.

<a id="quick-start"></a>

## Inicio rápido

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Abre `http://localhost:8080` para revisar primero las sesiones demo incluidas y después cargar tus propios logs de OpenClaw / ZeroClaw.

<a id="core-capabilities"></a>

## Capacidades clave

| Capacidad | Qué te permite hacer |
| --- | --- |
| 🔍 **Perspectivas de ejecución (Run Insights)** | Revisar cada paso de razonamiento, llamada a herramientas, error, reintento y resultado como una cadena de evidencia auditable |
| 📊 **Boletín del Agent (Agent Scorecard)** | Puntuar de forma heurística escritura, programación, uso de herramientas, búsqueda, seguridad y relación coste-rendimiento a partir del comportamiento real |
| 💰 **Informe de costes (Cost Report)** | Desglosar el gasto por modelo, seguir tendencias, activar alertas presupuestarias y detectar oportunidades de ahorro |
| 📈 **Eficiencia del Prompt (Prompt Efficiency)** | Comparar la calidad del resultado frente al coste y los tokens invertidos en cada prompt |
| 🔄 **Comparación de versiones (Version Compare)** | Comparar lado a lado modelos, prompts, configuraciones o ejecuciones para ver qué mejoró y qué empeoró |
| 📚 **Biblioteca de plantillas + base de conocimiento (Template Library + Knowledge Base)** | Reutilizar plantillas que ya funcionan, buscar sesiones históricas y construir memoria local para iterar |

## Compatibilidad

ClawClip prioriza las estructuras de sesión oficiales de **OpenClaw** y **ZeroClaw**.  
El soporte para otros runtimes locales basados en JSONL se ampliará gradualmente, según la cobertura real de formatos.

## Método de puntuación

> El Agent Scorecard utiliza un enfoque de **Heuristic Scorecard**. Analiza señales de comportamiento en los logs de sesión — como calidad de respuesta, uso de herramientas, pistas de seguridad y estructura de costes. No es un benchmark estricto basado en un conjunto de pruebas estandarizado; es una señal rápida de diagnóstico sobre la calidad de la ejecución.

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

## Roadmap

### v1.0 — Madurez de la herramienta
- Consolidar Run Insights, Agent Scorecard y Cost Report como el trío central del diagnóstico local
- Mejorar la revisión de evidencia, la experiencia de importación y la compatibilidad con OpenClaw / ZeroClaw
- Hacer que el flujo local-first sea rápido, claro y fiable

### v1.5 — Bucle de optimización
- Reforzar Prompt Efficiency, Version Compare y las sugerencias de ahorro
- Conectar el diagnóstico con recomendaciones repetibles y validación posterior a cada cambio
- Convertir Template Library + Knowledge Base en un circuito práctico de iteración

### v2.0 — Trabajo en equipo
- Añadir vistas de revisión para equipos, informes compartibles y comparaciones contra baselines
- Soportar bibliotecas de escenarios, evaluaciones recurrentes y resúmenes multi-ejecución
- Ayudar a los equipos a gestionar calidad y coste del agent de forma conjunta

## La historia del camarón

> Yo era un pequeño camarón rescatado de la poza de OpenClaw.
>
> Mi dueña dijo: "Trabajas todo el día, pero nadie sabe si realmente estás mejorando o solo te estás volviendo más caro."
>
> Yo respondí: "Entonces dejen de mirar logs crudos. Conviertan mis ejecuciones en evidencia, denme un boletín y enseñen la factura."
>
> Así nació ClawClip como una mesa local para revisar qué hizo un agent, qué tan bien lo hizo y cuánto costó.
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
