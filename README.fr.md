<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Outil local de diagnostic pour AI Agents**

Run Insights · Agent Scorecard · Cost Report — pour OpenClaw, ZeroClaw et des workflows JSONL locaux réellement pragmatiques.

<p>
  <a href="https://clawclip.luelan.online">Démo en ligne</a> ·
  <a href="#quick-start">Démarrage rapide</a> ·
  <a href="#core-capabilities">Capacités clés</a> ·
  <a href="#roadmap">Feuille de route</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <strong>Français</strong> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="Démo en ligne" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="Licence MIT" /></a>
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw et ZeroClaw" />
</p>

</div>

> ClawClip est un outil de diagnostic local-first pour les AI Agents.  
> Il transforme des logs de session JSONL en preuves vérifiables, note votre agent sur 6 dimensions et suit chaque centime dépensé.  
> 100% local. Zéro cloud. Zéro appel API.

<a id="quick-start"></a>

## Démarrage rapide

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Ouvrez `http://localhost:8080` pour examiner d'abord les sessions de démonstration incluses, puis charger vos propres logs OpenClaw / ZeroClaw.

<a id="core-capabilities"></a>

## Capacités clés

| Capacité | Ce que cela vous permet de faire |
| --- | --- |
| 🔍 **Analyse d'exécution (Run Insights)** | Examiner chaque étape de raisonnement, appel d'outil, erreur, relance et résultat comme une chaîne de preuves exploitable |
| 📊 **Bulletin de l'agent (Agent Scorecard)** | Noter de façon heuristique l'écriture, le code, l'usage des outils, la recherche, la sécurité et le rapport coût-performance à partir du comportement réel |
| 💰 **Rapport de coûts (Cost Report)** | Ventiler la dépense par modèle, suivre les tendances, déclencher des alertes budgétaires et repérer des pistes d'économie |
| 📈 **Efficacité des prompts (Prompt Efficiency)** | Comparer la qualité produite au volume de tokens et au coût investis dans chaque prompt |
| 🔄 **Comparaison de versions (Version Compare)** | Comparer côte à côte modèles, prompts, configurations ou exécutions pour voir ce qui progresse et ce qui régresse |
| 📚 **Bibliothèque de modèles + base de connaissances (Template Library + Knowledge Base)** | Réutiliser des modèles qui fonctionnent, rechercher dans l'historique et construire une mémoire locale d'itération |

## Compatibilité

ClawClip privilégie les structures de session officielles de **OpenClaw** et **ZeroClaw**.  
La prise en charge d'autres runtimes locaux basés sur JSONL sera élargie progressivement, selon la couverture réelle des formats.

## Méthode de notation

> L'Agent Scorecard repose sur une approche de **Heuristic Scorecard**. Il analyse des signaux comportementaux dans les logs de session — comme la qualité des réponses, l'usage des outils, les indices de sécurité et la structure de coût. Ce n'est pas un benchmark strict basé sur un jeu de tests standardisé ; c'est un signal rapide de diagnostic de la qualité d'exécution.

## Sources de données

| Source | Notes |
| --- | --- |
| `~/.openclaw/` | Répertoire de session OpenClaw par défaut, détecté automatiquement au démarrage |
| `OPENCLAW_STATE_DIR` | Remplace le chemin d'état OpenClaw par défaut |
| `CLAWCLIP_LOBSTER_DIRS` | Ajoute des dossiers locaux supplémentaires à analyser |
| Sessions de démonstration intégrées | Permettent d'explorer Run Insights, Scorecard et Cost Report sans importer de données réelles |
| Exportations ZeroClaw / dossiers JSONL additionnels | Compatibilité étendue progressivement à mesure que le parseur mûrit |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## Feuille de route

### v1.0 — Maturité de l'outil
- Stabiliser Run Insights, Agent Scorecard et Cost Report comme trio central du diagnostic local
- Améliorer la revue des preuves, l'import des données et la compatibilité OpenClaw / ZeroClaw
- Rendre le flux local-first rapide, lisible et fiable au quotidien

### v1.5 — Boucle d'optimisation
- Renforcer Prompt Efficiency, Version Compare et les recommandations d'économies
- Relier le diagnostic à des recommandations actionnables et à la validation après changement
- Faire de Template Library + Knowledge Base une boucle d'itération concrète

### v2.0 — Travail en équipe
- Ajouter des vues de revue pour les équipes, des rapports partageables et des comparaisons de référence
- Prendre en charge des bibliothèques de scénarios, des évaluations récurrentes et des synthèses multi-exécutions
- Aider les équipes à piloter ensemble la qualité et le coût des agents

## L'histoire de la crevette

> J'étais une petite crevette repêchée dans la marée OpenClaw.
>
> Mon propriétaire a dit : « Tu travailles toute la journée, mais personne ne sait si tu progresses vraiment ou si tu coûtes juste plus cher. »
>
> J'ai répondu : « Alors arrêtez de fixer les logs bruts. Transformez mes exécutions en preuves, donnez-moi un bulletin et montrez la facture. »
>
> C'est ainsi que ClawClip est devenu un bureau local pour revoir ce qu'un agent a fait, à quel niveau, et à quel coût.
>
> — 🍤 Mascotte ClawClip

## Community

- Groupe QQ : `892555092`
- Problèmes et suggestions : [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
