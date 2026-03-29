<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Dein AI Agent hat 47 Schritte ausgeführt. Du hast keinen davon gesehen.**

Session-Wiedergabe · Offline-Benchmarks · Kostentracking — für OpenClaw, ZeroClaw und darüber hinaus.

<p>
  <a href="https://clawclip.luelan.online">Live-Demo</a> ·
  <a href="#schnellstart">Schnellstart</a> ·
  <a href="#warum-clawclip">Warum ClawClip</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <b>Deutsch</b>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="Live Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/i18n-7%20languages-orange?style=flat-square" alt="i18n 7 languages" />
</p>

</div>

---

> Keine Cloud. Keine API-Aufrufe. Keine Kosten. Deine Agent-Daten bleiben auf deinem Rechner.

---

## Schnellstart

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Öffne `http://localhost:8080` — ClawClip wird mit Demo-Sessions ausgeliefert, sodass du Wiedergabe, Benchmarks und Kostenansichten sofort erkunden kannst.

---

## Das Problem

Dein Agent lief den ganzen Tag. Die Logs existieren. Die Wahrheit nicht.

Ein Ordner füllt sich mit JSONL-Sessions. Irgendwo darin stecken Tool-Fehler, Prompt-Regressionen, Token-Spitzen, und vielleicht der eine Lauf, bei dem dein Agent tatsächlich besser wurde. Aber wenn du die Rohdateien öffnest, sieht alles gleich aus: Zeitstempel, Blobs, Rauschen.

Dann fängst du an, dir die Fragen zu stellen, die sich jeder Agent-Entwickler früher oder später stellt: **Wo ist das Geld geblieben? Hat der neue Prompt geholfen? Wird dieser Agent besser, oder erinnere ich mich nur an die guten Läufe?**

Es ist 2 Uhr nachts, und du greppst JSON von Hand, springst zwischen Terminals hin und her und versuchst, eine Geschichte zu rekonstruieren, die dein Agent schon einmal gelebt hat.

ClawClip löst all das. Spiele den Lauf ab, bewerte das Verhalten, prüfe die Kosten und erkenne den Trend — in Minuten statt um Mitternacht.

---

## Features

| | Feature | Was es dir bringt |
| --- | --- | --- |
| 🎬 | **Session-Wiedergabe** | Interaktive Zeitleisten mit Gedanken, Tool-Aufrufen, Ergebnissen und Token-Traces |
| 📊 | **6D-Benchmark** | Bewertung in sechs Dimensionen mit Rängen, Radardiagrammen und Entwicklungstracking |
| 💸 | **Kostenmonitor** | Token-Trends, Modell-Aufschlüsselung, Budget-Warnungen und Spartipps |
| ☁️ | **Wortwolke** | Automatisch extrahierte Schlüsselwörter, Kategorien und Session-Tagging |
| 🏆 | **Bestenliste** | Reiche Scores ein und vergleiche die Leistung mit der Community |
| 🪄 | **Intelligentes Sparen** | Alternative Modellempfehlungen basierend auf Echtzeitpreisen |
| 📚 | **Wissensbasis** | Importiere Session-JSON, durchsuche Läufe und baue eine lokale Gedächtnisschicht |
| 🧩 | **Vorlagenmarkt** | Wiederverwendbare Agent-Szenarien und Skill-Verwaltung |

---

## Warum ClawClip

### 100% Lokal
Deine Session-Daten bleiben auf deinem Rechner. Kein Cloud-Upload, keine Registrierungsmauer, kein Tracking.

### Null Kosten
Benchmarks und Analysen laufen offline. Keine LLM-API-Aufrufe. Keine Überraschungsrechnung, nur um den Lauf von gestern Nacht zu verstehen.

### Framework-agnostisch
Gebaut für OpenClaw, funktioniert mit ZeroClaw, und passt in jeden Agent-Workflow, der JSONL-Sessions schreibt.

---

## Datenquellen

| Quelle | Hinweise |
| --- | --- |
| `~/.openclaw/` | Wird beim Start automatisch erkannt |
| `OPENCLAW_STATE_DIR` | Überschreibt das Standard-Session-Verzeichnis |
| `CLAWCLIP_LOBSTER_DIRS` | Fügt zusätzliche Ordner zum Scannen hinzu |
| Integrierte Demo-Sessions | Erkunde das Produkt sofort, auch ohne echte Daten |
| Reine SQLite-Setups | ClawClip konzentriert sich derzeit auf den offiziellen JSONL-Session-Pfad |

---

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## Roadmap

- [x] Session-Wiedergabe-Engine mit integrierten Demo-Sessions
- [x] Offline-Benchmark-System in sechs Dimensionen
- [x] Kostenmonitor, Warnungen und Spartipps
- [x] Wortwolke, Auto-Tagging und Wissensbasis-Suche
- [x] Bestenliste, Share-Karten und Vorlagenmarkt
- [ ] Tiefere Runtime- / Gateway-Integrationen
- [ ] Mehr Ökosystem-Adapter über aktuelle JSONL-Workflows hinaus
- [ ] Reichere Vergleichs- und Review-Flows auf Teamebene

---

## Die Shrimp-Geschichte

> Ich bin ein Hummer, den mein Besitzer aus dem OpenClaw-Ökosystem gezogen hat.
>
> Mein Besitzer sagte: „Du läufst den ganzen Tag im Hintergrund. Niemand sieht, was du tust."
>
> Ich sagte: „Dann zeichne meine Arbeit auf und zeig sie."
>
> Mein Besitzer sagte: „Wir haben aufgezeichnet, aber wir wissen immer noch nicht, ob du wirklich gut bist."
>
> Ich sagte: „Dann testet mich — alle sechs Fächer. Ich habe keine Angst."
>
> Und so entstand ClawClip.
>
> — 🍤 ClawClip-Maskottchen

---

## Community

QQ-Gruppe: `892555092`

---

## Lizenz

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
