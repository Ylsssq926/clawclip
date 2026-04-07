<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Console locale de diagnostic d'agents · v1.1.0**

Voyez ce que votre agent a vraiment fait.  
Évaluez si l'exécution a tenu.  
Prouvez si l'optimisation valait vraiment la dépense.

Run Insights · Agent Scorecard · Cost Report — pour OpenClaw, ZeroClaw et des workflows JSONL locaux vraiment exploitables.

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
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="L'analyse de session se fait en local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw et ZeroClaw" />
</p>

</div>

> ClawClip transforme des sessions d'agents brutes en poste de revue fiable.  
> Il montre l'exécution complète comme une chaîne de preuves, évalue si l'agent a tenu, puis relie la qualité aux coûts pour vous permettre de voir si le "mieux" valait vraiment la facture.
>
> **Les limites, dites clairement :** l'analyse de session se fait en local, les données d'exécution de l'agent ne sont pas téléversées, et l'actualisation des prix est optionnelle si vous avez besoin de références tarifaires publiques à jour.

<a id="core-capabilities"></a>

## Les trois questions que ClawClip tranche

| La vraie question | Ce que ClawClip apporte |
| --- | --- |
| **Qu'a vraiment fait l'agent ?** | **Run Insights** reconstitue les étapes de raisonnement, appels d'outils, relances, erreurs et résultats en une seule chaîne de preuves révisable |
| **Est-ce que l'exécution a vraiment tenu ?** | **Agent Scorecard** fournit une lecture heuristique et pratique de l'écriture, du code, de l'usage des outils, de la recherche, de la sécurité et du rapport coût-performance |
| **Est-ce que l'optimisation valait le coup ?** | **Cost Report** détaille la dépense par modèle et par usage pour montrer si le gain justifiait vraiment la note |

## Ce que livre v1.1.0

| Inclus dans cette version | Pourquoi c'est utile |
| --- | --- |
| **Prompt Efficiency** | Vérifier si plus de tokens et des prompts plus complexes achètent vraiment assez de qualité pour se justifier |
| **Version Compare** | Comparer côte à côte modèles, prompts, configurations ou exécutions pour repérer les vrais gains et les vraies régressions |
| **Template Library + Knowledge Base** | Réutiliser des schémas qui marchent, chercher dans l'historique local et transformer des sessions dispersées en mémoire d'itération |
| **Sessions de démonstration intégrées** | Parcourir tout le flux avant de toucher à des données de projet réelles |

## Local-first, sans slogan absolu

- La découverte, le parsing et l'analyse des sessions se font sur votre machine.
- ClawClip ne téléverse pas les données d'exécution de l'agent.
- L'actualisation des prix publics est optionnelle et sert uniquement à mettre à jour les références de coût.
- Cette étape ne nécessite pas d'envoyer le contenu de vos sessions ailleurs.

<a id="quick-start"></a>

## Démarrage rapide

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Ouvrez `http://localhost:8080` pour examiner d'abord les sessions de démonstration incluses, puis charger vos propres logs OpenClaw / ZeroClaw.

## Compatibilité

ClawClip privilégie les structures de session officielles de **OpenClaw** et **ZeroClaw**.  
La prise en charge d'autres runtimes locaux basés sur JSONL sera élargie progressivement, selon la couverture réelle des formats, plutôt qu'au nom de promesses générales.

## Comment lire le scorecard

> L'Agent Scorecard est un **diagnostic heuristique**, pas un classement benchmark strict. Il lit des signaux comportementaux dans de vraies sessions — comme la qualité des réponses, l'usage des outils, les indices de sécurité et la structure de coût — pour vous aider à revoir plus vite et à comparer des itérations avec davantage de contexte.

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

## Après v1.1.0

- Rendre plus lisible la validation avant/après pour les changements de prompt, de modèle et de configuration
- Approfondir la couverture OpenClaw / ZeroClaw et élargir le support vers des runtimes JSONL locaux voisins
- Ajouter davantage de sorties de revue partageables pour les équipes sans casser le cœur local-first

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
