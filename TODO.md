# BlueSNovel / SKYNovel拡張機能 TODO

最終更新：2026-07-27（完了分は CHANGELOG.md へ移動。最終的にカラを目指す）

## 0. 受付箱

質問・要望・不具合を受けたらまずここに書き、処理したら下の該当節へ移す。**常にカラを目指す。**

（2026-07-27 に受けた9件はすべて処理し、§3.5 / §3.7 / §3.8 / §4.5 と
CHANGELOG v4.31.2 へ振り分け済み）

---

## 1. VS Marketplace 是正対応・期日とゴール

修正A（ncu をバンドルから外す）・修正B（pip install の同意化）はどちらも完了（CHANGELOG v4.30.5 / v4.31.0）。

動作確認（2026-07-27、macOS / Windows 両方で完了）：dmg・exe ビルドと起動、
フォント最適化の同意ダイアログ、出力フォルダを開くボタン、
**フォント変換（`&def_fonts` 全フォントのサブセット化）と OFF での復帰**。
この過程で見つかった不具合はすべて修正済み（CHANGELOG v4.31.1）。

→ **コード作業と動作確認は完了。残るは配布と再申請の手続きのみ。**

| 時期 | やること |
|---|---|
| 修正完了次第 | GitHub Releases で配布（SHA256 併記）＋ブログ告知 → **済（v4.31.1）** |
| ~~その後~~ | ~~Open VSX 登録を検討~~ → **見送り決定（§3.9）** |
| **8/23 以降** | **Marketplace へ正式再申請**（是正内容を条項付きで報告）。**新しい extension name での公開になる**（MS 回答で確定。ID・インストール数・レビューは復活しない）。旧版利用者への自動更新は不可能なので、**移行案内（旧版のアンインストール必須）を用意する**（§3.5） |

手順は §7、Releases に貼るリリースノート原稿は §8 にある。

前提（規約を読んで確認済み）：

- `famibee2.skynovel2` の item ID・インストール数・レビューは復活しない。再公開は新しい extension name になる
- Publisher Agreement 13(d) No Exclusivity — 他マーケットプレイスへの公開は明文で許容。Open VSX 併用は問題なし
- ToU 4(x) — 過去にアクセスを剥奪された者はサイトを利用してはならない。**別アカウント作り直しは独立した規約違反**
- Publisher Agreement 3(g) / 12 は理由の有無を問わず削除可と規定。法的に争う線はない

MS とのやり取りは §665（2通目）・§666（1通目）に原文。**2通とも「クールダウン明けに連絡を」の一点張り**で、
検知理由の照会（2026-07-26 送信）への回答も定型文だった。

- ❌ **検知の詳細は開示されない。** 「どの条項のどの挙動か」を明示的に尋ね、
「答えられないならそう言ってほしい」とまで書いたが、**どちらにも触れずに定型文**。
⇒ **情報を待つのはやめ、自前の分析（§2 と CHANGELOG）で進める**
- 🛑 **クールダウン明けまで、これ以上メールを送らない。** 2通続けて同じ案内を
受けているので、3通目は「案内を無視している」と受け取られる risk がある
- ❓ **`famibee2` の名前が予約されるかは未回答。** 取られてしまった場合は、
**同一アカウントのまま別の publisher ID を作る**（ToU 4(x) が禁じているのは
新規*アカウント*なので、これは違反にならない）。その場合 §3.5 の移行案内も要調整
- ❓ **修正版 .vsix を用意すべきかも未回答。** ただし1通目に
「we will review your request based on the applicable policy and
**required remediation**」とあるので**是正の証拠は用意しておく**。
添付ではなく **GitHub Releases の URL ＋ SHA256** を書くのが確実
（サポート宛の添付は弾かれうる。すでに公開済みで検証可能）
- 📌 **2通目で pip install の違反を書面で自認済み。** 再申請でも
その線で一貫させる（蒸し返して争わない）

### 再申請メールの要点（§666 の原文から読み取れること）

- **窓口**：同じスレッドへ返信（`vsmagent@microsoft.com` / `VSMarketplace@microsoft.com`、
担当者ID `655cd9f9`）。専用フォームや別ポータルの指定は無い。
サポートの営業時間は **インド標準時の平日 9-17時**
- **先方が見るもの**：「we will review your request based on the applicable policy
and **required remediation**」＝ **是正内容の報告が前提**。
CHANGELOG の v4.30.5 / v4.31.0 / v4.31.1 と §2 がそのまま材料になる
- ⚠️ **前回とは組み立てを変える。** 1通目は「429/404 は障害ではないか、緊急調査を」
という照会だった。先方はそれをポリシー措置だと回答している。再申請は
**違反を認め、条項ごとに何を直したかを示す**構成にする（争う線は無い：§1 の 3(g) / 12）
- ⚠️ **差出人と本人確認情報を揃える。** 1通目は署名が `[Your Name]`、
`Microsoft Account: [your Microsoft account email]` のままプレースホルダで送信されており、
From（`k.s-24.9_1-4@leto.eonet.ne.jp`）と署名（`famibee@gmail.com`）も別。
**publisher を所有している Microsoft アカウントのアドレスを明記し、統一すること**。
アカウント復帰の依頼で本人性が曖昧なのは不利
- ⏰ **時期**：メールは 2026-07-24 付、削除は 7/22〜24 頃。30日の起点が不明なので
**8/25 以降に送るのが安全**。早すぎる連絡はクールダウン不履行と取られうる

---

## 2. 残りのリスク箇所

- **ファイル暗号化** — [src/Encryptor.ts](src/Encryptor.ts) / [src/EncryptorTransform.ts](src/EncryptorTransform.ts)。単体では無害だが、リモート取得やシェル実行と合わせるとランサム系ヒューリスティクスに触れうる。README で用途（作品データの保護）は明示済み（v4.31.1）。これ以上の対処は不要と判断
- C（テンプレート取得元 URL の明示）と D（PowerShell のシェル経由実行）は v4.31.1 で対処済み

---

## 3. ビルド周りの宿題

- **`dist/extension.js` が単一バンドル（約1.39MB）になった** — webpack を外した代償でコード分割が無くなった（従来 82KB ＋ 遅延チャンク）。Node での require 実測は約63ms。動的 import 先の「実行」は esbuild でも遅延されるので、増えているのはパース時間だけ

- **ESM ＋ `splitting: true` は「できる」が、今は見送り**（2026/07 調査・実測済み）
	- VSCode は **1.100（2025/04）から ESM 拡張機能を読める**。リリースノートに
	「The NodeJS extension host now supports extensions that use JavaScript-modules
	(ESM). All it needs is the `"type": "module"` entry in your extension's
	`package.json` file.」とある。本拡張の `engines.vscode` は `^1.125.0` なので
	条件は満たしている（web worker 拡張ホストは今も非対応）
	- 実測：format esm ＋ splitting でビルドすると
	**eager 86KB ＋ WorkSpaces 1.50MB ＋ ToolBox 5.9KB ＋ TreeDPDoc 2.7KB** に分かれる
	- **効果が薄いので見送り**。WorkSpaces は ActivityBar のコンストラクタが即座に
	動的 import するため、結局すぐ 1.5MB をパースする。縮むのは
	「activate() が返るまで」の計測値だけで、体感には効かない
	- 移行するなら `"type": "module"` が **dist/LangSrv.js（LSP、別プロセスで
	node が直接読む CJS）と `src/batch/*.js`（利用者プロジェクトへ配る）も
	ESM 扱いにしてしまう** ので、拡張子を `.cjs` / `.mjs` に整理するのが先。
	公式の bundling ドキュメントも今なお `format: 'cjs'` しか書いていない

---

## 3.5. 機能の宿題

- ~~**拡張機能自身の更新を通知する**~~ → **実装済み（CHANGELOG v4.31.2）**
	- ⚠️ ただし **v4.31.2 以降を入れた人にしか効かない。**
	v4.30.4 で止まっている利用者には届かない（下記）

- **v4.30.4 で止まっている利用者に告知する手段【調査済み・使わない結論】**
	- v4.30.4 が外部から取るのは**自分の4リポジトリの版番号だけ**
	（`skynovel_esm` / `SKYNovel` の package.json `version`、
	`tmp_esm_uc` / `tmp_cjs_uc` の CHANGELOG.md 先頭の `## v(.+)`）。
	自由書式のメッセージを受ける経路は無い（他の fetch は利用者操作時の main.zip のみ）
	- 版番号にメッセージを混ぜれば画面には出るが、**❌ やらない**：
	その文字列がテンプレ版番号として比較に使われ、全利用者に恒久的に偽の
	「テンプレ更新あり」通知が出る。しかもその通知は【ベース更新】を押させ、
	main.zip で**利用者の作品プロジェクトを書き換える**。告知のために実害のある
	操作を誘発することになる。版比較そのものも壊れる
	- **全員に届きうる経路は Marketplace の復活だけ。ただし確実ではない**（下記）
	- 当面の実害のない手段：ブログ、GitHub の README、
	**テンプレリポジトリの README / doc**（ベース更新を押した人には main.zip 経由で届く）

- **❌ `famibee2.skynovel2` の ID は復活しない【MS 回答で確定】**
	- MS サポート回答（representative:655cd9f9、2026-07-24 受信）に
	**「extensions are not reinstated after removal」**と明記されている。
	item ID・インストール数・レビュー・URL は戻らず、
	**再公開は新しい extension name になる**
	- ⇒ **旧版（v4.30.4）利用者に自動更新で届く道は無い。** 恒久的に取り残される。
	接点はブログ / GitHub / テンプレリポジトリ経由の告知だけ
	- ⇒ 自己更新通知（上記）の重要度が上がる。今の旧版利用者は救えないが、
	**新 ID で入れ直してもらった後**は同じ事故を防げる
	- ⚠️ **旧版と新版は別の拡張機能として共存できてしまう。**
	同じコマンド ID・ビュー ID を登録するので、両方入っている利用者では衝突する。
	移行案内には **「旧版をアンインストールしてから新版を入れる」を必ず明記**
	- ✅ **publisher `famibee2` の復帰は道が残っている**（§666 原文で確認）。
	「a mandatory cooldown period of 30 days is required **before any
	reinstatement**, **and extensions are not reinstated after removal**」と
	2節が書き分けられており、**復帰不可なのは拡張機能だけ**。
	新規アカウントも新規 publisher も要らない（ToU 4(x) との衝突も起きない）
	- 📌 **新しい extension name を決める必要がある**（`package.json` の `name`）。
	`skynovel2` は使えないので `skynovel3` 等。publisher は famibee2 のままなので
	新 ID は `famibee2.skynovel3` になる。**URL・インストール数・レビューは 0 から**

- ~~**リファレンス検索パレットのリンク先を、プロジェクト種別で切り替える**~~
	→ **実装済み（CHANGELOG v4.31.2）**。判定は `isBluesPrj()`
	（[src/CmnLib.ts](src/CmnLib.ts)）＝ `<src|core>/web.ts` の SysWeb の import 先。
	**判定は本体側だけで行い、結果を `ready` で LSP へ渡す**（LSP に I/O を入れない）

- **設定画面の Vue はオーバースペックか【判断待ち・急がない】**
	- ✅ **自動テストはできる**と判明（`bun run test:ui` で webview の中身を読めている）。
	「テストできないから」という理由で外す必要はない
	- 同等機能をより標準・簡易な手段で実現でき、かつ自動テストできるならその方が良い
	- 他の拡張機能はどうしているか。最も簡易な json 設定＋VSCode 標準設定画面だと
スライダーやアイコン表示ができない
	- 歴史的経緯：元は .ssn 関連の高度な編集機能の技術的実験・習得の産物。
高度な入力 UI もそれなりに役立っている
	- .ssn 関連の機能制作時に Vue、あるいは BlueSNovel（React 製）に倣って React を
使用予定。**今すぐの改修や機能削除は求めない**


- **BlueSNovel のみのタグ4件をパレットに出す【要・概要文】**
	- `grplay` / `set_cancel_skip` / `stopfadese` / `txtlay` は
	`src/md/` に元ファイルが無いので出ていない。出すには **md ファイル
	（概要・引数・スニペット・詳細）が必要**
	- 逆方向（相手側に無いタグを隠す）は**やらない方針**。リファレンスは
	「調べられること」が役目なので隠さない。実装状況は各サイトの記載に従う

- ~~**ホバー・補完の説明文に埋まっている SKYNovel URL**~~
	→ **実装済み（CHANGELOG v4.31.2）**。ワークスペースごとにタグ辞書を差し替える

- **ギャラリーのリンクは SKYNovel 固定のまま【BlueSNovel 版が無い】**
	- `famibee.github.io/SKYNovel_gallery/` への 38 箇所。BlueSNovel の docs には
	ギャラリー頁が無いので、意図的に置換対象から外している
	（`URL_SKY_DOC` の末尾 `/` で `SKYNovel_gallery/` を除外している）
	- BlueSNovel 版ギャラリーを作ったら、[server/src/LspWs.ts](server/src/LspWs.ts)
	の `md2blues()` に置換を足す
	- [src/TreeDPDoc.ts:25](src/TreeDPDoc.ts:25) の【ドキュメント・連絡先】ツリーも
	SKYNovel 固定。ただしこのツリーは**プロジェクト単位ではない**（複数開いていると
	どちらを指すか決まらない）ので、切り替えるなら別の考え方が必要

---

## 3.7. LSP 設計の見直し【調査済み・着手待ち】

### 前提：LSP に fs を持たせない方針は維持する

方針として維持するが、**ブラウザ版（vscode.dev）対応は要求仕様ではない**
（開発途中に vscode.dev が登場したという経緯）。ゆるい縛りとして扱う。

そして **LSP を fs フリーにしても本体側は vscode.dev に乗らない**（2026/07 実測）：
- `workspace.fs` は**非同期のみ**（`readFile(uri): Thenable<Uint8Array>`、同期版なし）。
本体側の同期ファイル I/O は **114 箇所**あり、全て async 化＝呼び出し連鎖の書き換え
- **child_process 依存が 8 ファイル。** npm/bun タスク・Electron 梱包・pyftsubset は
ブラウザでは原理的に不可能。機能を削った別物（`browser` エントリで
構文強調＋LSP のみ）を作る話になる＝製品判断であってリファクタリングではない

それでも fs フリーを維持する実利は「解析器に I/O を紛れ込ませない」こと。
以下は参考情報。web worker 拡張ホストでは
`fs` / `path` / `process` が使えず、子プロセス生成も不可、ファイルは
`workspace.fs` 経由のみ（[公式](https://code.visualstudio.com/api/extension-guides/web-extensions)）。
LSP 自体は **3.16.0 から `vscode-languageserver/browser` でブラウザ動作可能**
（公式サンプル `lsp-web-extension-sample`）。

他の言語拡張機能は二派：tsserver / rust-analyzer / gopls は自分でディスクを読む
（Node・ネイティブ専用）。一方 **Microsoft 自身の
`vscode-html/json/css-languageservice` は fs を持たない設計**で、
だからブラウザで動く。本拡張は後者に倣う。

`server/src/*.ts` の fs 呼び出しは **0件**（維持すること）。

### (a) CmnLib の分割【完了・CHANGELOG v4.31.2】

`src/CmnShare.ts` を新設し、LSP は CmnLib を import しない形にした。

### (c) treeProc の並列版は有効か【未着手・まず測ること】
- `src/Project.ts` の `#scanSrc()` などで `Promise.allSettled()` 版にできるか
- `(async ()=> {})[]` を吐いて `allSettled()` に渡す形はどうか
- try/catch もそこで面倒を見られるか
- `src/batch/BatOptPic.ts` など大量バッチでは手作りで並列化した前例がある
- **効果があるかは測ってから**（#scanSrc の read+detect は 25ファイルで 7.0ms 実測。
支配的なのは LSP 側の全再パースなので、ここを速くしても効かない可能性が高い）

### (b) プロトコルのムダ取り【完了・CHANGELOG v4.31.2】

初期化 3往復→1回、`go` の `InfFont` 削除、`need_go` の 300ms まとめ、
走査のファイル単位 try/catch を実施。

**見送った項目：**

- **文字コード判定の mtime キャッシュ** — 実測で
**25ファイル / 220KB の read+detect+toString が 7.0ms**（statSync のみなら 0.11ms）。
節約は 7ms 程度で、キャッシュ無効化を誤ったときの被害（古い本文で解析）に
釣り合わない。支配的なのは LSP 側の全再パース
- **走査元の差分送信** — `#scanAll()` は `#scanBegin()` / `#scanInitAll()` で
状態を作り直す全再構築なので、差分を渡すには構造から変える必要がある。
スクリプト本文が二重に存在する（LSP の `TextDocuments` ＋ `pp2s`）のも同根
- **path.json 変更時に全再パースを避ける** — 画像・音声の監視は
`updPathJson = true` を渡すので、追加削除が `lasyPathJson()`（500ms）→
`updPathJson()` → `need_go` に至る。path.json だけ渡して
LSP が保持済みの `#hScript` から再検証すれば全再パースは不要になるが、
`#scanBegin`/`#scanInitAll` の状態リセットとの兼ね合いを詰める必要がある。
**次にやるならここ**（効果最大）
	- なお font/text 監視の `sendNeedGo` は既に `.sn`/`.ssn` に絞られている

---

## 3.8. ファイル監視の設計【理想モデルと現状の差分】

### 先に「要求」を並べる（何がファイル変化を必要としているか）

| 要求 | 何の変化で | 対象 | まとめ方 |
|---|---|---|---|
| 暗号化 | 存在＋内容 | `doc/prj/*/` の全ファイル | 即時・ファイル単位 |
| 画像最適化 | 存在＋内容 | `{jpg,jpeg,png}` ＋ 退避 | 即時 |
| 音声最適化 | 存在＋内容 | `{mp3,wav}` ＋ 退避 | 即時 |
| 立ち絵生成 | 存在＋内容 | `resource/*.psd` | 即時 |
| 文字コード診断 | **内容のみ** | `{sn,ssn,json}` | 即時 |
| path.json 再生成 | **存在のみ** | `doc/prj` 配下 | **プロジェクト単位**でまとめ |
| ドロップ先候補 | **存在のみ**（フォルダ） | `doc/prj/*` | path.json と同時 |
| LSP 全走査 (need_go) | **path.json が実際に変わった** ＋ `.sn` の存在変化 | – | **プロジェクト単位**でまとめ |

要点は、契機が **「存在の変化」か「内容の変化」か**、処理が
**「ファイル単位で即時」か「プロジェクト単位でまとめ」か** の2軸に分かれること。
**現状はこの2軸が `updPathJson` という boolean 1つに畳まれている。**
経路が追いにくいのはそのため。

### 理想の形（3層）

```
[1] 監視層     プロジェクトごとに1つ。FS イベントも、フォルダ操作・リネームの
               合成イベントも、同じ口から {kind: cre|chg|del, fp} として出す
      ↓
[2] 振り分け層 購読者が glob で絞る
      ↓
[3] 要求層     上の表の8つ。「即時／まとめ」は購読者側が宣言する
```

### 現状との差分

**[2] は既にある。** `#aWatchRp2CreDelProc`（`{pat, crechg, del}` のレジストリ）が
それで、**フォルダ追加削除とリネームは合成イベントを minimatch でそこへ流し込んでいる**。
つまり半分はこのモデルになっている。足りないのは、生の FS イベントがレジストリを
通らず監視ごとに直結していることと、横断的な関心（path.json・暗号化）が
boolean フラグと static で外付けされていること。

| # | 理想 | 現状 | 対応 |
|---|---|---|---|
| 1 | 状態はプロジェクトごと | `#updPathJson` / `encIfNeeded` が **static で後勝ち** | **(A)** |
| 2 | まとめはプロジェクト単位 | 500ms が**監視インスタンスごと**。`loadEx` が二重に走る | **(B)** |
| 3 | 要求は独立 | `updPathJson` が3役を兼ね、boolean で監視に紐づく | **(C)** |
| 4 | need_go は path.json が**実際に変わったときだけ** | 存在変化のたび必ず全走査 | **(F)** |
| 5 | 監視は1本＋振り分け | パターンごとに `createFileSystemWatcher`（9本） | (G) 効果小 |
| 6 | 内容変化で path.json を作り直さない | **既にそう**（CRE/DEL のみ。CHG では呼ばない） | ✅ |
| 7 | フォルダ・リネームも同じ口 | **既にそう**（合成イベントをレジストリへ replay） | ✅ |
| 8 | 監視の深さは用途に合わせる | **1階層＝意図的**（下記 (D)） | ✅ |

### 個別

#### 🐛 (A) マルチルートで static が後勝ち【最重・要判断】

`WatchFile.#updPathJson` と `encIfNeeded` が static（[WatchFile.ts:46](src/batch/WatchFile.ts:46)
にコメント済み）。`Project` はワークスペースフォルダごとに生成され、各 Project が
`initOnce()` で上書きする。⇒ 2つ開くと後勝ちで、片方の変更が**他方の** path.json を
作り直し、**`encIfNeeded` も後勝ち＝別プロジェクトの暗号化設定で暗号化しかねない**。
keywords の `multi-root ready` と実装が合っていない。

直すならインスタンスフィールド化。**暗号化が絡むので単独の版で。**

#### ⚠️ (B) 500ms デバウンスが監視インスタンスごと【実測済み】

画像＋音声を同時に置くと `updPathJson()` が2回走る（`loadEx` ＝全走査＋暗号化の
二重実行）。後段の全走査は `#sendNeedGo()` の 300ms が1回にまとめている。
1行（static 化）で直るが **(A) と逆行するので (A) が先**。

#### (C) `updPathJson()` が3役【要分割】

path.json 更新＋暗号化／ドロップ先候補／need_go。画像1枚で全部走る。

#### 💡 (F) need_go は path.json が実際に変わったときだけ【新規・費用対効果が良い】

`updPathJson()` は path.json を書き直すのだから、**書く前と後で内容が同じなら
`#sendNeedGo()` を呼ばない**だけでよい。LSP が全走査を要るのはファイル名キーワードが
変わったときなので、path.json が同一なら全再パースは無駄。**純粋な短絡なので低リスク。**
実装したら統合テストで走査回数を assert する。

#### 📊 操作方法ごとの発火イベント【実測・macOS / VSCode 1.130】

「エクスプローラー操作と外部操作でイベントが違うのでは」という疑いを実測した。
統合テスト「【調査】操作方法ごとの発火イベント一覧」が毎回記録するので、
VSCode の版で変わったら気づける。

| 操作 | cre | chg | del | rename | 全走査 |
|---|---|---|---|---|---|
| 外部 追加（`writeFileSync`） | 1 | – | – | – | 1 |
| 外部 **変更**（上書き） | – | **1** | – | – | **0** |
| 外部 変名（`renameSync`） | 1 | – | 1 | – | 1 |
| 外部 削除（`unlinkSync`） | – | – | 1 | – | 1 |
| VSCode 追加（`workspace.fs.writeFile`） | 1 | – | – | – | 1 |
| VSCode 変名（`workspace.fs.rename`） | 1 | – | 1 | – | 1 |
| VSCode 削除（`workspace.fs.delete`） | – | – | 1 | – | 1 |
| **エディタ 変名**（`WorkspaceEdit.renameFile`） | 1 | – | 1 | **1** | 1 |
| エディタ 削除（`WorkspaceEdit.deleteFile`） | – | – | 1 | – | 1 |

**結論：**
- **外部操作（fs / fs-extra）と VSCode API 操作は完全に同一。**
「操作方法でイベントが違う」という疑いは、この範囲では**否定された**
- **違うのはエディタ主導の変名だけ。** `rename` が余分に出て二重になる（下記 (H)）。
削除では出ない
- **内容変更では全走査が起きない**（設計どおり。path.json は存在変化のみ）
- ⚠️ **エクスプローラーのドラッグ＆ドロップは未計測**（UI 層のテストが要る）。
内部的には WorkspaceEdit 経路と推測されるが未確認

#### 📋 ドラッグ＆ドロップ 12ケース

##### ⚠️ 罠：`explorer.confirmDragAndDrop`（既定 **true**）

これが有効だと **D&D が黙って何も起こさない**。2×2 で切り分けた実測：

| | `dragTo` | 手動 mouse 操作 |
|---|---|---|
| 確認あり（既定） | 動かない | 動かない |
| 確認なし | **移動する** | **移動する** |

⇒ **Playwright は最初から正常に動いていた。** 一度「HTML5 ネイティブ D&D だから
合成マウスイベントでは発火しない」と結論したが**誤り**。
「ファイルが動かなかった」という事実から原因を推定して外した。

さらに悪いことに **`dragTo` は例外も出さず成功を返す**。
素直にテストを書くと「通っているのに何も検証していない」状態になる。

##### 自動化の可否

| 経路 | 自動化 | 備考 |
|---|---|---|
| (VE)→(VE) | ✅ **可能** | `explorer.confirmDragAndDrop: false` が必須 |
| Finder →(VE) | ❌ | 別アプリからの OS レベル操作。Playwright は Finder を操作できない |
| (VE)→ Finder | ❌ | ドロップ先が Finder |

##### 動く手順（実証済み・スイートへの組み込みは未完）

```ts
// user-data-dir に settings.json を置いてから起動する
{'explorer.confirmDragAndDrop': false}
// あとは素直に
await src.dragTo(dst);
```

⚠️ 組み込みが未完なのは**エクスプローラーの行セレクタが安定しないため**。
VSCode は単一の子しか持たないフォルダを**1行に圧縮**する（`doc / prj`）ので
`/^doc$/` では一致しない。ここを解けば (VE)→(VE) の4ケースは自動化できる。

**Finder が絡む8ケースは手動。** 手順を確実にするため
コマンド **「SKYNovel: トレースの区切りを入れる」**（`skynovel.trace` が true の時だけ
コマンドパレットに出る）を用意した。

##### 手順

1. 設定 `skynovel.trace` を true に
2. 【出力】→【ログ（ウインドウ）】を開く
3. 1ケースごとに：**コマンドで区切りを入れる**（ケース名を入力）→ 操作する → ログを見る
4. 下表に `watch.*` の値を書く

##### 記録表（mac / win で各6行）

| # | 経路 | 種別 | OS | cre | chg | del | rename | 全走査 |
|---|---|---|---|---|---|---|---|---|
| 1 | Finder→(VE) | 移動 | mac | | | | | |
| 2 | Finder→(VE) | コピー | mac | | | | | |
| 3 | (VE)→(VE) | 移動 | mac | | | | | |
| 4 | (VE)→(VE) | コピー | mac | | | | | |
| 5 | (VE)→Finder | 移動 | mac | | | | | |
| 6 | (VE)→Finder | コピー | mac | | | | | |
| 7〜12 | 同上 | | win | | | | | |

**値が揃ってから設計の議論に入る**（この節の (A)〜(H) の優先順位が変わりうる）。

#### 🐛 (H) エディタ主導の**変名だけ**で購読者が二重に呼ばれる【実測済み】

変名の扱い自体は良い設計。**del + cre に分解**し、判定を「対（旧,新）」ではなく
**辺ごと**に独立させているので、4通りが2つの if で尽きる（組み合わせが増えない）。

しかし実測すると、**経路が2つあって重なる**：

| 経路 | `watch.rename` | 監視の `cre` | 監視の `del` |
|---|---|---|---|
| `workspace.fs.rename` | **0** | 1 | 1 |
| `WorkspaceEdit.renameFile`（エディタ主導） | **1** | 1 | 1 |

⇒ エディタ主導の変名では `#onDidRenameFiles` と FS 監視の**両方**が
`w.crechg` / `w.del` を呼ぶ。**画像最適化と暗号化が2回走る。**
`need_go` はデバウンスで1回に見えるので**外からは気づけない**。

対処は2案：
1. `#onDidRenameFiles` で処理した uri を短時間だけ覚え、監視側で無視する
2. **FS 監視だけで足りるなら `#onDidRenameFiles` を消す**

macOS / VSCode 1.130 では 2 で足りそうだが、**Windows の監視が変名を
del+cre で報告するか未確認**（§4.5 の Windows テストが要る理由の一つ）。
実測は統合テスト「【調査】ファイル変名で…」が記録している。

#### ✅ (D) `doc/prj/*/` が1階層だけなのは意図的【変更しない】

`frame` などは多段になるが、**そこまで複雑な構造を一つの開発で同時には扱わない**
（htm をブラウザで直している間、エンジン側は放置する）。その他のフォルダは
エンジン自身の素材変更なので鋭敏に反応させる。**フォルダ規約ではなく開発の
進め方に基づく設計判断。** [WatchFile.ts](src/batch/WatchFile.ts) にコメント済み。

#### ✅ (E) WfbOptFont の広い glob は暗号化の網【狭めない】

`watchFld` は `doc/prj/*/` 始まりのパターンに暗号化を仕込み、`init` を渡すと
`findFiles(pat)` 全件へ初回の暗号化を回す。WfbOptFont の `init` が空なのは
**それを走らせるため**。狭めると該当拡張子の暗号化が黙って漏れる。両ファイルにコメント済み。

---

## 3.9. Open VSX 公開【見送り決定・2026/07】

**結論：出さない。GitHub Releases のみ。使いたい人は自己責任で DL。**

見送りの決め手は2つ。

1. **`engines.vscode: ^1.125.0` / `node >=24.11` を満たすフォークがほぼ無い。**
Cursor / Windsurf / Gitpod / Theia は本家より数ヶ月遅れるのが普通で、
そもそもインストールできない。VSCodium は追随するのでほぼ唯一の対象
2. **公開すれば「動くはず」という含意が生まれる。** 検証していない
VSCodium / Theia 等からの不具合報告を引き受けることになり、割に合わない

再申請が通らなかった場合に限り再検討する。以下は調査済みの内容（再開時の資料）。

- **期待していた「自動更新」は本家 VSCode では得られない**（2026/07 調査）
	- vsix で入れた拡張機能は自動更新の対象外（公式ドキュメント）
	- 本家のギャラリーは Marketplace 固定。Open VSX wiki の `product.json`
	`extensionsGallery` 書き換えは**フォーク向け**の案内で、本家への推奨ではない
	- 自動更新が効くのは **VSCodium / Cursor / Windsurf / Gitpod / Theia** など、
	ギャラリーが最初から Open VSX のエディタの利用者だけ
- **再開するとしたら理由はこの2つだけ**（配布の仕組みとしての利得は小さい）
	1. 再申請が通らなかった場合の保険（実在するレジストリの channel）
	2. Publisher Agreement 署名 ＋ namespace verified という信用の担保
- **再開時の前提**
	- Eclipse Foundation の Publisher Agreement 署名（ECA とは別物。
	GitHub 連携は済み → open-vsx.org のプロフィールから）
	- **namespace `famibee` の作成と ownership claim。** claim しないと
	未検証の警告バッジが付く
	- アクセストークンは環境ごとに別発行（発行時の一度しか表示されない）
	- Microsoft の Publisher Agreement 13(d) が他レジストリへの公開を許容（§1 参照）
- **自動化の方針**
	- ⛔ **`bun run release` の末尾に公開を足さない。** `publish` → `release` に
	改名したのは誤操作で公開しないためで、それを台無しにする。さらに悪いことに
	「チェックのつもりで走らせたら公開された」が起きうる
	- ⛔ **GitHub Actions は §5「PAT を CI に置かない」と衝突する。**
	採るなら方針変更として意識的に決めること
	- ✅ ローカルの独立スクリプトを推奨：`npx ovsx publish <vsix> -p "$OVSX_TOKEN"`
	（`ovsx` は dependencies に入れず npx 実行。ncu と同じ理由）
	- `ovsx publish` は**既存の vsix をそのまま上げられる**ので再ビルド不要。
	GitHub Releases と Open VSX に**同一バイト・同一 SHA256** の vsix が並ぶ

---

## 4. 公開前チェック【自動化済み】

`bun run release`（[release_chk.ts](release_chk.ts)）で、ビルドと以下のチェックまで自動。
**公開（vsce publish）は手動のまま**（PAT を CI に置かない方針）。

1. exec/spawn 系でパッケージマネージャを叩く箇所が許可リストに無ければ落とす
2. バンドルに混ぜてはいけない依存が dependencies に無いか
3. ビルド＆パッケージ（`vsce package`。`vscode:prepublish` の `chk:types` で型検査）
4. vsix 同梱物（秘密・設定・生成物が入っていないか、必要なものが揃っているか）
5. dist の巨大チャンク・`.npmrc` 読み取りコードの混入
6. vsix の SHA256 を出力

チェックを増やすときは release_chk.ts に足す。許可リストを緩めるときは
**理由をコメントに残すこと**（それが再申請時の説明材料になる）。

残っている案：

- GitHub Actions 化。ただし公開まで自動化すると PAT を secrets に置くことになるので、当面はローカル実行のまま

---

## 4.5. テスト基盤

| コマンド | 層 | 中身 |
|---|---|---|
| `bun test` | 単体 | bun の test runner（test/*.test.ts） |
| `bun run test:int` | API | 実 VSCode を起動し、**拡張機能ホストの内側**から `vscode` API を叩く |
| `bun run test:ui` | UI | Playwright で VSCode の**画面を外から**操作する |

### ⚠️ 先に調べるべきだった：既存のものを手で作り直していた

2026-07-27 に自作したが、**検索したら既にあった**：

| 既存 | 自作した相当物 | 評価 |
|---|---|---|
| **`@vscode/test-cli`**（公式が新規拡張機能に推奨） | `test/int/runTests.ts` ＋ 自前 `it()` | 設定駆動（`.vscode-test.js`）で VSCode の DL・user-data-dir・ワークスペース・Mocha を面倒見る。**専用 VSCode 拡張機能でUI実行・デバッグも可**。乗り換える価値あり |
| `@mshanemc/vscode-test-playwright` | `test/ui/runUI.ts` | test-electron ＋ Playwright の組み合わせ。ただし個人パッケージで保守状況は未確認。自作は約150行なので即断は不要 |
| VSCode の **MCP サーバー**群 | （検討もしていなかった） | 「Ctrl+Shift+P でできることは全部エージェントから」。**AI が VSCode を操作する話は Playwright ではなく MCP が本線**。ただし今回の目的（拡張機能自身の自動テスト）とは用途が違う |

**次の一手の候補：`test:int` を `@vscode/test-cli` へ移す。**
自前コードが減り、Extension Test Runner でUIから流せるようになる。
`test:ui` は当面自作のままでよい（依存が playwright-core だけで済んでいる）。

### 踏んだ罠（同じ所で止まらないように）

- **`test:ui` は bun では動かない。** Playwright の Electron 起動が45秒で
タイムアウトする（node なら約2.8秒）。esbuild で `.mjs` に出して node で走らせている。
**このリポジトリで唯一 bun を使わない経路**
- **`--user-data-dir` / `--extensions-dir` は必ずリポジトリ外へ。**
リポジトリ内に置いて vsix へ140ファイル混入させた。`release_chk.ts` に検査を追加済み
- **フィクスチャは無害でなければならない。** `node_modules/` `<FLD_SRC>/plugin/`
`src/batch/` が無いと、一時フォルダで【自動ビルド】タスクが起動して `npm i` が走る
- **`iframe.webview` は複数ある**（CHAT パネル等も webview）。`frameLocator` は
1つ目を掴むので、**全フレームから `#app` を探す**
- **ツリー項目のコマンドはコマンドパレットから開けない**（引数付きで呼ばれるため）。
行のクリックは選択だけで、動作は**右端のインラインボタン**（hover で出る）
- **アクティビティバーのアイコンはトグル。** ケース間でウィンドウを共有するので
状態を見てから押す
- **新規 user-data-dir では VSCode が英語で起動する。** `package.nls` のタイトルは
英語になるが、見出し（category）は多言語化されないのでそこで判定する

### 残件：Windows 環境の自動テスト【要望・後回し】

- mac 主導で Windows 環境のテストを実行したい。検証用の使い捨て試作も範疇
- 接続手段：ローカルネットワーク、または Windows 側にも Claude Code を入れて
アプリ間通信など
- **Windows PC は電源が入っていないことがある。**最初に確認し、以降は省略
- ⚠️ **基本的なテストは mac のみで完結させる。** Windows が落ちていても走ること。
または状況を見てスキップする仕組み
- 実装済みの `test:int` / `test:ui` はどちらも VSCode の実行パスを配列から
探しているので（`C:/Program Files/Microsoft VS Code/Code.exe` を含む）、
Windows 側でそのまま動く見込み。**未検証**

## 5. やってはいけないこと

**拡張機能内に VSIX の自動ダウンロード＆インストール機能を作らない。** これは「リモートコードのダウンロードと実行」そのもので、MS のブログで名指しされている監視対象。自動更新が失われるのは痛いが、これを作ると再申請を自分で潰す。

更新チェックは**通知だけ**に留め、ダウンロードはユーザーの手でブラウザ経由にする。既に [src/ActivityBar.ts:276](src/ActivityBar.ts:276) 付近で GitHub の CHANGELOG を fetch してバージョン比較しているので、その延長で通知は作れる。

---

## 6. 参照

- [Publisher Agreement (PDF)](https://cdn.vsassets.io/v/M261_20250904.11/_content/Visual-Studio-Marketplace-Publisher-Agreement.pdf)
- [Terms of Use (PDF)](https://cdn.vsassets.io/v/M264_20251020.18/_content/Microsoft-Visual-Studio-Marketplace-Terms-of-Use.pdf)
- [Security and trust in Visual Studio Marketplace (blog)](https://developer.microsoft.com/blog/security-and-trust-in-visual-studio-marketplace/)
- [ユーザー向け告知記事](https://famibee.blog.fc2.com/blog-entry-980.html)

再申請時の材料：公開済み `skynovel2-4.30.4.vsix` を既知のサプライチェーン攻撃指標（`webhook.site` / `eval(atob` / Shai-Hulud 系 IoC / 資格情報の外部送信パターン）で走査した結果は**検出なし**。資格情報関連の文字列ヒットは全て ncu の正常なコードだった。シグネチャベースの簡易チェックであり無汚染の証明ではないが、`.github/` が無く CI 公開もしていないため PAT 漏洩によるアカウント乗っ取り線は薄い。

---

## 7. リリース手順（このファイルは vsix に入らない）

### スクリプト早見表

| コマンド | 用途 |
|---|---|
| `bun run watch` | 開発。デバッグ実行（F5）の preLaunchTask が自動で呼ぶ。vite と esbuild の watch |
| `bun run build` | 一回だけの開発ビルド（vue + esbuild + views/*.ts） |
| `bun run chk:types` | 型検査のみ（`tsc -p tsconfig.chk.json --noEmit`、src + server）。リリース経路ではこれが唯一の型検査 |
| `bun test` | テスト |
| `bun run version:patch` | package.json のバージョンだけ上げる（`:minor` / `:major` も同様）。git タグ・コミットは作らない（`-no-git-tag-version` はダッシュ1個だが npm が解釈してくれることを実測確認済み） |
| **`bun run release`** | **公開前チェック6項目 ＋ vsix 生成**（[release_chk.ts](release_chk.ts)）。リリース時はこれを使う |
| `bun run pack_only` | チェックなしで vsix だけ作る。切り分け・急ぎのとき用 |
| `bun run update` | 依存の一括更新（本体 + server + グローバルの ncu） |
| `bun run rebuild` | node_modules 作り直し |
| `vscode:prepublish` | vsce が自動で呼ぶ。直接叩かない |

### ⚠️ 落とし穴

- スクリプト名は `release`。**`publish` という名前にすると `bun publish`（bun 組み込みの npm レジストリ公開）と打ち間違えたときに事故る**ので避けている
- `vsce publish` は使わない。PAT を置かない方針（公開は Web UI から手動）
- `bun run release` が1件でも ✗ を出したら公開しない。✗ の内容は [release_chk.ts](release_chk.ts) の該当箇所にコメントで理由が書いてある
- **ビルドは esbuild なので型を見ない。** 型検査は `vscode:prepublish` の `chk:types`（tsc）が担う。`pack_only` も prepublish 経由なので同じく通る
- `dist/` と `views/*.js` は生成物。前者は git 管理下、後者は .gitignore 済み

### 手順

1. `CHANGELOG.md` の先頭に `## vX.Y.Z` を追記（ユーザー向けの文言で。内部的な chore も残す）
2. `bun run version:patch`（CHANGELOG の見出しと package.json を一致させる）
3. `bun run release` → **6項目すべて ✓** と、末尾の SHA256 を確認
4. `git add -A && git commit -m "vX.Y.Z：..."` → `git push`
	- **3 → 4 の順は必須。**`dist/` は git 管理下で、`bun run release`（中で
	`vsce package` が走る）が dist を作り直すため、先にビルドしないとコミットに
	正しい成果物が入らない。**vsix の方がコミットより時刻が古いのは正常**
	- 大事なのは時刻の前後ではなく「**ビルドしてからコミットまでの間にソースを
	触っていない**」こと。コミット後に `git status` がクリーンなら満たしている
	（vsix は作業ツリーから作られるので、ツリー＝コミット内容なら vsix も一致する）
5. GitHub Releases で新規リリース
	- タグ：`vX.Y.Z`（コミット後の master に付ける）
	- 添付：`skynovel2-X.Y.Z.vsix`
	- 本文：§8 の原稿を貼り、SHA256 を差し替える
6. **アップロード後、GitHub が表示する digest と手元の SHA256 が一致するか確認**（下記）
7. ブログで告知（[前回の記事](https://famibee.blog.fc2.com/blog-entry-980.html)の続報として）

### SHA256 と GitHub の digest

2025/06 から **GitHub がリリース添付ファイルの SHA256 を自動で計算・表示する**
（[changelog](https://github.blog/changelog/2025-06-03-releases-now-expose-digests-for-release-assets/)）。
ブラウザから手でアップロードした場合も対象で、Releases の UI で各アセットの隣に出るほか、
REST API（アセットの `digest` フィールド。値は `sha256:<hex>`）、GraphQL、`gh` CLI からも取れる。

**それでも `bun run release` のローカル SHA256 は残す。** 用途が違うため：

- GitHub の digest は「**アップロードされた物**」のハッシュ。ローカルの値は
「**自分がビルドした物**」のハッシュ。**両者を突き合わせて初めて**、
アップロード時の破損や取り違え（別バージョンの vsix を上げた等）を検出できる
- 利用者はダウンロード後、手元で計算した値をリリースノートの記載と照合する。
GitHub の UI を見に行かなくても検証できる状態を保っておきたい

⚠️ **vsix を差し替えたら digest は変わる。** アセットは削除して上げ直す形になり、
新しい digest が振られるので、**リリースノート本文の SHA256 も必ず書き換えること**。

手元での出し方：

```bash
shasum -a 256 skynovel2-4.31.1.vsix
```

Windows は `certutil -hashfile skynovel2-4.31.1.vsix SHA256`。

---

## 8. Releases リリースノート原稿（v4.31.1）

そのまま貼れる形。**SHA256 は毎回差し替えること**（`bun run release` の出力を使う）。

````markdown
## インストール / Installation

Marketplace が利用できないため、この .vsix を手動でインストールして下さい。

1. 下の `skynovel2-4.31.1.vsix` をダウンロード
2. VSCode の【拡張機能】ビュー右上の `...` →【VSIX からのインストール】
3. または `code --install-extension skynovel2-4.31.1.vsix`

改ざん検知用のハッシュ値（ダウンロード後に照合して下さい）：

```
SHA256: ここに bun run release の出力を貼る
```

- macOS / Linux: `shasum -a 256 skynovel2-4.31.1.vsix`
- Windows: `certutil -hashfile skynovel2-4.31.1.vsix SHA256`

この値は GitHub がアセットの隣に表示する digest とも一致します。
どちらもビルド時のものと照合済みです。

## この版の変更 / Changes

**Python パッケージの導入が同意制になりました**

これまではプロジェクトを開いた時点で、確認なしに `pip install fonttools brotli` を実行していました。これを廃止し、**フォント最適化を有効にする時だけ**、実行するコマンドを表示したダイアログで同意を求める形にしました。【手動で入れる】を選んでも他の機能はそのまま使えます。

**bun があれば bun を使います**

`bun` が入っている環境では、拡張機能が発行するタスク（`npm i` / `npm run` など）を `bun` / `bunx` で実行します。無ければ従来どおり npm です。

**フォント最適化の改善・不具合修正**

- `&def_fonts` に並べた**すべてのフォント**をサブセット化するようになりました（従来は一つめのみ）
- 変換に失敗したときにフォントファイルが消えてしまう問題を修正
- Windows でフォント最適化が失敗する問題を修正
- fonttools を導入してもフォルダを開き直すと「未導入」に戻る問題を修正

**Windows の不具合修正**

- パッケージ生成後の【出力フォルダを開く】が反応しない／エラーになる問題を修正
- スコアエディタ（.ssn）でテキスト入力のイベントが登録されていなかった問題を修正

**内部**

- `npm-check-updates` を拡張機能本体のバンドルから外し、「ベース更新」時に `npx` で実行するように（バンドルが 2.5MB 削減）
- 拡張機能がユーザー環境で実行するものを README 冒頭と拡張機能の説明文に明記
- 公開前チェックを自動化（同梱物・バンドル混入・既知の攻撃指標の走査）

詳細は [CHANGELOG.md](https://github.com/famibee/SKYNovel-vscode-extension/blob/master/CHANGELOG.md) を参照して下さい。

## Marketplace について

2026年7月下旬に Visual Studio Marketplace から配布が停止されました。指摘された箇所を修正し、当面はこの GitHub Releases で配布します。経緯は[お知らせ記事](https://famibee.blog.fc2.com/blog-entry-980.html)にあります。
````

---

## 665. 問い合わせメール2（me->Support->(me->Support)）
Hi @k.s-24.9_1-4@leto.eonet.ne.jp,

Thank you for contacting Visual Studio Marketplace Support. As mentioned earlier, we request that you reach out to us again after the completion of the cooldown period(30 days).

For additional context on our security and trust practices, please refer to the Visual Studio Marketplace Security and Trust blog 
Thank you for your understanding and cooperation.
Regards,
VS Marketplace Support Team.
(representative:655cd9f9 )
From: k.s-24.9_1-4@leto.eonet.ne.jp <k.s-24.9_1-4@leto.eonet.ne.jp>
Sent: Sunday, July 26, 2026 8:26 PM
To: VS Marketplace Support <vsmagent@microsoft.com>
Cc: Visual Studio Marketplace Support <VSMarketplace@microsoft.com>
Subject: [EXTERNAL] Request for specific detection details — publisher famibee2 (not a reinstatement request)
 
Dear VS Marketplace Support Team,

Thank you for your reply (representative: 655cd9f9).

**This message is not a reinstatement request.** I understand and accept the mandatory 30-day cooldown period, and I will submit a formal request after it has elapsed. I am writing now only to ask for information that will let me remediate correctly before that time.

**Publisher:** famibee2
**Extension:** famibee2.skynovel2 (SKYNovel)
**Last published version:** 4.30.4

## My request

Could you tell me which specific provision was violated, and which detected behavior triggered the action? I want to fix the actual cause rather than guess. If you are unable to share detection details, please tell me that, so I do not wait on a reply that will not come.

## What I have already found on my own

I audited my source and package, and I want to report two findings in the interest of transparency.

**1. A genuine violation I found on my side.** My extension executed `pip install fonttools brotli` during activation, without an explicit consent prompt, to prepare a font-subsetting feature. I believe this violates the Publisher Agreement requirement that an offering must not install or launch executable code on the user's environment beyond what is identified in, or reasonably expected from, the Listing Information. This was a design error on my part, not an intentional act, and I am removing it. The corrected behavior will require explicit user consent and will be documented at the top of both the README and the extension description.

**2. A possible false positive I would like to flag.** My extension bundles `npm-check-updates`, a legitimate open-source dependency used to update the user's own project dependencies. Because it is minified into the production bundle, it appears as a large obfuscated file that reads `~/.npmrc`, enumerates `process.env`, and contacts package registries. I recognize that this pattern closely resembles credential harvesting. It is not — but I understand why an automated scan would flag it. I am restructuring the extension so this dependency is no longer bundled into the main file.

I also re-scanned the published .vsix for known supply-chain indicators and found none, but I would of course defer to your findings over mine.

## Two other questions

1. Will the publisher name `famibee2` remain reserved for me during the cooldown period? I understand from the Publisher Agreement that a revoked account's name may become available to other publishers, and I would like to avoid that outcome if possible.
2. When I submit my request after the cooldown, would it help to have the corrected .vsix and a written summary of the changes ready for review?

SKYNovel is a free, MIT-licensed game engine toolkit that I have maintained for several years for a small community of visual-novel authors. I take the security expectations of the Marketplace seriously and I want to meet them properly.

Thank you for your time.


---

## 666. 問い合わせメール（me->Support->me）
Hello,
 
Thank you for reaching out.
Your publisher is blocked and the extension is removed in accordance with the Visual Studio Marketplace Publisher Agreement and the Visual Studio Marketplace Terms of Use .
As per the Visual Studio Marketplace policy, a mandatory cooldown period of 30 days is required before any reinstatement, and extensions are not reinstated after removal.

We request that you reach out to us again after the completion of the cooldown period. At that time, we will review your request based on the applicable policy and required remediation.
For additional context on our security and trust practices, please refer to the Visual Studio Marketplace Security and Trust blog 
Thank you for your understanding and cooperation.
Regards,
VS Marketplace Support Team.
(representative:655cd9f9 )
From: VS Marketplace Support <vsmagent@microsoft.com>
Sent: Friday, July 24, 2026 10:17 AM
To: k.s-24.9_1-4@leto.eonet.ne.jp <k.s-24.9_1-4@leto.eonet.ne.jp>
Cc: VS Marketplace Support <vsmagent@microsoft.com>; Visual Studio Marketplace Support <VSMarketplace@microsoft.com>
Subject: RE: [EXTERNAL] URGENT: Publisher Account Inaccessible, Marketplace Returning 429, and Extension Page Returning 404 (famibee2)
 
Hi k.s-24.9_1-4@leto.eonet.ne.jp

Thank you for contacting Visual Studio Marketplace Support. We received your message, and we will get back to you with a response as quickly as possible.

Primary support team business hours are 9AM - 5PM, weekdays Indian Standard Time. Have any additional details that can help us assist you? Feel free to send it by replying to this email.

Regards,
VS Marketplace Support Team

________________________________________ From: k.s-24.9_1-4@leto.eonet.ne.jp Sent: Friday, 24 July 2026 04:46:18 To: Visual Studio Marketplace Support Subject: [EXTERNAL] URGENT: Publisher Account Inaccessible, Marketplace Returning 429, and Extension Page Returning 404 (famibee2) [You don't often get email from k.s-24.9_1-4@leto.eonet.ne.jp. Learn why this is important at https://aka.ms/LearnAboutSenderIdentification ] Hello Visual Studio Marketplace Support Team, I am the owner of the Visual Studio Marketplace publisher "famibee2" and am requesting urgent investigation and assistance. My publisher account appears to be experiencing a serious Marketplace-side issue that is preventing me from managing or publishing my extension. Publisher: famibee2 Extension ID: famibee2.skynovel2 Affected Extension URL: https://nam06.safelinks.protection.outlook.com/?url=https%3A%2F%2Fmarketplace.visualstudio.com%2Fitems%3FitemName%3Dfamibee2.skynovel2&data=05%7C02%7Cvsmagent%40microsoft.com%7C23fd966847da4d39e32708dee93e881f%7C72f988bf86f141af91ab2d7cd011db47%7C1%7C0%7C639204652152603864%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C60000%7C%7C%7C&sdata=BYaTnMvKO3AUAznM2Jusuvqiz92NO%2Fqy0R%2BbFVM1nwg%3D&reserved=0 Current issues: - I can sign in to my Microsoft account successfully. - However, I cannot access the Visual Studio Marketplace Publisher portal. - The Marketplace /manage page consistently returns: "429 - Woah, that's a lot of requests" - Marketplace search pages are also returning HTTP 429 errors. - The extension page for famibee2.skynovel2 now returns 404 Not Found. - VS Code reports that the extension is no longer available in the Marketplace. - Because of this, I am unable to manage, update, or publish my extension. What concerns me most is that the extension itself appears to have disappeared from the Marketplace. The extension URL that was previously available now returns 404, while the publisher portal is simultaneously inaccessible due to repeated 429 responses. Since my Microsoft account authentication is functioning normally, this appears to be a Marketplace or publisher-account-specific issue rather than a sign-in problem. This situation is preventing all maintenance and release activities for my project and may impact existing users who rely on the extension. Could you please urgently investigate: - The current status of publisher "famibee2" - Whether the publisher account has been restricted, suspended, disabled, or flagged in error - Why Marketplace management and search pages are returning HTTP 429 - Why the extension famibee2.skynovel2 is returning 404 - What actions are required to restore publisher access and extension availability If necessary, please escalate this case to the appropriate Visual Studio Marketplace engineering team for investigation. I would greatly appreciate an urgent review, as I currently have no ability to access the publisher portal or manage the extension. Thank you for your time and assistance. I look forward to your response. Best regards, [Your Name] Owner of Visual Studio Marketplace Publisher "famibee2" Microsoft Account: [your Microsoft account email] Timezone: Japan Standard Time (JST) ; --------------------------------------------------- ; ふぁみべぇ《famibee@gmail.com》 ;　電子演劇部 ;　https://nam06.safelinks.protection.outlook.com/?url=http%3A%2F%2Ffamibee.blog38.fc2.com%2F&data=05%7C02%7Cvsmagent%40microsoft.com%7C23fd966847da4d39e32708dee93e881f%7C72f988bf86f141af91ab2d7cd011db47%7C1%7C0%7C639204652152632574%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C60000%7C%7C%7C&sdata=58OpxDXH4ixpaWAepmQLvs%2B8BRvfdwAXH0zKKfNPz1w%3D&reserved=0 ; ---------------------------------------------------
