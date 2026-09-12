# テスト基盤

統合テスト・UIテストの構成、踏んだ罠、移行記録。TODO.md から分離（2026-08-26）。

⚠️ **決着・凍結した判断は対応コードのコメントへ移す**（重複を避けるため）。
ここに残すのは①対応コードが無い判断、②未着手・低優先度の宿題、③今後の
再検討を避けるための実測値・調査記録。数字を書く基準は
[TODO.md](TODO.md) 冒頭を参照。

---

## 4.5. テスト基盤

### 📊 起動にかかる時間【実測・2026-07-28】

拡張機能のロード開始からの経過（フィクスチャ4ファイル・macOS）：

| 段階 | 時間 |
|---|---|
| **操作可能まで**（ツリー・コマンド登録） | **100.8 ms** |
| 環境確認まで（pip / node / npm / bun） | 645.1 ms |
| LSP 準備まで（ホバー・補完が効く） | 814.3 ms |

⇒ **v4.31.2 の「登録を環境確認より先に」が効いている。**
待っていたら操作可能まで 645ms かかっていた計算になる。
統合テスト「【調査】起動にかかる時間」が毎回記録するので、遅くなれば気づける。

⚠️ **他のケースより先に置くこと。** 後続が `clearTrace()` を呼ぶので、
起動時の記録はそれまでにしか読めない。


| コマンド | 層 | 中身 |
|---|---|---|
| `bun test` | 単体 | bun の test runner（test/*.test.ts） |
| `bun run test:int` | API | 実 VSCode を起動し、**拡張機能ホストの内側**から `vscode` API を叩く |
| `bun run test:ui` | UI | Playwright で VSCode の**画面を外から**操作する |

### 💡 画面は私からも撮れる【確立・2026-07-28】

Playwright で VSCode を起動し、**CDP の `Page.captureScreenshot`** で撮る。
Playwright 自身の `screenshot()` は webview で「フォント読み込み待ち」から
返らないことがあるので使わない。

**実機の拡張機能を見たいとき**（既にインストールされている版を確認する場合）：
`--disable-extensions` を**付けず**、`--extensions-dir` に `~/.vscode/extensions`
を指し、**`--user-data-dir` だけ一時フォルダ**にする（利用者の設定を汚さない）。

### 🧹 確認作業のあとの掃除

画面確認で VSCode を起動すると、**1回で 15〜30MB の使い捨てデータ**が残る
（`--user-data-dir` / `--extensions-dir`）。2026-07-28 に7組で 122MB 溜めた。

```bash
find "$(node -e 'console.log(require("os").tmpdir())')" -maxdepth 1 -name 'sn_ext_*' -exec rm -rf {} +
```

⚠️ **`rm` にグロブを渡さない。** zsh は**一致しないグロブでその行ごと中断**するので、
`rm -f a*.mjs b*.mjs` の前半だけ消えて後半が残る（同じ失敗を3回した）。
`find … -delete` か `-exec rm -rf {} +` を使う。
**「消した」と報告したのに残っていた**のはこれが原因。

### ✅ 目視確認が要る変更の記録【2026-07-28・全件完了】

自動テストで到達できない見た目の変更は、作者の目視で確認した。

| # | 変更 | 結果 |
|---|---|---|
| 1 | アイコン42種を SVG 化 | **見た目ほぼ変化なし**。照合ページ `test/icon-check/` で新旧を番号付きで比較 |
| 2 | 音声最適化タブの「∨」 | 🐛 **ずれを発見・修正**（重ねる方式 → select の背景画像方式へ） |
| 3 | `node_win9.jpg` の縮小 | 作者が加工 |
| 4 | `set_cancel_skip` をパレットから除外 | 出ないことを確認 |
| 5 | 旧版同居の警告 | **実機で確認** |
| 6 | tmpwiz 画像の 1000px 化 | **遜色なし** |

⚠️ **5 は統合テストでは踏めない。** テストは `--disable-extensions` で
他の拡張機能を無効化するため、`extensions.getExtension('famibee2.skynovel2')`
が取れない。**両方インストールされた環境でしか確認できない。**

💡 **新旧を番号付きの表で並べたページを作ると、作者が「3 番はこう」と指摘できる。**
アイコン照合はこれで解決した（`test/icon-check/`）。文章で列挙するより速い。

### 残件：Windows 環境の自動テスト【要望・後回し】

⚠️ **「mac 主導で Windows 環境のテストを実行する」こと自体は 2026-09-13 に
実証済み。** Windows 側にも Claude Code を入れ、mac 側セッションから
クロスセッションメッセージ（`SendMessage`）で指示を送る形で、実際に
Windows 実機の `test:int`/`test:ui` 実行・D&D 自動化の実装・バグ修正までを
mac 側から依頼し、結果を受け取って `file-watch.md`/`testing.md` に反映する、
という一連の流れが1日通して機能した（本セッションの D&D 自動化作業がその実例）。
下記の残課題は「この方式を毎回の定型作業にする」ための整備であって、
「そもそも繋がるか」はもう疑問ではない。

- mac 主導で Windows 環境のテストを実行したい。検証用の使い捨て試作も範疇
- 接続手段：ローカルネットワーク、または Windows 側にも Claude Code を入れて
アプリ間通信など
- **Windows PC は電源が入っていないことがある。**最初に確認し、以降は省略
- ⚠️ **基本的なテストは mac のみで完結させる。** Windows が落ちていても走ること。
または状況を見てスキップする仕組み
- 実装済みの `test:int` / `test:ui` はどちらも VSCode の実行パスを配列から
探しているので（`C:/Program Files/Microsoft VS Code/Code.exe` を含む）、
Windows 側でそのまま動く見込み。**未検証**

⚠️ **CI（GitHub Actions の `windows-latest` ランナー）は保留（2026-09-13 検討）。**
Windows PC の電源問題は解消できるが、実機固有の挙動（アイコン生成の Python 依存など）
は CI では検証できず、GUI を伴う `test:ui`（Playwright/Electron）が Windows CI
ランナーで安定して動くかも未検証のまま。1ケースだけ試すところから。

⇒ **本命は Windows 実機で手動運用。** Windows 側で `test:int` / `test:ui` を実行し、
気づいた修正は Windows 側で直して `blues-sync` へ push（許可不要）。
そこから本流（`origin`）への反映は、これまで通り都度ユーザーの明示指示を待つ。

#### ⇒ 電源確認・定型運用の設計【決定・2026-09-13】

「Windows PC は電源が入っていないことがある」の確認は、**ネットワーク層の
ping ではなく `ListAgents` の status（`running`/`offline`）で代用する。**
Windows 側 Claude Code セッションが起動していれば `running` になり、
これは「PC の電源」より一段狭い「いま Windows 側にテストを依頼できるか」を
そのまま表すので目的に過不足ない。

⚠️ **`ListAgents` に出るセッション名は起動のたびに不定**（今回は `Mac-ping`）。
固定名を決め打ちにはしない。代わりに、**Windows 側は起動時に mac 側へ
シェイクハンド（疎通確認）メッセージを送り、その中で自分のセッション名を
名乗る**運用にする（本セッションが受けた `Mac-ping` からのメッセージが実例）。
mac 側はそれを受けて以降のテスト依頼にその名前を使い、`offline` になったら
または該当セッションが見当たらなければその回は省略し、mac 完結分のテストのみで
終える（上記「基本的なテストは mac のみで完結させる」の通り）。

**決定（2026-09-13）：`/loop` 等による定型スクリプト化はしない。**
Windows 実機の自動テストは頻度の低いレアケースなので、必要になった都度
Claude（このセッション）が `ListAgents` → `SendMessage` の手順を判断して
実行すれば足りる。常時待ち受ける仕組みは過剰。

**Win 側の対応完了（2026-09-13）**：シェイクハンド仕様変更（本文に自分の
セッション名を明記する）を依頼し、Win 側で `mac-ping` コマンドを更新済みとの
返信を受けた（セッション名の例：`skynovel-vscode-extension-3a`）。

#### 🐛 Windows：他に VSCode ウィンドウが開いていると `test:int` が不安定【2026-09-13】

clone → `bun install`（`postinstall` で `server/` 側も）→ `bun run build` は
Windows でも無改変で通った。しかし `bun run test:int` は Mocha 側の assertion が
全て✔でも `Exit code: 1` になり、しかも実行のたびに完走するテスト数が違う
（ある回は6件消化、別の回は2件目で打ち切り）という不安定な挙動になった。

毎回ログ冒頭に `Error: Error mutex already exists`
（`installMutex`、VSCode 本体の `main.js` 内）が出る。同じ Windows 機で
**別の VSCode ウィンドウ（この統合テストを動かしている Claude Code 自身が
拡張機能として動くホストを含む）を開いたまま** `test:int` を実行したところ、
検証用に起動したはずの Electron の起動引数 `--disable-extensions`
（`test/prep.ts` の `launchArgs`）が、**分離されているはずのその実ウィンドウ側に
漏れて適用され**、「All installed extensions are temporarily disabled」の
バナーが実際の作業中ウィンドウに出た。`--user-data-dir` / `--extensions-dir` で
プロファイルを分けていても、Windows では単一インストールに対する
シングルインスタンス制御が優先され、新規起動が独立プロセスにならず
既存ウィンドウへ引数を横流ししている模様。

⇒ **Windows で `test:int` / `test:ui` を実走させるときは、同じ VSCode
インストールに属するウィンドウを他に一つも開かない状態で実行する必要がありそう**
（本家 mac 側では起きない、Windows 固有の制約）。

**【解消確認済み・2026-09-13】** この Claude Code セッション自身のホストを含め
全 `Code.exe` を終了 → ユーザーが VSCode を単独ウィンドウで再起動 → その状態で
`bun run test:int` を再実行したところ、`main` スイート（8 passing/2 failing）・
`multi` スイート（3 passing）とも**完走**し、以前のような「実行のたびに完走数が
変わる／早期打ち切り」は再現しなかった。`Error: Error mutex already exists` の
ログ自体は今回も出るため**無害な警告**（同一インストールへ2本目の Electron を
向けたときの定型メッセージ）と見てよく、実害は「他ウィンドウへの `--disable-extensions`
漏れ」の方だったとみられる。根本原因（VSCode 側のシングルインスタンス実装か
`@vscode/test-electron`/`@vscode/test-cli` の Windows 対応漏れか）の特定は
引き続き未着手だが、**運用上の回避策（他ウィンドウを開かずに実行する）で足りる**。

**🐛 新規発見：Windows でパスが `C:\c:\...` と二重になり ENOENT【2026-09-13】**

上記の完走した実行で、`main` スイート中に未処理の rejected promise が発生：

```
rejected promise not handled within 1 second: Error: ENOENT: no such file or directory,
open 'C:\c:\Users\ks-24\AppData\Local\Temp\sn_ext_test\main\doc\prj\script\setting.sn'
```

ドライブレターが `C:\c:\...` と二重になっている。

**【原因特定・修正済み・2026-09-13】** `WfbSettingSn.ts`（`setting.sn` の監視）が
`watchFld()` の `init` コールバックで `uri.path` を**そのまま**使っていたのが原因。
`uri.path` は Windows では先頭に **`/`＋ドライブ名（小文字）`** が付く形式
（例：`/c:/Users/…/setting.sn`）で、これを素通しで `fs-extra` の
`existsSync`/`readFile` に渡すと、Node の Windows 側パス解決
（`path.resolve` 相当。絶対パスにする際に「ドライブ無しの root-relative パス」と
誤認識される）が「カレントドライブ（`C:`）＋この文字列をそのまま連結」してしまい
`C:\c:\Users\…` と二重になる。

この codebase では既に `WfbOptPic.ts`/`WfbOptSnd.ts` が
`const path = vsc2fp(uri.path);`（`CmnLib.ts`）でこの `/c:` プレフィックスを
剥がしてから使う、という正しい書き方をしていた。`WfbSettingSn.ts` と
`WfbOptFont.ts`（同じ `async ({path})=>` の分解代入パターンで `uri.path` を
直接使っていた）だけがこれを踏襲しておらず、**mac では `uri.path` にドライブ
レターが無く問題が起きないため長らく見落とされていた**、Windows 固有のバグ。

**修正**：両ファイルで `uri` をそのまま受け取り `vsc2fp(uri.path)` を通す形に変更
（[WfbSettingSn.ts](../batch/WfbSettingSn.ts) / [WfbOptFont.ts](../batch/WfbOptFont.ts)）。

修正後に `bun run test:int` を再実行し、ENOENT と「追加してすぐ消すと path.json は
同一で、全走査しない」の失敗が解消したことを確認済み（`main` スイート
8→9 passing、2→1 failing）。

**残る1件「【調査】全走査は何 ms か」は別件**：全走査が一度も起きていない
（測れていない）。上記のパス二重化バグとは無関係（ENOENT は出ていない）で、
25本の `.sn`（各100ラベル）を書いた後 `sleep(6000)` で落ち着かせてから計測に
入る設計（`test/int/suite.js`）。**Windows のディスク I/O・アンチウイルスの
リアルタイムスキャン等でこの待ち時間内に初期スキャンが収まらず、計測ウィンドウ
自体を逃している可能性がある**（mac向けに調整された sleep 値が Windows では
足りない、という仮説）。未検証・未着手。

**test:ui【実施済み・2026-09-13】**：単独ウィンドウの状態で `node test/ui/runUI.mjs`
（`bun run test:ui`）を実行し、SKYNovel/BlueSNovel 両プロジェクトの計12ケースが
全て成功（12/12）。mutex 絡みの不安定さは再現しなかった。

その後、同スイートへ **D&D (VE)→(VE) の移動・コピー2ケースを追加実装**
（[file-watch.md](file-watch.md) の「ドラッグ＆ドロップ12ケース」参照）。
計14ケースで再計測し全て成功（安定して2回連続成功を確認）。

**🐛 mac 版で2件バグを発見・修正済み【2026-09-13】**：Finder↔VSCode 間の
D&D 自動化を検討する過程で、Claude Code（VSCode 上で動く）自身のセッションから
`bun run test:ui` を試したところ VSCode が起動できず、原因調査でmac固有の
2件が見つかった。

1. **`A_VSC` の mac パスが古い実行体名のまま**：`test/ui/runUI.ts` は
mac 実行体を `Contents/MacOS/Electron` 固定で探していたが、現在の VSCode は
`Contents/MacOS/Code`（Windows/Linux と同じ命名）。旧名の版がインストール
されていないと丸ごと「VSCode が見つかりません」で失敗する。両対応に修正済み
2. **Ctrl+ドラッグのコピーテストが mac で失敗**：`dragWithModifier()`
の呼び出しが `'Control'` 固定だった。**mac は Ctrl+クリックが副ボタン
クリック（右クリック）に化ける**ため、ドラッグの代わりにコンテキスト
メニューが開いてしまいコピーが成立しない。mac は `Option`(`Alt`) を
使うよう分岐して修正済み（コピーの修飾キーが Windows/Linux と mac で
違うこと自体は本節冒頭の「実装済み手順」に既に書かれていたが、コードには
未反映だった）

⚠️ **これらは「VSCode 上で動く Claude Code のセッションからは `_electron.launch()`
で別インスタンスを起動できない」（シングルインスタンス制御に吸収される）**
という制約の副産物として見つかった。プレーンなターミナルから実行すれば
両方の問題を踏まずに済んだはずだが、結果的に踏んでいない環境（mac の
plain terminal）での実行機会が今まで無かったことを示している。

修正後、`bun run test:ui` は SKYNovel/BlueSNovel 両プロジェクト
計16ケースが全て成功（16/16）。

### ⚠️ 「エディタでしか見えないエラー」の切り分け【2026-07-28】

**エディタに出て CLI に出ないものは、2種類ある。混同しないこと。**

| 症状 | 正体 | 対処 |
|---|---|---|
| エディタだけがエラーを出す | **エディタの ESLint サーバが古い TypeScript プロジェクトを掴んでいる**（`tsconfig.json` を編集した直後に起きる）。**偽陽性で、CLI が正しい** | ウィンドウ再読み込み |
| CLI だけが見逃す | **lint スクリプトの対象が設定の守備範囲より狭い** | 対象を広げる（下記） |

確かめ方は簡単で、**わざと `const zz: any = 1; zz();` を混ぜて CLI が捕まえるか**見る。
捕まえるなら CLI は型付きで見えている（＝エディタ側の問題）。

実際に見つかった穴：**`views/` が lint スクリプトの対象外**だった。
設定には `views/**` のルールが3つあるのに、CLI は
`src server/src test build.ts release_chk.ts` しか渡していなかった
（その後 `tools/` へ移動）。
⇒ `views` と `.vscode-test.mjs` を追加。**注入テストで実際に捕まることを確認済み。**

- `.vscode-test.mjs` は `allowJs` していないので tsconfig に入らず、素の
`projectService` では**「プロジェクトに無い」で解析されず素通り**していた。
`projectService: {allowDefaultProject: ['.vscode-test.mjs']}` で拾う

**三つの実行系が併存していることの整理**（`it` の意味が混ざらないように）：

| 実行系 | 対象 | テスト関数 |
|---|---|---|
| `bun test` | `test/Encryptor.test.ts` | `import {it} from 'bun:test'`（**明示 import**） |
| `vscode-test`（Mocha） | `test/int/suite.ts` | **グローバルの `it`**。`/// <reference types="mocha" />` で宣言 |
| `node`（Playwright） | `test/ui/runUI.ts` | 自前の **`uiCase()`**（`it` と名乗らせない） |

⚠️ `tsconfig.json` の `types` に `"mocha"` を足すと **`it`/`describe` が全ソースに生える**。
必要なのは統合テストだけなので、そのファイルの三連スラッシュ参照で足りる。

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

---

### ✅ 完了の記録（4.5）

⚠️ **`@vscode/test-cli` への移行の詳細・踏んだ罠は対応コードのコメントへ移した**：
[.vscode-test.mjs](../../.vscode-test.mjs)（Mocha UI・タイムアウト）、
[test/prep.ts](../../test/prep.ts)（フィクスチャ・起動オプション）、
[eslint.config.mts](../../eslint.config.mts)（`jest/expect-expect` を off にした理由）。
`release_chk.ts` が失敗理由を隠していた件は同ファイルの `vsce package` 呼び出し箇所に
コメントがある。

### `test:ui` の寄せ先【調査済み・2026-07-28 → 当面は自作のまま】

| 候補 | 状態 | 判断 |
|---|---|---|
| 自作（`playwright-core` のみ・約150行） | **12/12 通る** | **当面これ** |
| `@mshanemc/vscode-test-playwright` | **最終公開 2025-06-02・beta のまま**（2026-07-28 時点で1年以上更新なし） | ❌ 寄せない |
| **`vscode-extension-tester`（ExTester）** | **最終公開 2026-03-12。リリースが継続していて活発** | ⬜ **将来の本命** |

自作の代償は「**セレクタが VSCode の内部 DOM に依存し、更新で壊れうる**」こと。
ExTester は**ページオブジェクト**を持つのでそこが薄くなる。ただし
**Selenium/WebDriver ベースで Playwright とは別物**なので、12ケースの書き直しになる。

⇒ **セレクタ崩れが実際に起きてから**移る。いまは動いているものを壊す理由がない。

#### ✅ フォーカスを奪われない【解決・2026-07-28】

実装・実測値・踏んだ罠は [test/hideWin.ts](../../test/hideWin.ts) 冒頭のコメントへ移した。

#### ⚠️ 先に調べるべきだった：既存のものを手で作り直していた

2026-07-27 に自作したが、**検索したら既にあった**：

| 既存 | 自作した相当物 | 評価 |
|---|---|---|
| **`@vscode/test-cli`**（公式が新規拡張機能に推奨） | `test/int/runTests.ts` ＋ 自前 `it()` | 設定駆動（`.vscode-test.js`）で VSCode の DL・user-data-dir・ワークスペース・Mocha を面倒見る。**専用 VSCode 拡張機能でUI実行・デバッグも可**。乗り換える価値あり |
| ~~`@mshanemc/vscode-test-playwright`~~ | `test/ui/runUI.ts` | ❌ **寄せない（2026-07-28 調査）。最終公開 2025-06-02 で1年以上更新なし・beta のまま**。いまより保守状況の悪い依存を抱えることになる |
| VSCode の **MCP サーバー**群 | （検討もしていなかった） | 「Ctrl+Shift+P でできることは全部エージェントから」。**AI が VSCode を操作する話は Playwright ではなく MCP が本線**。ただし今回の目的（拡張機能自身の自動テスト）とは用途が違う |

