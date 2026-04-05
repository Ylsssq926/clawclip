<div align="center">

<img src="luelan-logo.png" alt="ClawClip ロゴ" width="96" />

# ClawClip

**AI Agent のローカル診断台**

実行インサイト · Agent 成績表 · コストレポート — OpenClaw、ZeroClaw、そして実用的なローカル JSONL ワークフローのために。

<p>
  <a href="https://clawclip.luelan.online">ライブデモ</a> ·
  <a href="#quick-start">クイックスタート</a> ·
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
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> ClawClip は AI Agent の「能力成績表」と「コスト請求書」です。  
> 単なるログ再生ではありません。文章作成、コーディング、ツール利用、検索、安全性、費用対効果の 6 次元で、あなたの Agent が何点なのか、いくら使ったのか、前回より改善したのかを示します。  
> 100% ローカル実行。データは外部に出ません。

<a id="quick-start"></a>

## クイックスタート

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080` を開くと、まず同梱のデモセッションをローカルで確認でき、その後に自分の OpenClaw / ZeroClaw ログを読み込めます。

<a id="core-capabilities"></a>

## コア機能

| 機能 | できること |
| --- | --- |
| 🔍 **実行インサイト（Run Insights）** | 思考、ツール呼び出し、エラー、リトライ、結果を 1 ステップずつ確認し、レビュー可能な証拠チェーンにまとめます |
| 📊 **Agent 成績表（Agent Scorecard）** | 実際の実行ログから、文章作成 / コーディング / ツール利用 / 検索 / 安全性 / 費用対効果の 6 次元をヒューリスティックに採点します |
| 💰 **コストレポート（Cost Report）** | モデル別の費用内訳、推移、予算への気づき、節約ポイントを把握できます |
| 📈 **Prompt 効率（Prompt Efficiency）** | Prompt に投入したトークンやコストに対して、結果が見合っているかを評価します |
| 🔄 **バージョン比較（Version Compare）** | モデル、Prompt、設定、実行結果を並べて比較し、何が改善し何が後退したかを見極めます |
| 📚 **テンプレートライブラリ + ナレッジベース（Template Library + Knowledge Base）** | うまくいったテンプレートを再利用し、過去セッションを検索し、ローカルの改善知識を蓄積します |

## 互換性

ClawClip は **OpenClaw** と **ZeroClaw** の公式セッション構造を優先してサポートします。  
その他のローカル JSONL ベース Agent については、実際のフォーマット対応状況に合わせて段階的に拡張します。

## スコアリング方法

> Agent 成績表は **Heuristic Scorecard** に基づいています。返信品質、ツール利用、安全性の兆候、コスト構造など、セッションログ内の行動シグナルを分析します。標準化されたテストセットによる厳密なベンチマークではなく、実行品質を素早く診断するためのシグナルです。

## データソース

| ソース | 説明 |
| --- | --- |
| `~/.openclaw/` | 起動時に自動検出される OpenClaw の既定セッションディレクトリ |
| `OPENCLAW_STATE_DIR` | OpenClaw の既定状態パスを上書き |
| `CLAWCLIP_LOBSTER_DIRS` | 追加のローカルセッションフォルダをスキャン対象に追加 |
| 同梱デモセッション | 実データを読み込まなくても Run Insights、Scorecard、Cost Report を体験可能 |
| ZeroClaw のエクスポート / 追加 JSONL フォルダ | パーサ対応の成熟に合わせて順次サポート |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## ロードマップ

### v1.0 — ツール成熟
- Run Insights、Agent Scorecard、Cost Report を日常的に使えるローカル診断ツールとして安定化する
- 証拠レビュー体験、取り込み導線、OpenClaw / ZeroClaw 互換性を強化する
- ローカルファーストな操作感を速く、分かりやすく、信頼できるものにする

### v1.5 — 最適化ループ
- Prompt 効率、バージョン比較、節約提案をさらに強化する
- 診断結果を再現可能な最適化提案と変更後の検証フローにつなげる
- テンプレートライブラリ + ナレッジベースを実用的な改善ループに育てる

### v2.0 — チーム活用
- チーム向けレビュー画面、共有レポート、ベースライン比較フローを追加する
- シナリオライブラリ、定期評価、複数ランの要約に対応する
- 単発の実行ではなく、チーム全体で Agent の品質とコストを管理できるようにする

## エビの物語

> 私は OpenClaw の潮だまりから拾い上げられた小さなエビでした。
>
> 主人は言いました。「お前は一日中動いているのに、本当に良くなったのか、ただ高くなっただけなのか誰にも分からない。」
>
> 私は答えました。「じゃあ、生ログを眺めるのはやめよう。実行を証拠に変えて、成績表をつけて、請求書を見せればいい。」
>
> こうして ClawClip は、Agent が何をし、どれだけうまくやり、いくらかかったのかをローカルで見直すための机になりました。
>
> — 🍤 ClawClip マスコット

## Community

- QQ グループ: `892555092`
- 不具合報告と提案: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
