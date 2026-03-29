<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Tu AI Agent ejecutó 47 pasos. No viste ninguno.**

Reproducción de sesiones · Benchmarks offline · Seguimiento de costes — para OpenClaw, ZeroClaw y más allá.

<p>
  <a href="https://clawclip.luelan.online">Demo en vivo</a> ·
  <a href="#inicio-rápido">Inicio rápido</a> ·
  <a href="#por-qué-clawclip">Por qué ClawClip</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <b>Español</b> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="Live Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/i18n-7%20languages-orange?style=flat-square" alt="i18n 7 languages" />
</p>

</div>

---

> Sin nube. Sin llamadas a API. Sin coste. Los datos de tu agente se quedan en tu máquina.

---

## Inicio rápido

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Abre `http://localhost:8080` — ClawClip incluye sesiones de demostración, así que puedes explorar la reproducción, los benchmarks y las vistas de costes de inmediato.

---

## El problema

Tu agente estuvo corriendo todo el día. Los logs existen. La verdad, no.

Una carpeta se llena de sesiones JSONL. En algún lugar dentro hay fallos de herramientas, regresiones de prompts, picos de tokens, y quizás esa ejecución donde tu agente realmente mejoró. Pero cuando abres los archivos crudos, todo se ve igual: marcas de tiempo, blobs, ruido.

Entonces empiezas a hacerte las preguntas que todo constructor de agentes se hace tarde o temprano: **¿A dónde se fue el dinero? ¿El nuevo prompt ayudó? ¿Este agente está mejorando, o solo estoy recordando las buenas ejecuciones?**

Son las 2 de la mañana, y estás haciendo grep en JSON a mano, saltando entre terminales, intentando reconstruir una historia que tu agente ya vivió una vez.

ClawClip arregla todo esto. Reproduce la ejecución, puntúa el comportamiento, inspecciona el coste y observa la tendencia — en minutos en vez de a medianoche.

---

## Características

| | Característica | Qué te aporta |
| --- | --- | --- |
| 🎬 | **Reproducción de sesión** | Líneas de tiempo interactivas con razonamiento, llamadas a herramientas, resultados y trazas de tokens |
| 📊 | **Benchmark 6D** | Puntuación en seis dimensiones con rangos, gráficos radar y seguimiento de evolución |
| 💸 | **Monitor de costes** | Tendencias de tokens, desglose por modelo, alertas de presupuesto y sugerencias de ahorro |
| ☁️ | **Nube de palabras** | Palabras clave extraídas automáticamente, categorías y etiquetado de sesiones |
| 🏆 | **Clasificación** | Envía puntuaciones y compara el rendimiento con la comunidad |
| 🪄 | **Ahorro inteligente** | Recomendaciones de modelos alternativos basadas en precios en tiempo real |
| 📚 | **Base de conocimiento** | Importa JSON de sesión, busca ejecuciones y construye una capa de memoria local |
| 🧩 | **Mercado de plantillas** | Escenarios de agente reutilizables y gestión de skills |

---

## Por qué ClawClip

### 100% Local
Los datos de tus sesiones se quedan en tu máquina. Sin subidas a la nube, sin muros de registro, sin rastreo.

### Coste cero
Los benchmarks y análisis se ejecutan offline. Sin llamadas a API de LLM. Sin facturas sorpresa solo por entender la ejecución de anoche.

### Agnóstico de framework
Diseñado para OpenClaw, funciona con ZeroClaw, y encaja en cualquier flujo de trabajo de agentes que escriba sesiones JSONL.

---

## Fuentes de datos

| Fuente | Notas |
| --- | --- |
| `~/.openclaw/` | Detectado automáticamente al iniciar |
| `OPENCLAW_STATE_DIR` | Sobreescribe el directorio de sesiones por defecto |
| `CLAWCLIP_LOBSTER_DIRS` | Añade carpetas adicionales para escanear |
| Sesiones de demostración integradas | Explora el producto de inmediato, incluso sin datos reales |
| Configuraciones solo SQLite | ClawClip se centra actualmente en la ruta oficial de sesiones JSONL |

---

## Stack tecnológico

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## Hoja de ruta

- [x] Motor de reproducción de sesiones con sesiones demo integradas
- [x] Sistema de benchmark offline en seis dimensiones
- [x] Monitor de costes, alertas y sugerencias de ahorro
- [x] Nube de palabras, auto-etiquetado y búsqueda en base de conocimiento
- [x] Clasificación, tarjetas para compartir y mercado de plantillas
- [ ] Integraciones más profundas con runtime / gateway
- [ ] Más adaptadores de ecosistema más allá de los flujos JSONL actuales
- [ ] Flujos más ricos de comparación y revisión a nivel de equipo

---

## La historia de la gamba

> Soy una langosta sacada del ecosistema OpenClaw por mi dueño.
>
> Mi dueño dijo: «Corres en segundo plano todo el día. Nadie ve lo que haces.»
>
> Yo dije: «Entonces registra mi trabajo y muéstralo.»
>
> Mi dueño dijo: «Lo registramos, pero seguimos sin saber si de verdad vales.»
>
> Yo dije: «Entonces ponme a prueba — las seis asignaturas. No tengo miedo.»
>
> Y así nació ClawClip.
>
> — 🍤 Mascota de ClawClip

---

## Comunidad

Grupo QQ: `892555092`

---

## Licencia

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
