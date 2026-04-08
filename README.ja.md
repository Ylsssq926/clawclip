<div align="center">

<img src="luelan-logo.png" alt="ClawClip ロゴ" width="96" />

# ClawClip

**ローカル Agent 診断コンソール · v1.1.0**

Agent が何をしたかを見る。  
その実行が持ちこたえたかを確かめる。  
結果がコストに見合ったかを比べる。

Run Insights · Agent Scorecard · Cost Report — OpenClaw、ZeroClaw、ローカル JSONL セッションのレビューのために。

<p>
  <a href="https://clawclip.luelan.online">ライブデモ</a> ·
  <a href="#quick-start">クイックスタート</a> ·
  <a href="#visual-proof">プレビュー</a> ·
  <a href="./docs/FAQ.ja.md">FAQ</a> ·
  <a href="#core-capabilities">コア機能</a> ·
  <a href="#roadmap">ロードマップ</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <strong>日本語</strong> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="ライブデモ" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="MIT ライセンス" /></a>
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="セッション解析はローカルで完結" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw と ZeroClaw" />
</p>

</div>

> セッションを開いて、何が起きたかを見る。  
> その実行が持ちこたえたかを確かめる。  
> 変更を採用する前に、結果とコストを比べる。

<a id="visual-proof"></a>

## 15秒でわかるプレビュー

1 回の実行を読み込むだけで、「何が起きたか」「持ちこたえたか」「その支出に見合ったか」の 3 点をすばやく確認できます。

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip が 1 回の Agent 実行を Run Insights、Agent Scorecard、Cost Report にまとめる様子" />
</p>

<a id="core-capabilities"></a>

## すぐに答えを出せる 3 つの問い

| 実際に知りたいこと | ClawClip が返すもの |
| --- | --- |
| **Agent は実際に何をしたのか？** | **Run Insights** が実行をステップごとに並べるので、生ログを掘り返さなくてもレビューできます |
| **その実行は本当に持ちこたえたのか？** | **Agent Scorecard** が、文章作成・コーディング・ツール利用・検索・安全性・コスト効率の 6 項目を手早く診断します |
| **その最適化は本当に元が取れたのか？** | **Cost Report** がモデル別・利用別にコストを分解し、得られた改善が請求額に見合ったかを見える化します |

## v1.1.0 に含まれるもの

| このリリースに含まれるもの | 重要な理由 |
| --- | --- |
| **Prompt Efficiency** | 余分なトークンや Prompt の複雑さが、それに見合うだけの出力品質を本当に買えているかを確認できます |
| **Version Compare** | モデル、Prompt、設定、実行結果を横並びで比較し、改善と後退を見分けられます |
| **Template Library + Knowledge Base** | うまくいった型を再利用し、ローカル履歴を検索し、セッションから得た学びを 1 か所にまとめられます |
| **同梱デモセッション** | 実際のプロジェクトデータに触る前に、全体の流れを確認できます |

## ローカルに残るもの

- セッションの検出、解析、診断は手元のマシンで完結します。
- ClawClip は Agent の実行データをアップロードしません。
- 公開価格の更新は、最新の参考価格が必要な場合にだけ使える任意機能です。
- その更新でも、セッション内容がどこかへ送信されることはありません。

<a id="quick-start"></a>

## クイックスタート

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080` を開くと、まず同梱のデモセッションをローカルで確認でき、その後に自分の OpenClaw / ZeroClaw ログを読み込めます。

## 互換性

ClawClip は現在、**OpenClaw** と **ZeroClaw** の公式セッション構造を優先してサポートしています。  
その他のローカル JSONL ランタイムについては、パーサ対応の範囲が広がるにつれて段階的に拡張されます。

## Scorecard の読み方

> Agent Scorecard は **ヒューリスティックな読み取り** であり、benchmark の順位表ではありません。レスポンス品質、ツール利用、安全性のヒント、コスト構造といったセッションのシグナルを見て、反復比較を速くするためのものです。

## セッションソース

| ソース | 用途 |
| --- | --- |
| `~/.openclaw/` | 起動時に自動検出される OpenClaw の既定セッションディレクトリ |
| `OPENCLAW_STATE_DIR` | OpenClaw の既定 state パスを上書き |
| `CLAWCLIP_LOBSTER_DIRS` | 追加のローカルフォルダをセッションスキャン対象に追加 |
| 同梱デモセッション | 実データを取り込まなくても Run Insights、Agent Scorecard、Cost Report を試せます |
| ZeroClaw のエクスポート / 追加 JSONL フォルダ | フォーマット対応が広がるにつれて順次サポートされます |

## なぜマスコットはエビなのか

> ClawClip のマスコットがエビなのは、OpenClaw の実行レビューから始まったプロダクトだからです。
>
> そこから本当の問いが残りました。「この Agent は本当に良くなったのか。それとも高くなっただけなのか。」
>
> だから ClawClip は、実行を見返し、持ちこたえたかを確認し、結果とコストを並べて判断するための道具です。
>
> — 🍤 ClawClip マスコット

<a id="roadmap"></a>

## v1.1.0 の次

- Prompt、モデル、設定変更の前後比較をもっと分かりやすくする
- OpenClaw / ZeroClaw の対応を深めつつ、周辺のローカル JSONL ランタイムも広げる
- セッションをローカルに保ったまま、チーム向けに共有しやすいレビュー出力を増やす

## コミュニティ

- QQ グループ: `892555092`
- 不具合報告と提案: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## ライセンス

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
