<div align="center">

<img src="luelan-logo.png" alt="Logo ClawClip" width="96" />

# ClawClip

**Console locale de diagnostic d'agents · v1.1.0**

Voyez ce que votre agent a vraiment fait.  
Vérifiez si l'exécution a tenu.  
Comparez le résultat avec le coût.

Run Insights · Agent Scorecard · Cost Report — pour OpenClaw, ZeroClaw et la revue locale de sessions JSONL.

<p>
  <a href="https://clawclip.luelan.online">Démo en ligne</a> ·
  <a href="#quick-start">Démarrage rapide</a> ·
  <a href="#visual-proof">Aperçu</a> ·
  <a href="./docs/FAQ.fr.md">FAQ</a> ·
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

> Ouvrez une session et voyez ce qui s'est passé.  
> Vérifiez si l'exécution a vraiment tenu.  
> Comparez le résultat avec le coût avant de garder le changement.

<a id="visual-proof"></a>

## Voyez-le en 15 secondes

Chargez une exécution et répondez vite à trois questions : qu'est-ce qui s'est passé, est-ce que ça a tenu, et est-ce que la dépense en valait la peine.

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip transforme une exécution d'agent en Run Insights, Agent Scorecard et Cost Report" />
</p>

<a id="core-capabilities"></a>

## Trois questions auxquelles vous répondez vite

| La vraie question | Ce que ClawClip vous donne |
| --- | --- |
| **Qu'a vraiment fait l'agent ?** | **Run Insights** déroule l'exécution étape par étape pour que vous puissiez la relire sans fouiller dans des logs bruts |
| **Est-ce que l'exécution a vraiment tenu ?** | **Agent Scorecard** donne un diagnostic rapide en six volets : rédaction, code, usage des outils, recherche, sécurité et rapport coût-performance |
| **Est-ce que l'optimisation valait le coup ?** | **Cost Report** détaille la dépense par modèle et par usage pour montrer si le gain justifiait la facture |

## Ce qui arrive dans v1.1.0

| Inclus dans cette version | Pourquoi c'est utile |
| --- | --- |
| **Prompt Efficiency** | Vérifiez si davantage de tokens et des prompts plus complexes achètent vraiment assez de qualité pour se justifier |
| **Version Compare** | Comparez côte à côte modèles, prompts, configurations ou exécutions pour repérer gains et régressions |
| **Template Library + Knowledge Base** | Réutilisez ce qui marche, cherchez dans l'historique local et rassemblez en un seul endroit les apprentissages de session |
| **Sessions de démonstration intégrées** | Découvrez tout le flux avant de toucher à de vraies données de projet |

## Ce qui reste en local

- La découverte, le parsing et l'analyse des sessions se font sur votre machine.
- ClawClip ne téléverse pas les données d'exécution de l'agent.
- L'actualisation des prix publics est optionnelle si vous voulez des références tarifaires plus récentes.
- Cette étape n'envoie le contenu de vos sessions nulle part.

<a id="quick-start"></a>

## Démarrage rapide

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Ouvrez `http://localhost:8080` pour examiner d'abord les sessions de démonstration incluses en local, puis charger vos propres logs OpenClaw / ZeroClaw.

## Compatibilité

ClawClip privilégie actuellement les structures de session officielles de **OpenClaw** et **ZeroClaw**.  
Le support d'autres runtimes locaux basés sur JSONL s'élargira progressivement à mesure que la couverture du parseur avance.

## Comment lire le scorecard

> L'Agent Scorecard est une **lecture heuristique**, pas un classement benchmark. Il observe des signaux de session — qualité de réponse, usage des outils, indices de sécurité et structure de coût — pour vous aider à comparer des itérations plus vite.

## Sources de session

| Source | Utilité |
| --- | --- |
| `~/.openclaw/` | Répertoire de session OpenClaw par défaut, détecté automatiquement au démarrage |
| `OPENCLAW_STATE_DIR` | Remplace le chemin d'état OpenClaw par défaut |
| `CLAWCLIP_LOBSTER_DIRS` | Ajoute des dossiers locaux supplémentaires à l'analyse des sessions |
| Sessions de démonstration intégrées | Permettent d'explorer Run Insights, Agent Scorecard et Cost Report sans importer de données réelles |
| Exportations ZeroClaw / dossiers JSONL supplémentaires | Pris en charge progressivement à mesure que la couverture de formats grandit |

## Pourquoi la mascotte est une crevette

> La mascotte est une crevette parce que ClawClip a commencé autour de la revue d'exécutions OpenClaw.
>
> Et la vraie question a suivi : « Est-ce que cet agent s'est vraiment amélioré, ou est-ce qu'il coûte juste plus cher ? »
>
> C'est toujours ce qui définit le produit : rejouer l'exécution, vérifier si elle a tenu, puis comparer le résultat au coût.
>
> — 🍤 Mascotte ClawClip

<a id="roadmap"></a>

## Après v1.1.0

- Rendre plus claire la validation avant/après pour les changements de prompt, de modèle et de configuration
- Approfondir la couverture OpenClaw / ZeroClaw et élargir le support vers des runtimes JSONL locaux voisins
- Ajouter davantage de sorties de revue partageables pour les équipes tout en gardant les sessions en local

## Communauté

- Groupe QQ : `892555092`
- Problèmes et suggestions : [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## Licence

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
