<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Lokales Diagnosetool für AI Agents**

Run Insights · Agent Scorecard · Cost Report — für OpenClaw, ZeroClaw und praxisnahe lokale JSONL-Workflows.

<p>
  <a href="https://clawclip.luelan.online">Live-Demo</a> ·
  <a href="#quick-start">Schnellstart</a> ·
  <a href="#core-capabilities">Kernfunktionen</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <strong>Deutsch</strong>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="Live-Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="MIT-Lizenz" /></a>
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw und ZeroClaw" />
</p>

</div>

> ClawClip ist ein Local-first-Diagnosetool für AI Agents.  
> Es verwandelt JSONL-Session-Logs in überprüfbare Beweisketten, bewertet deinen Agenten in 6 Dimensionen und verfolgt jeden ausgegebenen Cent.  
> 100% lokal. Keine Cloud. Keine API-Aufrufe.

<a id="quick-start"></a>

## Schnellstart

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Öffne `http://localhost:8080`, um zuerst die mitgelieferten Demo-Sessions lokal zu prüfen und danach deine eigenen OpenClaw- / ZeroClaw-Logs zu laden.

<a id="core-capabilities"></a>

## Kernfunktionen

| Fähigkeit | Wofür sie dir hilft |
| --- | --- |
| 🔍 **Laufanalyse (Run Insights)** | Jeden Denkschritt, Tool-Aufruf, Fehler, Retry und jedes Ergebnis als prüfbare Beweiskette nachvollziehen |
| 📊 **Agent-Zeugnis (Agent Scorecard)** | Schreiben, Coding, Tool-Nutzung, Recherche, Sicherheit und Kosten-Leistung heuristisch anhand des realen Laufverhaltens bewerten |
| 💰 **Kostenbericht (Cost Report)** | Ausgaben pro Modell aufschlüsseln, Trends verfolgen, Budgethinweise geben und Sparpotenziale sichtbar machen |
| 📈 **Prompt-Effizienz (Prompt Efficiency)** | Ergebnisqualität gegen Token- und Kosteneinsatz pro Prompt abwägen |
| 🔄 **Versionsvergleich (Version Compare)** | Modelle, Prompts, Konfigurationen oder Läufe direkt nebeneinanderstellen, um Fortschritte und Rückschritte zu erkennen |
| 📚 **Vorlagenbibliothek + Wissensbasis (Template Library + Knowledge Base)** | Bewährte Vorlagen wiederverwenden, historische Sessions durchsuchen und lokales Iterationswissen aufbauen |

## Kompatibilität

ClawClip priorisiert die offiziellen Session-Strukturen von **OpenClaw** und **ZeroClaw**.  
Die Unterstützung weiterer lokaler JSONL-basierter Agent-Runtimes wird schrittweise erweitert — basierend auf realer Formatabdeckung statt auf pauschalen Versprechen.

## Bewertungsmethode

> Die Agent Scorecard nutzt einen **Heuristic Scorecard**-Ansatz. Sie analysiert Verhaltenssignale in Session-Logs — etwa Antwortqualität, Tool-Nutzung, Sicherheitshinweise und Kostenstruktur. Das ist kein strenger Benchmark auf Basis eines standardisierten Testsets, sondern ein schneller Diagnosesignalgeber für Laufqualität.

## Datenquellen

| Quelle | Hinweise |
| --- | --- |
| `~/.openclaw/` | Standard-Session-Verzeichnis von OpenClaw, wird beim Start automatisch erkannt |
| `OPENCLAW_STATE_DIR` | Überschreibt den Standardpfad für den OpenClaw-Status |
| `CLAWCLIP_LOBSTER_DIRS` | Fügt zusätzliche lokale Ordner für den Session-Scan hinzu |
| Integrierte Demo-Sessions | Erkunde Run Insights, Scorecard und Cost Report ohne echte Daten zu importieren |
| ZeroClaw-Exporte / zusätzliche JSONL-Ordner | Unterstützung wächst schrittweise mit der Parser-Abdeckung |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## Roadmap

### v1.0 — Werkzeugreife
- Run Insights, Agent Scorecard und Cost Report als stabiles Kerntrio für lokale Diagnose festigen
- Beweisprüfung, Importfluss und OpenClaw- / ZeroClaw-Kompatibilität verbessern
- Local-first-Workflows schnell, klar und zuverlässig machen

### v1.5 — Optimierungsschleife
- Prompt Efficiency, Version Compare und Spartipps weiter ausbauen
- Diagnose mit wiederholbaren Optimierungsempfehlungen und Nachher-Validierung verbinden
- Template Library + Knowledge Base zu einer praxistauglichen Iterationsschleife ausbauen

### v2.0 — Team-Workflows
- Review-Ansichten für Teams, teilbare Berichte und Baseline-Vergleiche ergänzen
- Szenariobibliotheken, wiederkehrende Auswertungen und Mehrfachlauf-Zusammenfassungen unterstützen
- Teams helfen, Agent-Qualität und -Kosten gemeinsam zu steuern

## Die Garnelen-Geschichte

> Ich war eine kleine Garnele, die aus der OpenClaw-Gezeitenpfütze herausgefischt wurde.
>
> Mein Besitzer sagte: „Du arbeitest den ganzen Tag, aber niemand weiß, ob du wirklich besser wirst oder nur teurer.“
>
> Ich sagte: „Dann hört auf, nur Rohlogs anzustarren. Macht aus meinen Läufen Beweise, gebt mir ein Zeugnis und zeigt die Rechnung.“
>
> So wurde ClawClip zu einem lokalen Schreibtisch, an dem man prüfen kann, was ein Agent getan hat, wie gut er es getan hat und was es gekostet hat.
>
> — 🍤 ClawClip-Maskottchen

## Community

- QQ-Gruppe: `892555092`
- Probleme und Vorschläge: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
