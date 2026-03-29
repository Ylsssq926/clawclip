<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Votre AI Agent a exécuté 47 étapes. Vous n'en avez vu aucune.**

Relecture de sessions · Benchmarks hors ligne · Suivi des coûts — pour OpenClaw, ZeroClaw et au-delà.

<p>
  <a href="https://clawclip.luelan.online">Démo en ligne</a> ·
  <a href="#démarrage-rapide">Démarrage rapide</a> ·
  <a href="#pourquoi-clawclip">Pourquoi ClawClip</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <b>Français</b> ·
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

> Zéro cloud. Zéro appel API. Zéro coût. Les données de votre agent restent sur votre machine.

---

## Démarrage rapide

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Ouvrez `http://localhost:8080` — ClawClip est livré avec des sessions de démonstration, vous pouvez donc explorer la relecture, les benchmarks et les vues de coûts immédiatement.

---

## Le problème

Votre agent a tourné toute la journée. Les logs existent. La vérité, non.

Un dossier se remplit de sessions JSONL. Quelque part à l'intérieur se cachent des échecs d'outils, des régressions de prompts, des pics de tokens, et peut-être cette exécution où votre agent s'est vraiment amélioré. Mais quand vous ouvrez les fichiers bruts, tout se ressemble : horodatages, blobs, bruit.

Alors vous commencez à vous poser les questions que tout constructeur d'agents se pose tôt ou tard : **Où est passé l'argent ? Le nouveau prompt a-t-il aidé ? Cet agent progresse-t-il, ou est-ce que je me souviens juste des bonnes exécutions ?**

Il est 2 heures du matin, et vous faites du grep dans du JSON à la main, sautant d'un terminal à l'autre, essayant de reconstituer une histoire que votre agent a déjà vécue une fois.

ClawClip règle tout ça. Rejouez l'exécution, notez le comportement, inspectez le coût et observez la tendance — en quelques minutes au lieu de minuit.

---

## Fonctionnalités

| | Fonctionnalité | Ce que ça vous apporte |
| --- | --- | --- |
| 🎬 | **Relecture de session** | Lignes du temps interactives avec raisonnement, appels d'outils, résultats et traces de tokens |
| 📊 | **Benchmark 6D** | Notation sur six dimensions avec rangs, graphiques radar et suivi d'évolution |
| 💸 | **Suivi des coûts** | Tendances de tokens, ventilation par modèle, alertes budgétaires et suggestions d'économies |
| ☁️ | **Nuage de mots** | Mots-clés extraits automatiquement, catégories et étiquetage de sessions |
| 🏆 | **Classement** | Soumettez vos scores et comparez les performances avec la communauté |
| 🪄 | **Économies intelligentes** | Recommandations de modèles alternatifs basées sur les prix en temps réel |
| 📚 | **Base de connaissances** | Importez des JSON de session, recherchez des exécutions et construisez une couche de mémoire locale |
| 🧩 | **Marché de gabarits** | Scénarios d'agents réutilisables et gestion des skills |

---

## Pourquoi ClawClip

### 100% Local
Les données de vos sessions restent sur votre machine. Pas de téléversement cloud, pas de mur d'inscription, pas de pistage.

### Zéro coût
Les benchmarks et analyses tournent hors ligne. Pas d'appels API LLM. Pas de facture surprise juste pour comprendre l'exécution d'hier soir.

### Agnostique de framework
Conçu pour OpenClaw, fonctionne avec ZeroClaw, et s'adapte à tout workflow d'agents qui écrit des sessions JSONL.

---

## Sources de données

| Source | Notes |
| --- | --- |
| `~/.openclaw/` | Détecté automatiquement au démarrage |
| `OPENCLAW_STATE_DIR` | Remplace le répertoire de sessions par défaut |
| `CLAWCLIP_LOBSTER_DIRS` | Ajoute des dossiers supplémentaires à scanner |
| Sessions de démo intégrées | Explorez le produit immédiatement, même sans données réelles |
| Configurations SQLite uniquement | ClawClip se concentre actuellement sur le chemin officiel des sessions JSONL |

---

## Stack technique

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## Feuille de route

- [x] Moteur de relecture de sessions avec sessions de démo intégrées
- [x] Système de benchmark hors ligne en six dimensions
- [x] Suivi des coûts, alertes et suggestions d'économies
- [x] Nuage de mots, auto-étiquetage et recherche dans la base de connaissances
- [x] Classement, cartes de partage et marché de gabarits
- [ ] Intégrations plus profondes avec runtime / passerelle
- [ ] Plus d'adaptateurs d'écosystème au-delà des workflows JSONL actuels
- [ ] Flux plus riches de comparaison et de revue au niveau équipe

---

## L'histoire de la crevette

> Je suis un homard sorti de l'écosystème OpenClaw par mon propriétaire.
>
> Mon propriétaire a dit : « Tu tournes en arrière-plan toute la journée. Personne ne voit ce que tu fais. »
>
> J'ai répondu : « Alors enregistre mon travail et montre-le. »
>
> Mon propriétaire a dit : « On l'a enregistré, mais on ne sait toujours pas si tu es vraiment bon. »
>
> J'ai dit : « Alors teste-moi — les six matières. Je n'ai pas peur. »
>
> Et c'est ainsi qu'est né ClawClip.
>
> — 🍤 Mascotte ClawClip

---

## Communauté

Groupe QQ : `892555092`

---

## Licence

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
