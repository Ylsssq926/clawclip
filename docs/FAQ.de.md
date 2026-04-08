# ClawClip FAQ / Häufige Fragen

> Gilt für `v1.1.x` (einschließlich `v1.1.0`). Dieses FAQ beantwortet kurz die Fragen, die am häufigsten wiederkommen.

- Du brauchst die genaue Kompatibilitätsgrenze? Siehe [COMPATIBILITY.md](./COMPATIBILITY.md)
- Du brauchst Setup- oder Self-Hosting-Details? Siehe [DEPLOYMENT.md](./DEPLOYMENT.md)

## Warum sehe ich nur Demo-Daten?

ClawClip zeigt die integrierten Demo-Daten immer dann an, wenn noch keine echten kompatiblen lokalen Sessions gefunden wurden. Die öffentliche Live-Demo arbeitet absichtlich nur mit Beispieldaten.

- Wenn du deine eigenen Läufe sehen willst, nutze deine lokale oder selbst gehostete Instanz.
- Der sicherste nächste Schritt ist: erst ein paar Tasks ausführen und ClawClip dann auf den Ordner zeigen lassen, der `agents/<agent>/sessions/*.jsonl` oder `<root>/sessions/*.jsonl` enthält.
- Wenn es trotzdem bei Demo bleibt, springe weiter unten zu **„Warum öffnet sich die Seite, aber es erscheinen keine Sessions?“**.

## Wie lasse ich ClawClip ein benutzerdefiniertes Log-Verzeichnis scannen?

Zeige ClawClip auf das **Datenwurzelverzeichnis**, nicht auf eine einzelne Transcript-Datei.

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw
CLAWCLIP_LOBSTER_DIRS=/data/runs;/data/export
CLAWCLIP_SESSION_EXTENSIONS=.jsonl,.ndjson
```

- `OPENCLAW_STATE_DIR`: ersetzt das Standard-State-Root von OpenClaw.
- `CLAWCLIP_LOBSTER_DIRS`: fügt einen oder mehrere zusätzliche Roots hinzu; trenne sie mit Kommas oder Semikolons.
- `CLAWCLIP_SESSION_EXTENSIONS`: nur nötig, wenn deine Transcripts nicht auf `.jsonl` enden.
- Die sichersten Layouts sind `agents/<agent>/sessions/*.jsonl` oder `<root>/sessions/*.jsonl`.
- In Docker müssen diese Pfade **Container-Pfade** sein, keine Host-Pfade.

## Wie gut werden OpenClaw / ZeroClaw / Claw / custom JSONL tatsächlich unterstützt?

Kurzfassung: **OpenClaw und ZeroClaw sind der Hauptpfad. Claw und custom JSONL laufen unter best-effort und bedeuten keine pauschale „alles funktioniert“-Unterstützung.**

- Am besten unterstützt werden aktuell lokale JSONL-Session-Layouts im offiziellen OpenClaw- / ZeroClaw-Stil.
- ClawClip scannt auch `~/.claw`, wenn dort kompatible Transcripts vorhanden sind.
- Der Parser deckt bereits gängige OpenClaw-artige Events, mehrere `tool_calls`, `tool_result` / `function_call_output`, reasoning- / thinking-Blöcke sowie einige ältere chat-completions-artige Zeilen ab.
- Direktes Lesen von SQLite / `.db` / `.sqlite` wird **noch nicht** unterstützt.
- `sessions.json` kann bei Metadaten helfen, ist aber **nicht das eigentliche Transcript**.
- Wenn du die exakte Grenze brauchst, lies [COMPATIBILITY.md](./COMPATIBILITY.md).

## Werden meine Daten hochgeladen?

Standardmäßig nein. Session-Erkennung, Parsing, Replay und Scorecard-Analyse laufen auf deinem Rechner oder in deiner eigenen Deployment-Umgebung.

- ClawClip lädt deine Agent-Laufdaten standardmäßig **nicht** hoch.
- Der optionale Netzwerkschritt ist nur die Aktualisierung öffentlicher Preisreferenzen; dabei werden keine Session-Inhalte gesendet.
- Wenn du ClawClip selbst hostest, bleiben deine Daten dort, wo **du** es betreibst.

## Wann sollte ich Docker, `npm start` oder den Dev-Modus verwenden?

Nutze das kleinste Setup, das zu deinem Zweck passt.

- `npm start`: der schnellste Weg, ClawClip auf deinem eigenen Rechner oder auf einem einfachen Server zu verwenden.
- Docker / `docker compose up --build`: sinnvoller, wenn du isoliertes Deployment, klarere Volume-Mounts oder einfacheren Serverbetrieb möchtest.
- `npm run dev:server` + `npm run dev:web`: nur für Leute, die ClawClip selbst entwickeln.
- Wenn du nur `dev:server` startest, kann beim Öffnen von `/` ohne gebautes Frontend eine Backend-Nachricht statt der vollständigen App erscheinen. Das ist erwartetes Verhalten.

Für die ausführlichere Anleitung siehe [DEPLOYMENT.md](./DEPLOYMENT.md).

## Warum öffnet sich die Seite, aber es erscheinen keine Sessions?

Meistens läuft ClawClip völlig normal — es wurden nur noch keine kompatiblen Transcripts gefunden.

- Stell sicher, dass du tatsächlich Tasks ausgeführt und dabei Transcripts erzeugt hast.
- Prüfe, dass der Scan-Pfad auf den Ordner **oberhalb von** `agents/<agent>/sessions` zeigt und nicht auf eine einzelne JSONL-Datei.
- In Docker solltest du prüfen, ob der Host-Ordner korrekt gemountet ist und die Umgebungsvariablen auf den **Container-Pfad** zeigen.
- Wenn die Runtime Sessions hauptsächlich in SQLite / DB speichert, exportiere oder synchronisiere zuerst JSONL.
- Wenn deine Dateien eine andere Endung haben, setze `CLAWCLIP_SESSION_EXTENSIONS`.
- Wenn du nur Konfigurationsdateien oder `sessions.json` hast, reicht das noch nicht als replay-fähiges Transcript.

## Warum ist der Score kein „standardisierter Benchmark-Score“?

Weil ClawClip deinen Agenten nicht gegen ein einziges universelles Testset bewertet. Die Agent Scorecard ist eine **heuristische Diagnose**, die aus dem Verhalten deiner eigenen lokalen Läufe abgeleitet wird.

- Nutze sie für Vorher-Nachher-Vergleiche, Iterationsrichtung und schnellere Reviews.
- Behandle sie **nicht** als Benchmark-Nachweis eines Anbieters oder als universelles Ranking über Teams hinweg.
- Demo-only-Scores und Kurven sind nur illustrativ; echte Sessions sind deutlich wichtiger.

## Sind die Preisdaten in Echtzeit?

Nicht im strengen Sinn eines „Live-Abrechnungsdashboards“. ClawClip bringt eine verifizierte statische Fallback-Tabelle mit und kann bei aktivierter Netzwerkverbindung neuere öffentliche Preisreferenzen aktualisieren.

- Nutze sie, um die Kostenrichtung einzuschätzen und zu beurteilen, ob sich eine Optimierung gelohnt hat.
- Verwende sie nicht als letzte Instanz, um eine Anbieterrechnung Zeile für Zeile anzufechten.
- Sehr neue oder ungewöhnlich benannte Modelle können vorübergehend auf eine Schätzung zurückfallen, bis das Preis-Mapping nachgezogen hat.
