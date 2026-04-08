<div align="center">

<img src="luelan-logo.png" alt="ClawClip-Logo" width="96" />

# ClawClip

**Lokale Agent-Diagnosekonsole · v1.1.0**

Sieh, was dein Agent wirklich getan hat.  
Prüfe, ob der Lauf standgehalten hat.  
Vergleiche das Ergebnis mit den Kosten.

Run Insights · Agent Scorecard · Cost Report — für OpenClaw, ZeroClaw und die lokale Auswertung von JSONL-Sessions.

<p>
  <a href="https://clawclip.luelan.online">Live-Demo</a> ·
  <a href="#quick-start">Schnellstart</a> ·
  <a href="#visual-proof">Vorschau</a> ·
  <a href="./docs/FAQ.de.md">FAQ</a> ·
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
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="Session-Analyse läuft lokal" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw und ZeroClaw" />
</p>

</div>

> Öffne eine Session und sieh, was passiert ist.  
> Prüfe, ob der Lauf wirklich standgehalten hat.  
> Vergleiche Ergebnis und Kosten, bevor du die Änderung behältst.

<a id="visual-proof"></a>

## In 15 Sekunden sehen, worum es geht

Lade einen Lauf und beantworte schnell drei Fragen: Was ist passiert, hat es standgehalten, und war der Aufwand das Geld wert?

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip macht aus einem Agent-Lauf Run Insights, Agent Scorecard und Cost Report" />
</p>

<a id="core-capabilities"></a>

## Drei Fragen, die du schnell beantworten kannst

| Die eigentliche Frage | Was ClawClip dir gibt |
| --- | --- |
| **Was hat der Agent wirklich getan?** | **Run Insights** legt den Lauf Schritt für Schritt offen, damit du ihn prüfen kannst, ohne rohe Logs durchzugehen |
| **Hat der Lauf wirklich standgehalten?** | **Agent Scorecard** gibt dir eine schnelle Diagnose in sechs Bereichen: Schreiben, Coding, Tool-Nutzung, Recherche, Sicherheit und Kosten-Leistung |
| **Hat sich die Optimierung gelohnt?** | **Cost Report** schlüsselt die Kosten nach Modell und Nutzung auf, damit du siehst, ob der Gewinn die Rechnung rechtfertigt |

## Was in v1.1.0 enthalten ist

| In dieser Version enthalten | Warum es wichtig ist |
| --- | --- |
| **Prompt Efficiency** | Prüfe, ob zusätzliche Tokens und komplexere Prompts wirklich genug Ausgabequalität bringen, um sich zu lohnen |
| **Version Compare** | Vergleiche Modelle, Prompts, Konfigurationen oder Läufe direkt nebeneinander, um Fortschritte und Rückschritte zu erkennen |
| **Template Library + Knowledge Base** | Nutze funktionierende Muster wieder, durchsuche die lokale Historie und sammle Session-Erkenntnisse an einem Ort |
| **Integrierte Demo-Sessions** | Verstehe den kompletten Ablauf, bevor du echte Projektdaten anfasst |

## Was lokal bleibt

- Session-Erkennung, Parsing und Analyse passieren auf deinem Rechner.
- ClawClip lädt keine Agent-Laufdaten hoch.
- Die Aktualisierung öffentlicher Preise ist optional, wenn du aktuelle Referenzpreise möchtest.
- Dabei werden deine Session-Inhalte nirgendwohin gesendet.

<a id="quick-start"></a>

## Schnellstart

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Öffne `http://localhost:8080`, um zuerst die integrierten Demo-Sessions lokal zu prüfen und danach deine eigenen OpenClaw- / ZeroClaw-Logs zu laden.

## Kompatibilität

ClawClip priorisiert derzeit die offiziellen Session-Strukturen von **OpenClaw** und **ZeroClaw**.  
Die Unterstützung weiterer lokaler JSONL-Runtimes wird schrittweise ausgebaut, je weiter die Parser-Abdeckung wächst.

## So liest du die Scorecard

> Die Agent Scorecard ist eine **heuristische Einordnung**, kein Benchmark-Ranking. Sie betrachtet Session-Signale wie Antwortqualität, Tool-Nutzung, Sicherheitshinweise und Kostenstruktur, damit du Iterationen schneller vergleichen kannst.

## Session-Quellen

| Quelle | Wofür sie genutzt wird |
| --- | --- |
| `~/.openclaw/` | Standard-Session-Verzeichnis von OpenClaw, wird beim Start automatisch erkannt |
| `OPENCLAW_STATE_DIR` | Überschreibt den Standardpfad für den OpenClaw-Status |
| `CLAWCLIP_LOBSTER_DIRS` | Fügt zusätzliche lokale Ordner zum Session-Scan hinzu |
| Integrierte Demo-Sessions | Damit kannst du Run Insights, Agent Scorecard und Cost Report erkunden, ohne echte Daten zu importieren |
| ZeroClaw-Exporte / zusätzliche JSONL-Ordner | Werden schrittweise unterstützt, wenn die Formatabdeckung wächst |

## Warum das Maskottchen eine Garnele ist

> Das Maskottchen ist eine Garnele, weil ClawClip mit der Auswertung von OpenClaw-Läufen angefangen hat.
>
> Daraus entstand die eigentliche Frage: „Ist dieser Agent wirklich besser geworden, oder nur teurer?“
>
> Genau das bestimmt das Produkt bis heute: den Lauf nachvollziehen, prüfen, ob er standgehalten hat, und Ergebnis und Kosten miteinander vergleichen.
>
> — 🍤 ClawClip-Maskottchen

<a id="roadmap"></a>

## Nach v1.1.0

- Vorher-Nachher-Validierung für Prompt-, Modell- und Konfigurationsänderungen klarer machen
- OpenClaw / ZeroClaw tiefer abdecken und die Unterstützung für angrenzende lokale JSONL-Runtimes ausbauen
- Mehr teilbare Review-Ausgaben für Team-Workflows ergänzen, ohne Sessions aus der lokalen Umgebung herauszunehmen

## Community

- QQ-Gruppe: `892555092`
- Probleme und Vorschläge: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## Lizenz

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
