<div align="center">

<img src="luelan-logo.png" alt="ClawClip ロゴ" width="96" />

# ClawClip

**ローカル Agent 診断台 · v1.1.0**

Agent が実際に何をしたのかを見る。  
その実行が持ちこたえたかを判断する。  
最適化が本当にコストに見合ったかを確かめる。

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
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="セッション解析はローカルで完結" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> ClawClip は、生の Agent セッションを信頼できるレビュー台に変えます。  
> 実行全体を証拠として見せ、Agent が持ちこたえたかを点検し、その品質をコストと結びつけることで、「良くなった」が本当に値段に見合うかを判断できます。
>
> **境界を先に明示します：** セッション解析はローカルで完結し、Agent の実行データはアップロードされません。価格更新は、公開料金の最新参考値が必要なときだけ任意で行えます。

<a id="core-capabilities"></a>

## ClawClip が先に答える 3 つの問い

| 本当に知りたいこと | ClawClip の答え |
| --- | --- |
| **Agent は実際に何をしたのか？** | **Run Insights** が思考の流れ、ツール呼び出し、リトライ、エラー、結果を 1 本のレビュー可能な証拠チェーンとして再構成します |
| **その実行は本当に持ちこたえたのか？** | **Agent Scorecard** が文章作成、コーディング、ツール利用、検索、安全性、コスト効率を実用的なヒューリスティックで読み解きます |
| **その最適化は本当に元が取れたのか？** | **Cost Report** がモデル別・利用別にコストを分解し、得られた改善が請求額に見合うかを見える化します |

## v1.1.0 で使えるもの

| このリリースに入っているもの | 役に立つ理由 |
| --- | --- |
| **Prompt 効率** | トークンや Prompt の複雑さを増やしたぶん、本当に十分な成果が返ってきているかを確認できます |
| **バージョン比較** | モデル、Prompt、設定、実行結果を横並びで比べ、実際の改善と実際の後退を見分けられます |
| **テンプレートライブラリ + ナレッジベース** | うまくいった型を再利用し、ローカル履歴を検索し、散らばったセッションを改善の記憶に変えます |
| **同梱デモセッション** | 実データに触る前に、一連の流れをそのまま試せます |

## ローカル優先、でも言い切りすぎない

- セッション検出、解析、診断は手元の環境で完結します。
- ClawClip は Agent の実行データをアップロードしません。
- 公開価格の更新は任意で、コスト参照を新しくするためにだけ使われます。
- この価格更新でセッション内容が送信されることはありません。

<a id="quick-start"></a>

## クイックスタート

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080` を開くと、まず同梱のデモセッションをローカルで確認でき、その後に自分の OpenClaw / ZeroClaw ログを読み込めます。

## 互換性

ClawClip は **OpenClaw** と **ZeroClaw** の公式セッション構造を優先してサポートします。  
その他のローカル JSONL ベース Agent については、実際のフォーマット対応状況に合わせて段階的に拡張します。

## Scorecard の読み方

> Agent Scorecard は **ヒューリスティックな診断** であり、厳密な benchmark の順位表ではありません。実セッションの返信品質、ツール利用、安全性の兆候、コスト構造などの行動シグナルを読み取り、レビューを速くし、改善方向を比較しやすくするためのものです。

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

## v1.1.0 の次

- Prompt、モデル、設定変更の前後比較をもっと分かりやすくする
- OpenClaw / ZeroClaw の対応を深めつつ、周辺のローカル JSONL ランタイムも広げる
- ローカル優先の核を崩さず、チーム向けに共有しやすいレビュー出力を増やす

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
