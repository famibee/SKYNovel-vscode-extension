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

- mac 主導で Windows 環境のテストを実行したい。検証用の使い捨て試作も範疇
- 接続手段：ローカルネットワーク、または Windows 側にも Claude Code を入れて
アプリ間通信など
- **Windows PC は電源が入っていないことがある。**最初に確認し、以降は省略
- ⚠️ **基本的なテストは mac のみで完結させる。** Windows が落ちていても走ること。
または状況を見てスキップする仕組み
- 実装済みの `test:int` / `test:ui` はどちらも VSCode の実行パスを配列から
探しているので（`C:/Program Files/Microsoft VS Code/Code.exe` を含む）、
Windows 側でそのまま動く見込み。**未検証**

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

ドライブレターが `C:\c:\...` と二重になっている。`extension.js:59` 付近
（`#O` 関数、`WatchFile.ts` 由来）でファイル URI と Windows 絶対パスの結合を
誤っている可能性が高い（mac ではドライブレターが無いため顕在化しない）。

このエラーの影響で、後続の2件が失敗：

- 「追加してすぐ消すと path.json は同一で、全走査しない」…
  期待1回のところ0回（`setting.sn` 読み取り失敗で状態が乱れた可能性）
- 「【調査】全走査は何 ms か」… 全走査が一度も起きていない（測れていない）

**未着手**：`#O` 関数（`WatchFile.ts` 経由）でのパス結合箇所の特定と修正。
mac では発生しないため見落とされていた Windows 固有バグの可能性が高い。

test:ui はまだ着手していない。

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

