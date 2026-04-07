<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Lokale Agent-Diagnosekonsole · v1.1.0**

Sieh, was dein Agent wirklich getan hat.  
Bewerte, ob der Lauf standgehalten hat.  
Belege, ob sich die Optimierung gelohnt hat.

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
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="Session-Analyse läuft lokal" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw und ZeroClaw" />
</p>

</div>

> ClawClip macht aus rohen Agent-Sessions einen Prüfplatz, dem du vertrauen kannst.  
> Es zeigt den kompletten Lauf als Beweiskette, bewertet, ob der Agent standgehalten hat, und verknüpft Qualität mit Kosten, damit du erkennst, ob „besser“ den Aufpreis wirklich wert war.
>
> **Grenzen, klar benannt:** Die Session-Analyse läuft lokal, Agent-Laufdaten werden nicht hochgeladen, und die Preisaktualisierung ist optional, wenn du aktuelle öffentliche Preisreferenzen brauchst.

<a id="core-capabilities"></a>

## Die drei Fragen, die ClawClip beantwortet

| Die eigentliche Frage | Was ClawClip liefert |
| --- | --- |
| **Was hat der Agent wirklich getan?** | **Run Insights** rekonstruiert Denkpfade, Tool-Aufrufe, Retries, Fehler und Ergebnisse als eine überprüfbare Beweiskette |
| **Hat der Lauf wirklich standgehalten?** | **Agent Scorecard** gibt eine praktische heuristische Einschätzung zu Schreiben, Coding, Tool-Nutzung, Recherche, Sicherheit und Kosten-Leistung |
| **Hat sich die Optimierung gelohnt?** | **Cost Report** schlüsselt Kosten nach Modell und Nutzung auf, damit du siehst, ob der Gewinn die Rechnung rechtfertigt |

## Was v1.1.0 mitliefert

| In dieser Version enthalten | Warum es wichtig ist |
| --- | --- |
| **Prompt-Effizienz** | Prüfen, ob zusätzliche Tokens und komplexere Prompts wirklich genug Ergebnisqualität zurückgeben |
| **Versionsvergleich** | Modelle, Prompts, Konfigurationen oder Läufe direkt nebeneinanderstellen, um echte Fortschritte und echte Rückschritte zu sehen |
| **Vorlagenbibliothek + Wissensbasis** | Funktionierende Muster wiederverwenden, lokale Historie durchsuchen und aus verstreuten Sessions ein Iterationsgedächtnis machen |
| **Integrierte Demo-Sessions** | Den kompletten Ablauf verstehen, bevor du echte Projektdaten anfasst |

## Lokal zuerst, ohne Leerformeln

- Session-Erkennung, Parsing und Analyse passieren auf deinem Rechner.
- ClawClip lädt keine Agent-Laufdaten hoch.
- Die Aktualisierung öffentlicher Preise ist optional und dient nur dazu, Kostenreferenzen zu erneuern.
- Für diesen Schritt werden deine Session-Inhalte nicht irgendwohin gesendet.

<a id="quick-start"></a>

## Schnellstart

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Öffne `http://localhost:8080`, um zuerst die integrierten Demo-Sessions lokal zu prüfen und danach deine eigenen OpenClaw- / ZeroClaw-Logs zu laden.

## Kompatibilität

ClawClip priorisiert die offiziellen Session-Strukturen von **OpenClaw** und **ZeroClaw**.  
Die Unterstützung weiterer lokaler JSONL-basierter Agent-Runtimes wird schrittweise erweitert — basierend auf realer Formatabdeckung statt auf pauschalen Versprechen.

## So liest du die Scorecard

> Die Agent Scorecard ist eine **heuristische Diagnose**, kein Benchmark-Ranking. Sie liest Verhaltenssignale aus echten Sessions — etwa Antwortqualität, Tool-Nutzung, Sicherheitshinweise und Kostenstruktur — damit du schneller prüfen und Iterationen mit mehr Sicherheit vergleichen kannst.

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

## Nach v1.1.0

- Vorher-Nachher-Validierung für Prompt-, Modell- und Konfigurationsänderungen klarer machen
- OpenClaw / ZeroClaw tiefer abdecken und die Unterstützung für angrenzende lokale JSONL-Runtimes ausbauen
- Mehr teilbare Review-Ausgaben für Team-Workflows ergänzen, ohne den lokalen Kern aufzugeben

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
