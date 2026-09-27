# Hallmark Audit — RMA · Ruhrenberg Municipal Transport Authority

- **対象 (scope):** `/home/n0rb4hnh0f/git/RMA-official` の全 UI コンポーネント
  (`src/App.svelte` の 10 ビュー + 全セクション、`src/app.css` のコンポーネント層、`index.html`)
- **実施日:** 2026-09-27
- **verb:** `hallmark audit`(読み取りのみ。**ソースは 1 行も編集していない**)
- **参照した規約:** `.agents/skills/hallmark/references/{anti-patterns,slop-test,structure,contract}.md`
- **実行した検証:** `pnpm audit`(色彩コントラスト) / `pnpm verify`(データ整合)

---

## 0. 結論

```
4 critical · 12 major · 10 minor
Verdict — reads as AI-generated(構造とデータは本物だが、表皮が汎用 AI パターン)
        — critical 4 件を潰せば "close, fix the minors" まで戻せる
```

3 行で:

1. **骨格は AI テンプレではない。** hero → 3 機能カード → CTA → footer の反復ではなく、架空の交通局の
   *ディレクトリ(路線・駅) + データページ* として組まれている。実データから数値を引いており、
   捏造メトリクスがない。ここは Hallmark の gate 8 / 46 を素直に通過する。
2. **問題は「表皮」に集中している。** 全 29 セクション・43 個の eyebrow、見出し内 `<em>` のイタリック強調、
   8px の黄色下線、黄色の面塗り、列分割した eyebrow(左)+ 見出し(右)——AI 生成 UI の
   シグネチャが「装飾レイヤー」に積み上がっている。
3. **その装飾レイヤーは、既存の基礎レイヤーを後から上書きする形で継ぎ足されている。**
   `src/app.css` は 21 行分フリースタイルで書いたあと、22 行目からトークンを宣言し、
   58 行目でさらに上書きしている(3 層のカスケードパッチ)。結果、色数は 48 種類に膨らみ、
   ブランドページが掲げる `#D2402F` はコード上に存在しない。

---

## 1. 方法と限界(先に明示)

**やったこと**

- `src/App.svelte`(460 行)を全行読解し、ビュー/セクション単位に分解して評価。
- `src/app.css`(61 行だが minify 済みで巨大)を 170 文字ごとに折り返して全行読解し、
  規約名(`anti-patterns.md` の tell 名)と突き合わせ。
- `index.html`、`README.md`、`src/lib/*.ts`、`scripts/*.ts` を読解。
- 機械的エビデンスを採取: 色数 48 / CSS ルール 340 / トークン 9、`:active` 0 件・`:disabled` 0 件、
  eyebrow 43 件 / `<em>` in heading 9 件 / `<section>` 29 件、9–11px の type ルール 45 件、
  ブレークポイントは 760px の 1 系統のみ、など。
- `pnpm audit` → `✓ every text colour in src/app.css reaches 4.5:1`(ink 12.93:1 / muted 5.58:1 /
  red 5.33:1 / green 5.03:1)。`pnpm verify` → GTFS 生成・整合 OK。

**限界(ここは推計であり、断定ではない)**

- **レンダリングは生で見ていない。** ブラウザで実機確認していないため、リズム(余白の効き方)と
  折返しは CSS の数値からの推計。特に「ヘッダーがおよそ 760–930px で溢れる」は計算根拠つきの
  *疑い*であり、`768 / 810 / 834 / 1024px` での目視確認を推奨する(§4 C1 に算術を記載)。
- **genre 未宣言。** `design.md` / スタンプが無いため genre スコープの緩和
  (例: modern-minimal の pure white 許可)は一切適用せず、**universal gates のみ**で採点した。
- **`design.md` 不在のため system 監査(theme drift / family violation)は対象外。**
  代わりに「システムが宣言されていない」ことを minor として記録した。

---

## 2. 対象の構造フィンガープリント

| 面 | 現状の形 |
| --- | --- |
| ホーム | Split diptych hero(H2)+ inline form-as-CTA(C2)+ モードタイル grid + 2-up statement columns |
| ディレクトリ系 (`#/lines`, `#/stations`) | Index-First / Catalogue:page-intro → filter chips → hairline 行テーブル |
| 詳細系 (`#/lines/:id`, `#/stations/:id`) | Workbench:色面ヒーロー → facts grid → hairline list → 発車標 |
| 情報系 (`#/network`, `#/fleet`, `#/brand`, `#/group`, `#/contact`, 404) | Long Document 系:page-intro + detail-grid + 1 行注記 |

**gate 8 判定: PASS。** 「hero → 3 equal features → CTA → footer」ではない。
マクロ構造としての独自性はある(これがこの site の最大の資産)。

**gate 20 判定: 未達(advisory)。** `/* Hallmark · macrostructure: … */` スタンプが無く、
`design.md` も無い。どの層が「システム」で、どの層が「装飾」なのかがコードから読めない。
→ §6 m10 参照。

---

## 3. コンポーネント別監査マトリクス(全 26 面)

判定: ✅ 合格 / ⚠️ 要修正(major) / ⛔ 重大(critical) / ▫️ 軽微(minor)

| # | コンポーネント | 実装 | 主な指摘 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | グローバル基盤 / トークン | `app.css:1–22` | トークン宣言が 22 行目から。その手前に hex 直書き 21 行 | ⚠️ M3 |
| 2 | シェル / ヘッダー枠 | `App.svelte:123–137` `app.css:2` | 6.8% パディングの flex、`overflow:hidden` で溢れを隠す | ⛔ C1 |
| 3 | ナビゲーション(desktop) | `App.svelte:128–135` `app.css:2` | ワードマーク左 + 6 リンク右 + 全幅 + 1px 罫線 = AI nav の一歩手前 | ⚠️ M2 |
| 4 | モバイルナビ(シート) | `App.svelte:127–128` `app.css:3` | `z-index:4` は小スケール、`aria-expanded` あり | ✅ |
| 5 | スキップリンク / フォーカス層 | `app.css:48–52` | outline 3px・transition なし・`currentColor` 切替あり | ✅ |
| 6 | ヒーロー | `App.svelte:141–153` `app.css:2,58` | 見出し内 `<em>` イタリック + 8px 下線、block padding 非対称なし | ⛔ C4 / ⚠️ M4,M10 |
| 7 | ヒーロー装飾(hero-art) | `App.svelte:147–152` `app.css:2` | 実在しない 5 本の弧で「ネットワーク図」を演じている | ⚠️ M12 |
| 8 | 経路検索プランナー | `App.svelte:155–180` `app.css:2,4` | input/button 47px 揃い、`:active`/`:disabled` 無し、結果行が button | ⚠️ M8,M9 |
| 9 | セクションヘッド | `app.css:2` | eyebrow は見出しの直下(縦積み)、右端に text-link | ✅ |
| 10 | モードタイル | `App.svelte:187–191,217–221` `app.css:27–31,59–61` | `repeat(3,1fr)` → `auto-fit minmax(230px,1fr)` に修正済み | ✅ |
| 11 | ホーム 2 カラム | `App.svelte:195–208` `app.css:7` | 8% 内パディングで本文左端が 14.8% にずれる | ⚠️ M7 |
| 12 | ページイントロ | `app.css:7` | 74px/70px。ほぼ対称で下>上(許容域) | ✅ |
| 13 | ネットワーク原則 | `App.svelte:223–226` `app.css:7` | eyebrow 左カラム / 見出し右カラム → **gate 54 auto-fail** | ⛔ C2 |
| 14 | データページ / detail-grid / facility | `App.svelte:227–249` `app.css:12` | 1px hairline グリッドは秀逸。`min-height:260px` の均質カード | ⚠️ M6 |
| 15 | ラインディレクトリ(フィルタ + 行) | `App.svelte:250–271` `app.css:5–6` | 行テーブルは良い。フィルタ選択色が読めにくい赤 | ⚠️ M5 |
| 16 | ライン詳細(detail-hero / facts / stop-list) | `App.svelte:272–322` `app.css:12,58` | `[style*="--line"]` 属性セレクタでインライン style に勝ちにいく | ⚠️ M3 |
| 17 | ステーション一覧 | `App.svelte:323–336` `app.css:12` | 3 等分 × 均質カード ×9。全カード同一 padding / min-height | ⚠️ M6 |
| 18 | ステーション詳細 / 発車標 | `App.svelte:338–376` `app.css:12–13` | 行が `<button>`、`.card-arrow` と二重アフォーダンス | ⚠️ M8,M9 / ▫️ m9 |
| 19 | 車両カード(fleet) | `App.svelte:377–397` `app.css:57` | CSS だけで描いた車両断面。`repeat(3,1fr)` の spec 帯 | ⚠️ M6 |
| 20 | fleet-note | `App.svelte:398–401` `app.css:57` | eyebrow 左カラム / 見出し右カラム → **gate 54 auto-fail** | ⛔ C2 |
| 21 | ブランドページ | `App.svelte:403–418` `app.css:14` | 巨大ロゴが **未読込の `'Inter'`** で組まれる。記載色 `#D2402F` は不在 | ⛔ C3 / ⚠️ M5 |
| 22 | グループグリッド | `App.svelte:419–426` `app.css:7` | 2×2 均質カード + `float:right` の装飾番号 01–04 | ▫️ m8 |
| 23 | コンタクト | `App.svelte:428–444` | 2 カラムの facility 列。問題なし | ✅ |
| 24 | 404 | `App.svelte:446–451` | page-intro + 2 カラム誘導。問題なし | ✅ |
| 25 | フッター | `App.svelte:455–459` `app.css:2` | Ft1 mast-headed 寄り(Ft2 ハイブリッド)。AI footer ではない | ✅ |
| 26 | `index.html`(フォント / noscript) | `index.html:19–38` | preconnect + `display=swap` は正解。noscript のみインライン style | ▫️ m6 |

---

## 4. Critical(そのまま出荷すると slop)

### [critical] Header overflow masked by `overflow: hidden` — `src/App.svelte:125–137` · `src/app.css:2,3`

- **why:** ヘッダーは `height:92px;padding:0 6.8%;display:flex;gap:40px` で折返し禁止、
  モバイル化は `760px` のみ(`@media(max-width:760px)` は全 7 箇所、これ 1 系統)。
  812px 幅での実測見積り: 利用可能 0.864×812 ≈ **702px** に対し、
  ブランド ≈142px(mark 34 + gap 12 + `small` の "RUHRENBERG MUNICIPAL" = 20 字 × 8px モノ ≈96px)
  + gap 40 + ナビ ≈426px(6 リンク計 47 字 × 13px ≈306px + リンク間 gap ≈120px)
  + gap 40 + `.lang-static` ≈132px(22 字 × 10px モノ)= **≈780px**。
  nav の gap 次第で ±40px 動くが、いずれにせよ **およそ 760–930px の帯で溢れる**
  (iPad 10.2" / 10.9" / Air 11" / Pro 11" の 810・820・834px が全部この帯)。
  さらに `.site-shell{overflow:hidden}` があふれを切り落とすため、壊れていることが画面から見えない。
  gate 34 も「`overflow-x: clip` を `html` と `body` の両方に」と**ハード要件**化している。
- **→ fix:** `app.css:2` の `.site-shell{overflow:hidden}` を `overflow-x: clip` に置換し、
  `html, body` 双方に `overflow-x: clip` を付与。ヘッダーのブレークポイントを
  `max-width:1040px`(ナビをシートに入れる)へ引き上げるか、`nav` に `flex-wrap` と
  `white-space:nowrap` を併用して折返しを許す。

### [critical] Eyebrow beside the heading (tag-left / header-right) — `src/App.svelte:223–226, 398–401` · `src/app.css:7,57`

- **why:** `.network-principles{grid-template-columns:1fr 1.5fr}` と
  `.fleet-note{grid-template-columns:1fr 1.5fr}` に、左カラム = `p.eyebrow`、右カラム = `h2` を
  入れている。gate 54 は「eyebrow と見出しが同一行で別カラム」を**クラス名問わず auto-fail** とする
  (「テンプレ化した editorial-SaaS」のサイン)。`structure.md` の "Left-margin" も opt-in 専用。
- **→ fix:** 該当 2 箇所を `grid-template-columns:1fr` に落とし、eyebrow と見出しを
  **同じカラム内で縦積み**にする(`.section-heading` と同じ形へ揃える)。

### [critical] Phantom font `'Inter'` on the brand system page — `src/app.css:14`

- **why:** `.yellow-block span{font:800 58px/1 'Inter',sans-serif;letter-spacing:-.08em}`。
  `index.html:22` が読み込むのは DM Mono / DM Sans / Playfair Display の 3 書体のみで、
  **Inter はどこからも読まれていない**。つまりブランドページ最大の要素(巨大 "RMA" ロゴ)は
  OS 既定 sans で描かれ、同じページの "TYPE" カードが宣言する "DM Sans" と食い違う。
  gate 48(トークン外の font-family)にも該当。
- **→ fix:** `font:800 58px/1 'DM Sans',sans-serif`(またはブランド指定どおり DM Sans + 詰め)へ。
  書体は `--font-display/--font-body/--font-mono` として `:root` に上げ、以後リテラルを禁止。

### [critical] Italicised emphasis word inside the H1 — `src/App.svelte:144,212,251,324,378,404,420,429,447` · `src/app.css:2,7,58`

- **why:** 10 ビュー中 9 ビューの `h1` に `<em>` があり、CSS が `Playfair Display` のイタリックで
  組んでいる(`.hero h1 em`, `.page-intro em`)。gate 38a は
  「見出し内の `<em>`/`<i>` は fail」と明記し、`anti-patterns.md` も
  「イタリック化した強調語 in header は最も信頼できる AI の tell」とする。
  さらに `app.css:58` で 8px 厚 / 5px オフセットの黄色下線を重ねており、
  gate 35(下線は 1–2px・オフセット 1–2px、5px 以上は不可)にも反する。
- **→ fix:** 見出しはローマンに戻す。強調は**太さ**(`font-weight:700`)か
  アクセント色、または 2px の下線/マーカーで表現する。
  下線を使うなら `text-decoration-thickness:2px; text-underline-offset:2px`。

---

## 5. Major(AI 生成物に見える)

### [major] Eyebrow on every section — `src/App.svelte` 全体(29 `<section>` に対し **43 個**)/ `src/app.css:2,26`

- **why:** 「WELCOME TO RUHRENBERG」「JOURNEY PLANNER」「SERVICE PATTERN」…と、ほぼ全セクションが
  all-caps モノ eyebrow で始まる。カード内(`station.district`)や詳細ヒーロー内部にも入るため、
  ページが「見出しの付いた箇条書きの集合」として読める。`anti-patterns.md` は eyebrow を
  **default OFF** とし、序数装置としてのみ許可する。
- **→ fix:** eyebrow を **ページあたり 2–3 個まで**に削る。残すのは
  (a) 実データを名乗る 1 箇所(例「THE RMA NETWORK · 9 STATIONS · 23 LINES」)、
  (b) 詳細ページの種別表示(`LINE PROFILE`)。他は見出しの語そのものに仕事をさせる。
  カード内の district は eyebrow ではなく通常サイズのラベルへ。

### [major] AI nav の一歩手前 — `src/App.svelte:125–137` · `src/app.css:2`

- **why:** ワードマーク左・インライン 6 リンク右・全幅・1px 罫線、という gate 42 の指紋のうち
  CTA ボタンだけが欠けた形。6 リンクはすべて同じ扱いで、ページ種別(路線・駅・車両・ブランド)が
  ナビの形から読めない。`anti-patterns.md` の "The AI nav" は「ジャンル盲目的な形」として退ける。
- **→ fix:** 交通局という題材に合う **N6 · Newspaper masthead**(全幅・中央ワードマーク +
  細いデート/issue 行 + その下にリンク行 + 二重罫線)へ寄せる。もしくは
  **N7 · Brutal slab**(全 caps ワードマーク + 2px 罫線)か **N9 · Edge-aligned minimal**。

### [major] Mid-render token improvisation(48 色 / 9 トークン)— `src/app.css:1–22, 58`

- **why:** ファイルは 1–21 行で hex を自由に書き、22 行目でようやく
  `:root{--rma-yellow:…--rma-line:…}` を宣言し、58 行目以降でさらに上書きする 3 層構造。
  実測 **48 種類の hex に対してトークンは 9 個**で、うち `#fff12b` は
  58 行目以降で再びリテラルとして 8 回書かれる。同系色の drift も明白:
  赤が `#df463b / #df493d / #de493d / #df4b3d / #df4d40 / #e04b3d` の 6 種類、
  ink が `#192b36 / #233b46 / #243d48 / #253c46 / #263f49 / #263d49 / #263d47` の 7 種類。
  さらに勝たせるための `!important`(`app.css:12`)と
  `.detail-hero[style*="--line"]` という属性セレクタハック(`app.css:58`)。
- **→ fix:** `tokens.css` を新設して palette を 1 箇所に集約し、既存 21 行の hex と
  28–31 行の mode 色を**すべて `var(--…)` に置換**。インライン style で受ける
  `--line / --line-ink / --vehicle / --mode / --mode-ink` は既に良い設計なので、
  `.detail-hero` の上書きは属性ハックではなく専用クラス 1 個(`.detail-hero--line`)で受ける。

### [major] Accent overspend(黄色が 5% を大きく超える)— `src/app.css:58` · `src/App.svelte:147–153`

- **why:** brand 上書き層で `.hero-art{background:#fff12b}` としてヒーロー右カラム
  (1280px 幅で約 557×360px ≈ **200,500px² = 1280×800 ビューポートの約 20%**)をベタ塗りし、
  さらに `.mark` `.route-icon` `.filters button.chosen` `.mode-icon.tram` `.db-dot` `.large-route` と
  8px の黄色下線が加わる。gate 23 の「1 ビューポートあたり ~5%」を明確に超え、
  アクセントが「強調」ではなく「地」になっている。
- **→ fix:** 黄色は (a) ワードマークの mark、(b) primary CTA の塗り、(c) 見出し下の 2px ライン、
  の 3 箇所に限定。`.hero-art` は元の `#dee6e5`(寒色面)+ 実データの路線色だけで構成する。

### [major] ブランド文書と実装の不一致(Service Red)— `src/App.svelte:415` vs `src/app.css:22,58`

- **why:** ブランドページは「darkened to **#D2402F** for small labels」と明記するが、
  `#D2402F` は CSS 上に 1 回も存在しない。実装は `--rma-red-ink:#b3372b`、
  加えて `#df4b3d`(text-link / line-filter 選択)など 6 種の赤が混在。
  ブランドページ自身が「システム」を名乗っている以上、この不一致は最優先で直すべき。
- **→ fix:** 赤を 3 つに確定(`--rma-red` = 面/ブランド `#DF493D`、
  `--rma-red-ink` = 小ラベル用、`--rma-red-hover` = 補助)し、
  ブランドページの記載値と CSS を**同じ数値**に揃える。他の赤は削除。

### [major] 等分カードグリッドの反復(非対称がゼロ)— `src/App.svelte:325–336, 379–397, 421–426` · `src/app.css:7,12,57`

- **why:** カード系グリッドが全部等分で、大小の差がゼロ:
  `.station-grid{grid-template-columns:1fr 1fr 1fr}` + `.station-card{padding:30px;min-height:280px}`(9 枚すべて同一値)、
  `.facts{1fr 1fr}`、`.vehicle-specs{repeat(3,1fr)}`、`.group-grid{1fr 1fr}`。
  全カードが同じ高さ・同じ余白・同じ内部順序(コード → eyebrow → 見出し → 本文)で、
  gate 3 が名指しする 3 等分カードグリッドの骨格そのもの。負の空間も bento の大小も無い。
  (ページ枠のグリッドには `.vehicle-board{1.25fr 1fr}` のような軽い非対称があるが、
  1.25:1 は視覚的には均等に見えるため、リズムには寄与していない。)
- **→ fix:** 駅カードは代表駅(HDC)を 2×2 の大タイルにし、残りを 1×1 に落とす
  (F1 Bento の `spans=irregular`)。または 3 枚を削って余白に置き換える。
  `.vehicle-specs` は 3 等分をやめ、「主要諸元 1 つ + 補足 3 つ」の非対称 2 列に。

### [major] Spacing がスケール上に無く、左端が揃わない — `src/app.css:2,7,12,57`

- **why:** gate 24 は 4px グリッドを要求するが、実測値は `23px` `.mode-card` /
  `44px 8%` `.detail-grid article` / `47px` input・button / `52px 8%` `.home-columns article` /
  `56px 0` `.directory` / `65px 8%` `.network-principles` / `74px 0 70px` `.page-intro` /
  `36px 0 32px` `.planner` / `15px` `19px` `27px` で、4 の倍数でない値が主役になっている。
  さらにガターが 2 層に分かれ、**本文の左端がセクションごとに 8% ずれる**:
  `main{margin:0 6.8%}` + `.page-intro{padding:74px 0 70px}` → 左端 **6.8%**、
  同じページの `.network-principles{padding:65px 8%}`・`.fleet-note{padding:65px 8%}`・
  `.home-columns article{padding:52px 8%}` → 左端 **14.8%**。
  (死に CSS の `.note{padding:74px 9%}` は 15.8% だが未使用。)
- **→ fix:** `--space-2xs…--space-3xl` の 4px スケールを定義して置換。
  ガターは `--gutter-inline: 6.8%` 一つに統一し、内側セクションは
  `padding-inline: 0` + 内部グリッドの `gap` で余白を作る(左端は常に 6.8%)。

### [major] インタラクション状態が 8 状態のうち 3 つ欠落 — `src/app.css` 全体

- **why:** 実測で `:hover` 10 件 / `:focus` 8 件 / `focus-visible` 7 件に対し、
  **`:active` 0 件・`:disabled` 0 件**。`.primary`(主 CTA)、`.stop-list button`、
  `.connection-list button` には hover も無い。gate 26 は
  default + hover + focus-visible + active + disabled を要求する。
- **→ fix:** `:active{transform:translateY(1px)}` と
  `:disabled{opacity:.55;cursor:not-allowed}` をボタン共通層に 1 回だけ定義し、
  `.primary:hover`(黄色をわずかに暗く)を追加。

### [major] ナビゲーションのアフォーダンスが 2 系統に分裂 — `src/App.svelte:172,296,357,369` vs `263,327`

- **why:** カードと行(`.line-row`, `.station-card`)は `<a href="#/…">` で正しいのに、
  停車駅リスト・接続リスト・経路検索結果・発車標は `<button onclick={go(…)}>`。
  `README.md:94` の「Real links for every card and row」と矛盾し、
  新規タブで開く・URL をコピーする・右クリックが効かない。
- **→ fix:** これら 4 面を `<a href="#/lines/…">` に置換(`go()` は
  スクロール復帰のための補助に降格)。`<button>` は本当にアクションを起こす
  `Show times` / `Update times` のみに残す。

### [major] ヒーローがページに座っていない / CTA がフォールド下 — `src/app.css:2,3` · `src/App.svelte:141–163`

- **why:** desktop の `.hero` は padding を持たず(`min-height:450px` の grid)、
  モバイルは `.hero{padding:55px 0 0}` で **padding-block-end が 0**。
  gate 44(a)(下端 ≥ 上端の 1.3 倍)に反し、ヒーローが次セクションの罫線に直付けされる。
  また 1280×800 では ヒーロー 450px + planner(≈200px)で、
  主 CTA「Show times after 08:00 ↻」が 1 画面目に入らない可能性が高い(44(b))。
- **→ fix:** `.hero{padding:56px 0 88px}`(下端 > 上端)を宣言。
  モバイルも `padding:48px 0 64px` に。見出しの `clamp()` 最大を 78px → 68px 程度に落とし、
  プランナーを 1 画面目に載せる。

### [major] 9–11px のモノ活字が 45 ルール — `src/app.css` 全体(`9px`×8, `10px`×24, `11px`×13)

- **why:** `.line-table small`、`.facts small`、`.vehicle-list small`、`.map-key` などが **9px**。
  9–10px のモノは「微細なラベル」を演じるための装置として全コンポーネントに反復され、
  実機では読めない。`pnpm audit` は 4.5:1 を保証するが、**サイズは検査していない**。
- **→ fix:** 最小を **11px** に固定(`--text-2xs: 11px` / `--text-xs: 12px`)、9px は 0 にする。
  情報量を保ちたければ字サイズではなく字間(`letter-spacing:.08em`)で分節する。

### [major] ヒーローの装飾図がネットワークを騙っている — `src/App.svelte:147–152` · `src/app.css:2`

- **why:** `.map-lines i` は 5 本の**実在しない**弧で、`.station` が 3 点。RMA は 23 路線 / 9 駅で、
  `src/lib/network.ts` に路線ごとの path と駅座標が既に入っている。
  つまり「本物のデータがあるのに、架空の図を描いて図のふりをしている」状態で、
  gate 45(装飾に意味の錨が無い)に該当。
- **→ fix:** `network.ts` の stops 座標/path から hero の SVG を生成し、路線色を使う。
  CSS の弧 5 本は削除。`src/assets/hero.png`(未使用)も同時に片付ける。

---

## 6. Minor(小さな嗜好の問題)

### [minor] `.eyebrow::before{content:'●'}` のグリフ装飾 — `src/app.css:58`

- **why:** 全 43 eyebrow の前に `●` を差し込み、`app.css:2` の赤 eyebrow を ink に塗り替える。
  装飾グリフはスクリーンリーダーで読み上げられ得るうえ、赤 → ink の上書きで
  「2 つのブランド体系が綱引きしている」ように見える。
- **→ fix:** `::before` を削除。どうしても点が要るなら `aria-hidden` 付きの実要素で置く。

### [minor] hover の言語が 3 種類 — `src/app.css:2,12,53`

- **why:** `.mode-card:hover{transform:translateY(-3px);background:…}`(移動 + 色)、
  `.line-row:hover,.station-card:hover{background:…}`(色のみ)、
  `.clickable:hover{transform:translateY(-2px);background:…#dde6e2!important}`(死んでいる)。
  gate 13(hover 効果 2 つ同時)に `.mode-card` が該当。
- **→ fix:** 「1 要素 1 シグナル」を守り、全カードを**背景色のみ**に統一。
  lift を使うなら 1px translate だけにし、`!important` の行は削除。

### [minor] モーションのトークンが無い — `src/app.css:2,12`

- **why:** `.2s` / `.18s` がリテラルで散在し、`--dur-*` / `--ease-*` が存在しない。
  イージング指定も無し(既定 = ease)。
- **→ fix:** `--dur-short:180ms; --dur-mid:240ms; --ease-out:cubic-bezier(.22,1,.36,1)` を
  `:root` に置き、`transition:background-color var(--dur-short) var(--ease-out)` の形に統一。

### [minor] 記号の語彙が混在 — `src/App.svelte` 全体(`→ ↗ ← ↻ ☰ ●`)

- **why:** 前進は `→`、次は `↗`、戻りは `←`、更新は `↻` と、Unicode ブロックの違うグリフを
  文脈なく併用。アイコンライブラリ 0 / 記号 6 種という中途半端な状態。
- **→ fix:** 矢印は `→`(前進)と `↗`(別ページへ)の 2 種に限定し、
  更新は文字ラベル「Update times」のみに。`☰` は `aria-label` 済みなので現状維持で可。

### [minor] 中黒 `·` が 42 箇所 — `src/App.svelte:184` ほか

- **why:** すべての分節を `·` が担い、eyebrow では
  「THE RMA NETWORK · 9 STATIONS · 23 LINES · 864 TRIPS A DAY」と 4 つの事実を詰め込む。
  1 グリフに全機能を負わせると、機械的に生成された均質さが出る。
- **→ fix:** eyebrow 内は 1 事実に絞り、残りは本文へ。区切りは
  文脈で `·` / `—` / 改行を使い分ける。

### [minor] `index.html` の noscript だけインライン style — `index.html:29`

- **why:** 同一ファイルで読み込んだ stylesheet を使わず、`font-family:system-ui` と hex を直書き。
  ここだけ 5 つ目の書体(system-ui)と 2 つ目の色体系が現れる。
- **→ fix:** `.nojs` クラスを `app.css` に定義してクラス参照に。
  あわせて `og:image` を追加(現状 og タグに画像が無い)。

### [minor] 死んだ CSS が 20 セレクタ — `src/app.css:7,8,12`(`README.md:108–114` に記載済み)

- **why:** `.note`(3 カラムのセクションヘッド = gate 54 が禁じる形)、
  `.network-mini`/`.mini-grid`(CSS だけで描いた偽の地図グリッド)、`.vehicle-list` などが
  未使用のまま残る。作者が README で申告している点は減点ではなく信頼の材料。
- **→ fix:** ブラウザ確認のうえ一括削除。特に `.note` と `.mini-grid` は
  「禁止パターンの見本」として残さない。

### [minor] 装飾番号 01–04 を `float` で置いている — `src/App.svelte:422–425` · `src/app.css:7`

- **why:** `.group-no{float:right}` でカード右上に番号を浮かせる。
  各カードは既に eyebrow(THE AUTHORITY / OPERATING COMPANIES…)で序数を語っており、
  番号は 2 つ目の序数装置。`float` は grid カード内で高さ計算を不安定にする。
- **→ fix:** 番号を残すなら eyebrow と統合(`02 · OPERATING COMPANIES`)して
  grid の `align-self:start` で配置。もしくは番号を削除。

### [minor] `.card-arrow`(Station details ↗)が二重アフォーダンス — `src/App.svelte:333` · `src/app.css:12`

- **why:** カード全体が `<a>` なのに、内側に別リンクに見えるラベルを絶対配置している。
  ユーザは 2 つのクリック対象があると誤認する。
- **→ fix:** ラベルを「カード全体がクリック可能」を示す無装飾のキャプションへ変える
  (矢印だけを隅に、下線なし)。

### [minor] システムの宣言がコードのどこにも無い — `src/app.css:1` / `design.md` 不在

- **why:** gate 20 はスタンプを要求する。ここには `/* Hallmark · macrostructure: … */` も
  `design.md` も無く、どの層が正で、どの層が後付けの上書きなのかがコードから読めない
  (実際 58 行目が 2 行目を打ち消している)。
- **→ fix:** `design.md`(または `app.css` 冒頭のスタンプ 3 行)を起こし、
  genre / anchor hue / 書体 3 種 / マクロ構造 / トークン所在を宣言する。

---

## 7. 合格項目(Hallmark が認めるところ)

監査は減点一辺倒ではない。以下は実際に gate を通っている:

| gate | 内容 | 根拠 |
| --- | --- | --- |
| 8 | AI テンプレ構造ではない | hero → 3 機能カード → CTA → footer の反復が無い(§2) |
| 2 | 紫グラデ / グラデ見出し無し | `background-clip` 0 件、`linear-gradient` は死に CSS の `.mini-grid` 1 件のみ |
| 6 | 全画面センターヒーローではない | `.hero` は 2 カラム・左バイアス。詳細ページも左寄せ |
| 7 | 純黒 / 純白の地色なし | 地は `#f4f1eb`(暖)・面は `#e6ebe8` / `#263f49`(寒)。純白は文字色のみ |
| 10–13 | モーションの作法 | `transition:all` 0 件、hover-scale 0 件、バウンス easing 0 件(§6 m2 の 1 件のみ例外) |
| 15 / 27 | フォーカスと reduced-motion | `app.css:51` outline は transition 無しで即表示、`app.css:56` で全停止 |
| 30 | emoji アイコン無し | 機能枠に emoji なし。記号は `aria-hidden` 済みの矢印のみ |
| 33 | 装飾要素の a11y | `.hero-art` / `.vehicle-illustration` に `aria-hidden="true"` |
| 38a 以外 | 書体は 3 種 | DM Sans / DM Mono / Playfair Display(`'Inter'` の幻影 1 件は C3 で修正) |
| 39 | フォームの高さ整合 | `.planner-form input` / `select` は `height:47px;border:1px solid`、`.primary` も `height:47px`。3–4px の太罫線は装飾ドット/弧のみ |
| 40–41 | コントラスト | `pnpm audit` 全通過(ink 12.93 / yellow 12.41 / muted 5.58 / red 5.33 / green 5.03) |
| 43 | AI footer ではない | Ft1/Ft2 のハイブリッド。4 カラム + SNS 列 + 極小コピーライトではない |
| 46 | 捏造メトリクスなし | 数値は全て `network.ts` / `gtfs.ts` の実データ由来。README は既知の欠落も明記 |
| — | コピーの質 | "Acme" / "Jane Doe" 無し。`Ruhrenberg’s` はカーリー、`—` と `…` も適正 |

**この 2 点は特筆に値する**: 架空の都市であっても *(a)* 全ての数字が単一のデータモデルから
導出され、*(b)* 破綻したコントラストを自前の検査で fail させる仕組みを持っている。
`anti-patterns.md` が想定する「生成された見た目だけのページ」とは、この site は根本的に別物である。

---

## 8. 修正パンチリスト(優先順)

| # | 施策 | 対象 | 効果 | 手数 |
| --- | --- | --- | --- | --- |
| 1 | ヘッダーのブレークポイント引き上げ + `overflow-x: clip` | `app.css:2,3` | ⛔ C1 解消、iPad 帯の欠けが消える | 小 |
| 2 | 見出し内 `<em>` を撤去、強調は weight/色/2px ラインへ | `App.svelte` 9 箇所 + `app.css:2,7,58` | ⛔ C4 解消(最大の AI 指紋) | 小 |
| 3 | `.network-principles` / `.fleet-note` を縦積みに | `app.css:7,57` | ⛔ C2 解消(gate 54 auto-fail) | 小 |
| 4 | `'Inter'` → `'DM Sans'` + 書体 3 種をトークン化 | `app.css:14,22` | ⛔ C3 解消 + M3 の一部 | 小 |
| 5 | eyebrow を 43 → 8 程度に削る | `App.svelte` 全体 | ⚠️ M1(体感が最も変わる) | 中 |
| 6 | 黄色の面塗りを 3 箇所に限定(`.hero-art` を寒色へ) | `app.css:58` | ⚠️ M4(5% ルール) | 小 |
| 7 | 赤 / ink を 3 値・2 値に確定し、ブランドページ記載と同期 | `app.css:2,22,58` + `App.svelte:415` | ⚠️ M5 + M3 | 中 |
| 8 | `:active` / `:disabled` / CTA hover を追加 | `app.css` 共通層 | ⚠️ M8 | 小 |
| 9 | 4 面の `<button>` ナビを `<a>` へ | `App.svelte:172,296,357,369` | ⚠️ M9 + README との整合 | 中 |
| 10 | spacing スケール導入 + ガター 6.8% 統一 | `app.css:2,7,12,57` | ⚠️ M7 | 中 |
| 11 | カードグリッドに非対称を入れる(代表駅を大タイル化) | `App.svelte:325–336` `app.css:12` | ⚠️ M6 | 中 |
| 12 | ヒーローの padding と CTA をフォールド内へ | `app.css:2,3` | ⚠️ M10 | 小 |
| 13 | 最小活字を 11px に | `app.css` 全体 | ⚠️ M11 | 中 |
| 14 | hero-art を実データのネットワーク図に差し替え | `App.svelte:147–152` | ⚠️ M12(一番「らしく」なる) | 大 |
| 15 | ナビを N6 masthead へ寄せる | `App.svelte:125–137` | ⚠️ M2 | 中 |
| 16 | Minor 一式(`●` 削除、hover 統一、モーショントークン、矢印整理、死に CSS 掃除) | `app.css` 全体 | ▫️ m1–m10 | 中 |
| 17 | `design.md` を起こしてシステムを宣言 | 新規 | ▫️ m10(今後の drift 防止) | 小 |

**最初の 4 行は 1 時間以内で終わり、critical 4 件がすべて消える。**
5–7 で「AI っぽさ」の体感はほぼ無くなる。14 まで進むと、この site は
「交通局の公式サイトとして固有の見た目」を持つところまで到達する。

---

## 9. 付録: 機械的エビデンス

```
hex の種類            48(#fff を含む)          トークン            9       (app.css:22 で宣言)
CSS ルール数         340(`{` の数)             eyebrow 要素       43 / <section> 29
<em> in heading        9 / 10 views             :active 0 · :disabled 0
:hover 10             focus-visible 7           transition:all 0     bouncy easing 0
100vh / 100vw          0       background-clip    0       linear-gradient 1(死に CSS)
背景の純白 / 純黒      0       テキストの #fff     17(いずれも濃色面の上)
z-index               10, 4, 3, 2(9999 なし)
ブレークポイント       760px の 1 系統のみ(@media(max-width:760px) ×7 + prefers-reduced-motion ×1)
活字サイズ            9px×8 / 10px×24 / 11px×13(≦11px が 45 ルール)
罫線                 1px ×28(主構造)/ 2px ×1(nav 下線)/ 3–4px ×3(装飾ドット・弧のみ)
ガター                6.8%(main, header)と 8%(home-columns / network-principles / fleet-note の内側)の 2 層
ボタン 8 個 / リンク 23 個(うち go() 経由の button は App.svelte:172,296,357,369 の 4 つ)
コントラスト(pnpm audit) ✓ 4.5:1 全通過(ink 12.93 / yellow 12.41 / muted 5.58 / red 5.33 / green 5.03)
データ整合(pnpm verify)   ✓ GTFS 生成・整合 OK
```

---

```
Summary — 4 critical · 12 major · 10 minor
Verdict — reads as AI-generated
          構造とデータは本物。AI の指紋は装飾レイヤー(eyebrow 43 個 / 見出し内 <em> /
          8px 下線 / 黄色の面塗り / 3 層カスケード)に集中している。
          critical 4 件はすべて 1 行規模の修正で、消せば "close, fix the minors" に戻る。
```
