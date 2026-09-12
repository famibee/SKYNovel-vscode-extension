# ファイル監視の設計

ファイル監視・暗号化・D&D の発火イベント調査と設計上の未着手項目。TODO.md から分離（2026-08-26）。

⚠️ **決着・凍結した判断は対応コードのコメントへ移す**（重複を避けるため）。
ここに残すのは①対応コードが無い判断、②未着手・低優先度の宿題、③今後の
再検討を避けるための実測値・調査記録。数字を書く基準は
[TODO.md](TODO.md) 冒頭を参照。

---

## 3.8. ファイル監視の設計【(A)〜(D) 未着手・計測待ち】

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
| 4 | need_go は path.json が**実際に変わったときだけ** | **既にそう**（書く前後を比較して短絡） | ✅ 済 |
| 5 | 監視は1本＋振り分け | パターンごとに `createFileSystemWatcher`（9本） | **効果小・やらない** |
| 6 | 内容変化で path.json を作り直さない | **既にそう**（CRE/DEL のみ。CHG では呼ばない） | ✅ |
| 7 | フォルダ・リネームも同じ口 | **既にそう**（合成イベントをレジストリへ replay） | ✅ |
| 8 | 監視の深さは用途に合わせる | **1階層＝意図的** | ✅ |

### 個別（未着手）

#### 🐛 (A) マルチルートで static が後勝ち【最重・要判断】

**何が困るか：** ウィンドウに**プロジェクトを2つ開く**と、片方を触ったのに
**もう片方が処理される**。最悪、**別プロジェクトの鍵設定でファイルが暗号化される。**

**なぜそうなるか：** `WatchFile.#updPathJson` と `encIfNeeded` が **static**
（＝クラスに1つしかない置き場。[WatchFile.ts:46](../batch/WatchFile.ts:46) にコメント済み）。
`Project` は**ワークスペースフォルダごとに1個**作られ、それぞれが `initOnce()` で
この共有の置き場を**上書きする**。⇒ **最後に初期化されたプロジェクトの設定が
全員に使われる**（後勝ち）。

```
プロジェクトA を開く → 置き場 = A の設定
プロジェクトB を開く → 置き場 = B の設定   ← A の分が消える
A の画像を差し替える → B の設定で処理される ← ここが事故
```

`package.json` の keywords に `multi-root ready` と書いてあるが、**実装が伴っていない。**
（**これ1件だけではない。** マルチルート全体の棚卸しは [multiroot.md](multiroot.md)）

**直し方：** static をやめてインスタンスごとの持ち物にする（`Project` が自分の分を持つ）。
**暗号化の挙動が変わるので、他の変更を混ぜず単独の版で出す。**
再現テストは実装済み（`test/int/multi.ts`）。

#### ⚠️ (B) 500ms のまとめが監視インスタンスごと【実測済み】

**何が困るか：** **画像と音声を同時にドロップする**と、`loadEx`
（＝プロジェクト全体の走査＋暗号化）が**2回走る**。1回で済むはずの重い処理が倍になる。

**なぜそうなるか：** ファイル監視は**パターンごとに別インスタンス**（`{jpg,png}` 用、
`{mp3,wav}` 用…と9本ある）。「立て続けの変化を 500ms まとめて1回にする」という
待ち合わせが、**その1本ずつに付いている**。⇒ 画像用と音声用が**別々に**
500ms 数えて、**別々に** `updPathJson()` を呼ぶ。

```
いま        画像監視 ─500ms→ updPathJson()   ← 2回走る
            音声監視 ─500ms→ updPathJson()
あるべき姿  画像監視 ┐
            音声監視 ┴500ms→ updPathJson()   ← 1回
```

まとめる単位が**監視の種類**ではなく**プロジェクト**であるべき、という話。
後段の LSP 全走査は `#sendNeedGo()` の 300ms が既に1回にまとめているので、
**そこまで届く前の段が抜けている**形。

**直し方：** 待ち合わせをプロジェクト側へ移す（実質1行）。
ただし **(A) が「static をやめる」なのに対して、これは「共有する」方向で逆行する**。
**(A) を先にやり、その新しい持ち物の上でまとめること。**

#### (C) `updPathJson()` が3役【要分割】

1つの関数が **path.json 更新＋暗号化／ドロップ先候補の更新／LSP への全走査要求**を
兼ねている。画像を1枚置いただけで3つとも走る。

#### 🐛 (D) エディタ主導の**変名だけ**で購読者が二重に呼ばれる【実測済み】

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

macOS / VSCode 1.130 では 2 で足りそうで、**【Windows 実測済み・2026-09-13】
Windows でも同じく del+cre で報告される**ことを確認した（実機・単独ウィンドウで
`bun run test:int` を実行、統合テスト「【調査】ファイル変名で…」の記録）：

| 経路 | `watch.rename` | 監視の `cre` | 監視の `del` |
|---|---|---|---|
| `workspace.fs.rename` | 0 | 1 | 1 |
| `WorkspaceEdit.renameFile`（エディタ主導） | 1 | 1 | 1 |

mac の実測と完全に一致（数値の差なし）。⇒ **「Windows で同じ挙動か未確認」
という保留は解消**。案2（`#onDidRenameFiles` を消す）で進めてよい、という
判断材料が揃った。**ただし実際の削除・移行はまだ未着手**（このセッションでは
検証のみ実施。設計変更はどちらの案にするか含め要判断）。

#### 📊 操作方法ごとの発火イベント【実測・macOS / VSCode 1.130】【Windows実測済み・2026-09-13】

**Windows でも同じ表になることを実機で確認済み**（数値差なし。単独ウィンドウで
`bun run test:int` 実行）。以下は元の mac 実測。

「エクスプローラー操作と外部操作でイベントが違うのでは」という疑いを実測した。
統合テスト「【調査】操作方法ごとの発火イベント一覧」が毎回記録するので、
VSCode の版で変わったら気づける。

| 操作 | cre | chg | del | rename | 全走査 |
|---|---|---|---|---|---|
| 外部 追加（`writeFileSync`） | 1 | – | – | – | 1 |
| 外部 **変更**（上書き） | – | **1** | – | – | **0** |
| 外部 変名（`renameSync`） | 1 | – | 1 | – | 1 |
| 外部 削除（`unlinkSync`） | – | – | 1 | – | 1 |
| VSCode 追加（`workspace.fs.writeFile`） | 1 | **1** | – | – | 1 |
| VSCode 変名（`workspace.fs.rename`） | 1 | – | 1 | – | 1 |
| VSCode 削除（`workspace.fs.delete`） | – | – | 1 | – | 1 |
| **エディタ 変名**（`WorkspaceEdit.renameFile`） | 1 | – | 1 | **1** | 1 |
| エディタ 削除（`WorkspaceEdit.deleteFile`） | – | – | 1 | – | 1 |

**結論：**
- **外部操作（fs / fs-extra）と VSCode API 操作は完全に同一。**
「操作方法でイベントが違う」という疑いは、この範囲では**否定された**
- **違うのはエディタ主導の変名だけ。** `rename` が余分に出て二重になる（上記 (D)）。
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
| (VE)→(VE) | ✅ **実装済み・2026-09-13** | `explorer.confirmDragAndDrop: false` が必須。[test/ui/runUI.ts](../../test/ui/runUI.ts) |
| Explorer→(VE) | ✅ **実装済み・Windows限定・2026-09-13** | `SendInput`ベース。Explorer側はPython([test/ui/win_explorer_drag.py](../../test/ui/win_explorer_drag.py))、VSCode側は[test/ui/runUI.ts](../../test/ui/runUI.ts)の`dragFromExplorer()`。**macは対象外**（Finder版は別途手動、Pythonスクリプトも実行しない） |
| Finder→(VE) | ❌ | mac は対象外（手動のまま） |
| (VE)→ Explorer/Finder | ❌ | ドロップ先が Explorer/Finder |

##### 実装済み手順【2026-09-13・Windows で実装・検証】

```ts
// user-data-dir に settings.json を置いてから起動する
{'explorer.confirmDragAndDrop': false}
// あとは素直に
await src.dragTo(dst);
// コピーは Ctrl（Windows/Linux。mac は Option）を押したまま手動でドラッグ
// （dragTo() に modifier 指定が無いため mouse.down/move/up を自前で組む）
```

エクスプローラーの行セレクタが安定しない問題（VSCode は単一の子しか持たない
フォルダを**1行に圧縮**する。例：`doc/prj` が1行になり `/^doc$/` では一致しない）
は、**厳密一致をやめ部分一致（`hasText`）で探す**ことで解消した
（`test/ui/runUI.ts` の `expandRow()`）。

また **アクティビティバーのアイコンクリックはトグル**で、既にエクスプローラーが
開いていると逆に閉じてしまう罠があった。コマンドパレットから
「View: Show Explorer」を実行する形（`openExplorer()`）にして回避。

これで (VE)→(VE) の移動・コピー2ケース（mac/win 共通で残り2ケースは
`explorer.compactFolders` 由来の見た目の違いのみで挙動は変わらない見込み）が
`bun run test:ui` に組み込まれ、Windows で以下を確認：

| ケース | `watch.cre` | `watch.del` |
|---|---|---|
| (VE)→(VE) 移動（無修飾ドラッグ） | +1 | +1 |
| (VE)→(VE) コピー（Ctrl+ドラッグ） | +1 | +0 |

移動は cre+del が対（＝内部的に del→cre）、コピーは cre のみで del が
起きないことを確認。**mac 側は未計測**（Windows 専用セッションで実施したため）。

**Explorer/Finder が絡む8ケースは手動。** 手順を確実にするため
コマンド **「SKYNovel: トレースの区切りを入れる」**（`skynovel.trace` が true の時だけ
コマンドパレットに出る）を用意した。

##### 💡 Explorer↔VSCode 自動化の可能性【Windows実機PoCで一部検証・2026-09-13】

Playwright は自分が起動した Electron しか操作できないため 8 ケースは自動化不可、
という結論は変わらない。ただし **OS 層の入力シミュレーション**（`pywinauto` の
`drag_mouse_input` 等・`SendInput` ベース）を使えば、理論上は届く：

- Explorer 側は `Desktop(backend="uia")` で要素・座標を取得（Explorer の
  UI Automation ツリーは充実しており掴みやすい）
- VSCode 側は pywinauto を使わず、既存の Playwright が掴んでいる要素の
  `bounding_box()` ＋ `page.evaluate(() => [window.screenX, window.screenY])`
  を足して画面絶対座標に変換すれば済む（Electron 側の対応は不要）
- ドラッグは特定ウィンドウの API ではなく **OS 層のマウス入力**なので、
  マウスダウンした瞬間に Explorer 自身が本物の OLE ドラッグ
  （`IDataObject`/`DoDragDrop`）を開始し、以降の移動・ドロップは
  Windows のメッセージングが相手ウィンドウへ届ける（VSCode 側の特別対応は不要、
  標準でドロップターゲット登録済みのため）

**Windows実機PoCの結果（2026-09-13・最小PoC＝Explorer→別Explorerウィンドウ）：**

pywinauto は `mouse.py` に `drag_mouse_input` があるものの、マウスの絶対座標正規化が
`GetSystemMetrics(SM_CXSCREEN)`（プライマリモニタのみ）基準で、マルチモニタ環境では
ズレる作りだったため採用せず、`ctypes.SendInput` を直接叩く自前実装
（`SM_CXVIRTUALSCREEN` 等・仮想デスクトップ全体基準で正規化）で検証した。
`Desktop(backend="uia")` によるExplorer側の要素取得はpywinautoのまま利用。

手順：一時フォルダに src/dst の2フォルダを作り、src にテストファイルを1個置いて
`explorer.exe <path>` を個別プロセスで2つ起動（`os.startfile` だと「同じウィンドウで
開く」設定の影響で1ウィンドウに寄せられる可能性があるため回避）。`Shell.Application`
COM (`win32com.client.Dispatch("Shell.Application")`) の `Windows()` から
`Document.Folder.Self.Path` でフォルダパスと HWND を突き合わせて2ウィンドウを判別。
送り元アイテムの座標は UIA の `ListItem`（フォルダ内はテストファイル1件のみなので
拡張子非表示設定に関係なく1件取得すれば済む）から取得し、送り先はウィンドウの
クライアント領域中央やや下（コマンドバー分を避ける）をヒューリスティックに使用。
マウスダウン→小刻み移動（しきい値超え用）→送り先まで連続移動→マウスアップ、を
`SendInput` で実施。

- ✅ **成立した。** Explorer は「マウスダウン→閾値超えの移動」を検知して本物の
  OLE ドラッグ（`DoDragDrop`）を開始し、送り先ウィンドウへのドロップでファイルが
  実際に移動した（1回目の試行で成功、リトライ不要）
- 検証環境はシングルモニタ・4K（仮想デスクトップ `3840x2160`）・DPIスケーリングあり。
  **プロセス起動時に `SetProcessDpiAwareness(PROCESS_PER_MONITOR_DPI_AWARE)` を
  明示しないと、スケーリング環境では `GetWindowRect` 等の座標が物理ピクセルと
  ズレる**（既定は DPI Unaware 相当）。これを呼んでおけば単一モニタでは座標のズレは
  発生しなかった
- pywinauto の `mouse` モジュールは前述のとおりマルチモニタで座標がズレる実装なので、
  自前 SendInput 側で `SM_XVIRTUALSCREEN`/`SM_CXVIRTUALSCREEN` 系を使って正規化した。
  **マルチモニタ環境（セカンダリモニタにウィンドウがある場合）は今回未検証**（PoC機が
  シングルモニタのため）で、要追加確認
- ウィンドウ位置の取得・配置は `Shell.Application` COM + `win32gui.MoveWindow` で安定して
  行えた（今回は2ウィンドウをプライマリモニタ内で左右に並べて重なりを回避）

**Windows実機PoCの結果（2026-09-13・続編＝Explorer→VSCode(Electron)）：**

Explorer側は上記のSendInput自前実装＋UIAをそのまま流用。VSCode側はPlaywright
(`playwright-core`の`_electron`)で素の`Code.exe`を起動し（`--extensionDevelopmentPath`
なし・空フォルダをワークスペースに開くだけ）、`.monaco-workbench .part.editor`の
`boundingBox()` ＋ `window.screenX/screenY`で画面座標を求め、ドロップ後は
`.tab`にファイル名のタブが現れたかで成立を判定した。Explorer側の実プロセス起動と
VSCode側のPlaywright制御は別プロセス（Node側がPythonをchild_processで起動）に分けた。

- ❌→✅ **1回目は失敗、原因を修正して2回目で成立。** 失敗の原因は
  **座標系の単位の違い**：`window.screenX/screenY`・`boundingBox()`は
  論理(DIP/CSS)ピクセルを返すのに対し、`SendInput`は物理ピクセル基準。
  今回の検証環境（DPIスケーリング150%）では未変換のままだと実際の
  ドロップ先から大きくズレ（論理値をそのまま使うと物理位置は約1.5倍ズレる）、
  ドロップが編集領域に届かず不成立だった
- **対策：`window.devicePixelRatio`を掛けて物理ピクセルに変換すれば解決する。**
  （`dropX = (winX + box.x + box.width/2) * dpr`）これを入れた2回目の試行で
  即成立（VSCodeにファイルタブが開き、本物のOS D&Dとして認識された）
- Electron側のウィンドウ配置は`Shell.Application`ではなく、Playwrightの
  `electronApp.browserWindow(page)`経由で`BrowserWindow#setBounds()`を呼ぶのが
  素直（こちらはDIP基準でよく、実測とも整合した）
- マルチモニタでの座標ズレ・DPI差（モニタごとにスケーリング率が異なるケース）は
  今回も未検証（PoC機がシングルモニタのため）

**まとめ：** Explorer↔VSCode間のOSレベルD&Dは、座標系の単位（DIP vs 物理ピクセル）
にさえ気をつければ、SendInput経由で成立することを実機で確認できた。
Explorer/Finderが絡む8ケースの自動化は、この方式なら理論上到達可能。ただし
マルチモニタ・複数DPI混在環境は未検証のままで、本格導入前には要確認。

##### 実装・組み込み【2026-09-13・Windowsで実装・`bun run test:ui`に組み込み済み】

PoCの実装をそのまま`bun run test:ui`の正式なテストケースとして組み込んだ
（20/20件成功）。構成：

- **Explorer側**：[test/ui/win_explorer_drag.py](../../test/ui/win_explorer_drag.py)
  （`ctypes.SendInput`自前実装 + `Desktop(backend="uia")`）。依存パッケージは
  [test/ui/win_explorer_drag.txt](../../test/ui/win_explorer_drag.txt)
  （`pip install -r test/ui/win_explorer_drag.txt`）
- **VSCode側**：[test/ui/runUI.ts](../../test/ui/runUI.ts)の`dragFromExplorer()`が
  ドロップ先座標を計算（`BrowserWindow#setBounds()`でウィンドウ位置を固定→
  `boundingBox()` + `window.screenX/screenY` + `devicePixelRatio`変換）した上で、
  `execFileSync`でPythonスクリプトを呼ぶ（Node→Python呼び出し）
- **Windows限定**：`process.platform === 'win32'`でない場合はケース自体を
  スキップする（mac側はFinderの仕組みが異なり別途手動のまま。Pythonは
  windows以外では起動されない）
- ソースファイルはプロジェクト外（`%TEMP%`配下）に用意し、「実際に外部由来
  である」ことを担保。ドロップ先は既存の`(VE)→(VE)`ケースと同じ`sound`フォルダ行

**ハマった点：**

- `explorer.exe`はパス中に`/`が混ざっていると解釈に失敗し、既定のフォルダー
  （検証機では「ドキュメント」）を開いてしまう（実測済み・原因調査に時間を要した）。
  Node側で組み立てたパスに`/`が混入していたため、Python側で`os.path.normpath()`を
  通して`\`区切りに揃えてから渡すよう修正して解決した
- 上記の不具合により、失敗した試行のたびに「ドキュメント」フォルダのExplorer
  ウィンドウが1つ残る（閉じる対象を見つけられないまま終了するため）。
  実装確認中に13個溜まったので後片付けが必要だった（今回は解消済み）

**実行結果：**

| ケース | `watch.cre` | `watch.del` | 送り元ファイル |
|---|---|---|---|
| Explorer→(VE) 移動（無修飾ドラッグ） | +1 | +0 | **残存**（削除されない） |
| Explorer→(VE) コピー（Ctrl+ドラッグ） | +1 | +0 | 残存（削除されない） |

**発見：move/copyの区別が実質ない。** 無修飾でもCtrl+ドラッグでも、外部の
送り元ファイルは**どちらも削除されず残存**し、`watch.cre`も同じく+1だった。
これはVSCode（Electron）が外部ファイルのドロップを「パスを受け取ってコピーする」
という自前実装で処理しており、OSの`DoDragDrop`が返す move/copy エフェクトを
見ていない（＝常にコピー相当の挙動になる）ためと考えられる。Explorer→Explorer
のケース（本節前半のPoC）では実際に move が成立していたので、**この非対称性は
VSCode側のドロップハンドラの実装に起因**するとみられる。

##### 手順

1. 設定 `skynovel.trace` を true に
2. 【出力】→【ログ（ウインドウ）】を開く
3. 1ケースごとに：**コマンドで区切りを入れる**（ケース名を入力）→ 操作する → ログを見る
4. 下表に `watch.*` の値を書く

##### 記録表（mac / win で各6行。⚠️ 経路名は Finder（mac）/ Explorer（win）と読み替え）

**win の4行（#7・#8・#9・#10）は `bun run test:ui` が自動計測**（上記参照）。
残り8行（mac 全部 + (VE)→Explorer の win 分）は未計測・手動が必要

| # | 経路 | 種別 | OS | cre | chg | del | rename | 全走査 |
|---|---|---|---|---|---|---|---|---|
| 1 | Finder→(VE) | 移動 | mac | | | | | |
| 2 | Finder→(VE) | コピー | mac | | | | | |
| 3 | (VE)→(VE) | 移動 | mac | | | | | |
| 4 | (VE)→(VE) | コピー | mac | | | | | |
| 5 | (VE)→Finder | 移動 | mac | | | | | |
| 6 | (VE)→Finder | コピー | mac | | | | | |
| 7 | Explorer→(VE) | 移動 | win | **1** | – | **0** | – | (未確認) |
| 8 | Explorer→(VE) | コピー | win | **1** | – | **0** | – | (未確認) |
| 9 | (VE)→(VE) | 移動 | win | **1** | – | **1** | – | (未確認) |
| 10 | (VE)→(VE) | コピー | win | **1** | – | **0** | – | (未確認) |
| 11 | (VE)→Explorer | 移動 | win | | | | | |
| 12 | (VE)→Explorer | コピー | win | | | | | |

**値が揃ってから設計の議論に入る**（この節の (A)〜(D) の優先順位が変わりうる）。

（need_go の短絡は [Project.ts](../Project.ts) の `readPathJson()` 付近、
`doc/prj/*/` が1階層な理由は [WatchFile.ts](../batch/WatchFile.ts)、
WfbOptFont の glob が広い理由は [WfbOptFont.ts](../batch/WfbOptFont.ts) にコメント済み）

