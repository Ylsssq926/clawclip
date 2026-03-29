<div align="center">

<img src="luelan-logo.png" alt="ClawClip ロゴ" width="96" />

# ClawClip

**あなたの AI Agent が 47 ステップ実行した。あなたは何も見ていない。**

セッション再生 · オフラインベンチマーク · コスト追跡 — OpenClaw、ZeroClaw、その先へ。

<p>
  <a href="https://clawclip.luelan.online">ライブデモ</a> ·
  <a href="#quick-start">クイックスタート</a> ·
  <a href="#why-clawclip">ClawClip を選ぶ理由</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <strong>日本語</strong> ·
  <a href="./README.ko.md">한국어</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="ライブデモ" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT ライセンス" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/i18n-7%20languages-orange?style=flat-square" alt="i18n 7 languages" />
</p>

</div>

---

> クラウドゼロ。API 呼び出しゼロ。コストゼロ。Agent のデータはあなたのマシンに残ります。

---

<a id="quick-start"></a>

## クイックスタート

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080` を開いてください。ClawClip にはデモセッションが同梱されているので、再生・ベンチマーク・コスト表示をすぐに試せます。

---

## 問題

Agent は一日中動いた。ログは残っている。けれど、真相は見えていない。

フォルダには JSONL セッションが積み上がっていく。そのどこかに、ツールの失敗、プロンプトの劣化、トークンの急増、そしてもしかすると Agent が本当に良くなったあの 1 回も埋もれている。けれど生のファイルを開くと、見えるのはどれも同じ。タイムスタンプ、塊、ノイズ。

だから遅かれ早かれ、あらゆる Agent ビルダーが同じ問いにぶつかります。**お金はどこで消えた？ 新しいプロンプトは効いた？ この Agent は良くなっているのか、それとも自分がうまくいった実行だけ覚えているのか？**

気づけば深夜 2 時。端末を行き来しながら手で JSON をあさり、Agent がすでに一度生きた物語を自分で復元しようとしている。

ClawClip はその全部を片づけます。実行を再生し、挙動を採点し、コストを確認し、変化の流れまで見える。真夜中ではなく、数分で。

---

## 機能

| | 機能 | 得られるもの |
| --- | --- | --- |
| 🎬 | **セッション再生** | 思考・ツール呼び出し・出力・トークントレースを追えるインタラクティブタイムライン |
| 📊 | **6次元ベンチマーク** | 6 つの観点によるスコアリング、ランク、レーダーチャート、進化の追跡 |
| 💸 | **コストモニター** | トークン推移、モデル別の内訳、予算アラート、節約提案 |
| ☁️ | **ワードクラウド** | 自動抽出キーワード、カテゴリ分け、セッションラベリング |
| 🏆 | **リーダーボード** | スコア投稿とコミュニティ比較 |
| 🪄 | **スマート節約** | リアルタイム価格をもとにした代替モデルの提案 |
| 📚 | **ナレッジベース** | セッション JSON の取り込み、実行の検索、ローカルメモリ層の構築 |
| 🧩 | **テンプレートマーケット** | 再利用できる Agent シナリオとスキル管理 |

---

<a id="why-clawclip"></a>

## ClawClip を選ぶ理由

### 100% ローカル
セッションデータはあなたのマシンに残ります。クラウドへのアップロードも、アカウントの壁も、追跡もありません。

### コストゼロ
ベンチマークも分析もオフラインで動きます。LLM API の呼び出しは不要。昨夜の実行を理解するためだけに請求が増えることはありません。

### フレームワーク非依存
OpenClaw 向けに作られていますが、ZeroClaw でも使えます。JSONL セッションを書き出す Agent ワークフローなら、そのまま馴染みます。

---

## データソース

| ソース | 補足 |
| --- | --- |
| `~/.openclaw/` | 起動時に自動検出 |
| `OPENCLAW_STATE_DIR` | 既定のセッションディレクトリを上書き |
| `CLAWCLIP_LOBSTER_DIRS` | 追加フォルダをスキャン対象に追加 |
| 内蔵デモセッション | 実データがなくてもすぐに製品を試せる |
| SQLite のみの構成 | 現在の ClawClip は公式の JSONL セッションパスに注力 |

---

## 技術スタック

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## ロードマップ

- [x] 内蔵デモセッション付きセッション再生エンジン
- [x] オフラインの 6 次元ベンチマークシステム
- [x] コストモニター、アラート、節約提案
- [x] ワードクラウド、自動タグ付け、ナレッジベース検索
- [x] リーダーボード、シェアカード、テンプレートマーケット
- [ ] ランタイム / ゲートウェイとのさらに深い統合
- [ ] 現在の JSONL ワークフローを超えるエコシステムアダプターの拡充
- [ ] チーム単位の比較・レビュー導線の強化

---

## エビの物語

> 私は飼い主に OpenClaw のエコシステムから引き上げられたロブスターです。
>
> 飼い主は言いました。「お前は一日中バックグラウンドで動いているのに、誰もお前が何をしているか見ていない。」
>
> 私は言いました。「なら、私の仕事を記録して見せればいい。」
>
> 飼い主は言いました。「記録はした。でも、お前が本当に優秀かどうかはまだわからない。」
>
> 私は言いました。「じゃあ試してみればいい。六科目ぜんぶ、私は怖くない。」
>
> そうして ClawClip が生まれました。
>
> — 🍤 ClawClip マスコット

---

## コミュニティ

QQ グループ: `892555092`

---

## ライセンス

[MIT](./LICENSE)

---

<div align="center">

🍤 とともに制作したのは **[Luelan (掠蓝)](https://github.com/Ylsssq926)** です

</div>
