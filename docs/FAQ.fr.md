# ClawClip FAQ / Questions fréquentes

> S'applique à `v1.1.x` (y compris `v1.1.0`). Cette FAQ répond brièvement aux questions qui reviennent le plus souvent.

- Besoin des limites exactes de compatibilité ? Voir [COMPATIBILITY.md](./COMPATIBILITY.md)
- Besoin des détails d'installation ou d'auto-hébergement ? Voir [DEPLOYMENT.md](./DEPLOYMENT.md)

## Pourquoi je ne vois que des données Demo ?

ClawClip affiche les données Demo intégrées quand il n'a pas encore trouvé de sessions locales réelles compatibles. La démo publique en ligne n'utilise volontairement que des données d'exemple.

- Si vous voulez voir vos propres runs, utilisez votre instance locale ou auto-hébergée.
- L'étape la plus sûre consiste à lancer d'abord quelques tâches, puis à pointer ClawClip vers le dossier qui contient `agents/<agent>/sessions/*.jsonl` ou `<root>/sessions/*.jsonl`.
- Si vous restez toujours sur Demo, passez à **« Pourquoi la page s'ouvre mais aucune session n'apparaît ? »** plus bas.

## Comment faire scanner un répertoire de logs personnalisé par ClawClip ?

Pointez ClawClip vers la **racine de données**, pas vers un seul fichier de transcript.

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw
CLAWCLIP_LOBSTER_DIRS=/data/runs;/data/export
CLAWCLIP_SESSION_EXTENSIONS=.jsonl,.ndjson
```

- `OPENCLAW_STATE_DIR` : remplace la racine d'état OpenClaw par défaut.
- `CLAWCLIP_LOBSTER_DIRS` : ajoute une ou plusieurs racines supplémentaires ; utilisez des virgules ou des points-virgules comme séparateurs.
- `CLAWCLIP_SESSION_EXTENSIONS` : utile seulement si vos transcripts ne sont pas en `.jsonl`.
- Les structures les plus sûres sont `agents/<agent>/sessions/*.jsonl` ou `<root>/sessions/*.jsonl`.
- Dans Docker, ces chemins doivent être **des chemins de conteneur**, pas des chemins de la machine hôte.

## Quel niveau de support réel pour OpenClaw / ZeroClaw / Claw / custom JSONL ?

En bref : **OpenClaw et ZeroClaw sont la voie principale. Claw et custom JSONL sont pris en charge en best-effort ; cela ne veut pas dire que « tout fonctionne ».**

- Le mieux pris en charge aujourd'hui, ce sont les structures locales de sessions JSONL au format officiel OpenClaw / ZeroClaw.
- ClawClip scanne aussi `~/.claw` lorsqu'il y trouve des transcripts compatibles.
- Le parseur couvre déjà les événements courants de type OpenClaw, plusieurs `tool_calls`, `tool_result` / `function_call_output`, les blocs reasoning / thinking, ainsi que certaines anciennes lignes de style chat-completions.
- La lecture directe de SQLite / `.db` / `.sqlite` n'est **pas encore** prise en charge.
- `sessions.json` peut aider pour les métadonnées, mais **ce n'est pas le transcript lui-même**.
- Si vous avez besoin de la frontière exacte, lisez [COMPATIBILITY.md](./COMPATIBILITY.md).

## Est-ce que mes données seront téléversées ?

Par défaut, non. La découverte des sessions, le parsing, le replay et l'analyse du scorecard tournent sur votre machine ou dans votre propre déploiement.

- Par défaut, ClawClip ne téléverse pas les données d'exécution de votre agent.
- L'unique étape réseau optionnelle est l'actualisation des prix publics ; elle met à jour les références tarifaires uniquement et n'envoie **pas** le contenu de vos sessions.
- Si vous hébergez ClawClip vous-même, vos données restent là où **vous** le déployez.

## Quand utiliser Docker, `npm start` ou le mode dev ?

Choisissez la configuration la plus légère qui suffit à votre usage.

- `npm start` : la façon la plus rapide d'utiliser ClawClip sur votre machine ou sur un serveur simple.
- Docker / `docker compose up --build` : plus adapté si vous voulez un déploiement isolé, des montages de volume plus clairs ou une exploitation serveur plus simple.
- `npm run dev:server` + `npm run dev:web` : uniquement pour les personnes qui développent ClawClip lui-même.
- Si vous lancez seulement `dev:server`, ouvrir `/` sans frontend compilé peut afficher un message backend au lieu de l'application complète. C'est normal.

Pour un guide plus complet, voir [DEPLOYMENT.md](./DEPLOYMENT.md).

## Pourquoi la page s'ouvre mais aucune session n'apparaît ?

La plupart du temps, ClawClip fonctionne très bien ; il n'a simplement pas encore trouvé de transcripts compatibles.

- Vérifiez que vous avez réellement lancé des tâches et généré des transcripts.
- Vérifiez que le chemin de scan pointe vers le dossier **au-dessus de** `agents/<agent>/sessions`, et pas vers un seul fichier JSONL.
- Dans Docker, confirmez que le dossier hôte est bien monté et que les variables d'environnement pointent vers le **chemin dans le conteneur**.
- Si votre runtime stocke surtout les sessions dans SQLite / DB, exportez ou synchronisez d'abord en JSONL.
- Si vos fichiers utilisent une autre extension, définissez `CLAWCLIP_SESSION_EXTENSIONS`.
- Si vous n'avez que des fichiers de configuration ou `sessions.json`, cela ne suffit toujours pas pour obtenir un transcript rejouable.

## Pourquoi le score n'est-il pas un « score benchmark standard » ?

Parce que ClawClip n'évalue pas votre agent sur un jeu de tests universel unique. L'Agent Scorecard est un **diagnostic heuristique** construit à partir du comportement de vos propres exécutions locales.

- Servez-vous-en pour comparer l'avant/après, orienter les itérations et relire plus vite.
- Ne le considérez **pas** comme une preuve de benchmark fournisseur ni comme un classement universel entre équipes.
- Les scores et courbes de la Demo sont illustratifs ; les vraies sessions comptent beaucoup plus.

## Les données de prix sont-elles en temps réel ?

Pas au sens strict d'un « tableau de facturation en direct ». ClawClip embarque une table statique de secours déjà vérifiée, et peut actualiser des références tarifaires publiques plus récentes quand le réseau est activé.

- Utilisez-la pour comprendre la direction des coûts et juger si une optimisation valait le coup.
- Ne l'utilisez pas comme autorité finale pour contester ligne par ligne une facture fournisseur.
- Les modèles tout nouveaux ou aux noms inhabituels peuvent temporairement retomber sur une estimation, le temps que le mapping de prix soit mis à jour.
