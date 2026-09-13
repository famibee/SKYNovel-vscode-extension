# マルチルート対応の調査

複数フォルダを開いた状態での不具合調査とリソース解放の棚卸し。TODO.md から分離（2026-08-26）。

⚠️ **決着・凍結した判断は対応コードのコメントへ移す**（重複を避けるため）。
ここに残すのは①対応コードが無い判断、②未着手・低優先度の宿題、③今後の
再検討を避けるための実測値・調査記録。数字を書く基準は
[TODO.md](TODO.md) 冒頭を参照。

---

## 3.6. マルチルート対応の棚卸し【調査済み・2026-07-29／着手は再申請後】

`package.json` の keywords に **`multi-root ready`** と書いてあったので、
**フォルダを複数開いた状態**を通しで読んだ。ソースを読んだだけで、実行はしていない。

**結論：名乗るには足りない。** 確認できた不具合が **6件**、
加えて**リソースが解放されない箇所が5件**（下記）。

✅ **不具合6件・リソース解放5件、全11件が 2026-09-13 に決着済み。**
コード側の修正は完了。**不具合4・6の自動テストも追加済み**（下記「直すときの
順序」参照）。**Windows実機での多重フォルダ動作確認も完了**（2026-09-14・
Win側セッションで `test:int`・`test:ui`・`chk:types` 全通過を確認）。

✅ **`keywords` に `multi-root ready` を復帰済み（2026-09-14）。**
2026-07-29 に外してから、全件の修正・自動テスト・Windows実機確認が
揃うまで戻さずにいたが、今回で条件が全て満たされたため復帰した。

### 見つかったもの

| # | 何が起きるか | どこ | 重さ |
|---|---|---|---|
| 1 | ✅ **決着済み・2026-09-13**（別プロジェクトの設定でファイルが暗号化される） | [WatchFile.ts:31](../batch/WatchFile.ts:31) | **最重**（[file-watch.md](file-watch.md)(A) と同一。あちらに詳細） |
| 2 | ✅ **決着済み・2026-09-13**（フォルダを閉じても LSP が解放されない） | [LangSrv.ts](../../server/src/LangSrv.ts) | 大（[build.md](build.md) §3.10 と同一。あちらに詳細） |
| 3 | ✅ **決着済み・2026-09-13**（フォルダを閉じても Project が残り続ける） | [WorkSpaces.ts](../WorkSpaces.ts) `#refresh()` | 大 |
| 4 | ✅ **決着済み・2026-09-13**（フォルダを閉じると、閉じたのと別の行がツリーから消える） | [WorkSpaces.ts](../WorkSpaces.ts) `#refresh()` | 中・**必ず起きる** |
| 5 | ✅ **決着済み・2026-09-13**（フォルダを2つ以上まとめて追加すると1つしか認識しない） | [WorkSpaces.ts](../WorkSpaces.ts) `#refresh()` | 中 |
| 6 | ✅ **決着済み・2026-09-13**（名前が前方一致するプロジェクトへ誤配される） | [LangSrv.ts:27](../../server/src/LangSrv.ts:27) / [WorkSpaces.ts](../WorkSpaces.ts) | 中・条件付き |

### 個別

#### ✅ 2. フォルダを閉じても LSP が解放されない【決着・実装済み・2026-09-13】

旧実装は鍵の作り方が set と delete で違い（`fullSchPath2fp(wf.uri)` vs 生の
`uri`）、`delete` が永久に一致しなかった。`build.md` §3.10 の vscode-uri 移行で
両者を `uri2fp()` に統一し、`destroy()` 呼び出しも追加して解消（詳細は build.md）。

#### ✅ 3・4・5. `#refresh()` のフォルダ増減処理【決着・実装済み・2026-09-13】

3つとも同じ `#refresh()` 内の増減処理が原因で、直すときに触る場所が
完全に重なるため一括で直した。

- **不具合3**（Project が残り続ける）：`dispose()` は呼ぶが `#mPrj.delete()` が
無く、破棄済みの Project が Map に居座っていた。⇒ `dispose()` の直後に
`#mPrj.delete(pathWs)` を追加
- **不具合4**（別の行がツリーから消える）：`this.#aTiRoot.findIndex(v=> v.label === nm)`
は**ルート行の `label` が常に空文字**（フォルダ名は `description` 側）なので必ず
-1 を返し、`splice(-1, 1)` が**末尾の1件を消す**事故になっていた。⇒ 照合を
`label` ではなく `PrjTreeItem` 生成時に持たせた `pathWs`（`PrjTreeItem.ts` の
コンストラクタ引数を public 化）で行うよう変更
- **不具合5**（まとめて追加すると1つしか認識しない）：`e.added` は最後の1件、
`e.removed` も先頭の1件だけを見ており、`else` で追加と削除の同時発生（並べ替え）
だと削除が丸ごと無視されていた。⇒ `e.added` / `e.removed` を両方とも
`for...of` で全件回すよう変更

💡 **`findIndex` の -1 を `splice` にそのまま渡さない**、が一般則。
「見つからなかった」が「末尾を消す」に化ける。

#### ✅ 6. 名前が前方一致するプロジェクトへ誤配される【決着・実装済み・2026-09-13】

`CmnShare.ts` に `longestUnderPath()` を追加（fp が isUnderPath を満たす
候補のうち、key が最長のものを1つ返す）。以下の全箇所をこれに統一：

- `LangSrv.ts` の `getLspWs()`
- `WorkSpaces.ts` の `provideDocumentDropEdits()` / `provideHover()` /
`skynovel.opView` コマンド／`#prjOfActiveEditor()`（旧来の `startsWith()` を撤去）

`#prjOfActiveEditor()` は `isUnderPath` 未導入（生の `startsWith`）に加えて
最長一致も無かったが、両方まとめて解消。`opView` コマンドは元々「一致した
プロジェクト全部」に配っていた（入れ子だと親子両方に配ってしまう）ので、
最長一致1件だけに配るよう挙動も修正。

発生条件は「**片方の絶対パスがもう片方の先頭と一致する**」こと。
**入れ子**（`/work` と `/work/sub` の両方を開く）で特に踏みやすい。

### ✅ リソースの解放【決着・実装済み・2026-09-13】

上の 2・3 と**同じ根**（作る口はあるのに、捨てる口が無い／届いていない）。
**フォルダを閉じて開き直すたびに積み増える**ので、症状はマルチルートで出る。

`PrjCmn` に project-scoped の破棄口 `#ds`（`push()` / `dispose()`）を新設し、
`ctx.subscriptions`（拡張機能の寿命）へ誤って積んでいたものを全てここへ
寄せ替えた。`Project.dispose()` から `PrjCmn.dispose()` を呼ぶことで、
フォルダを閉じたときに一括で片付く。

| # | 何が残っていたか | 対応 |
|---|---|---|
| 1 | ファイル監視オブジェクトが1つも捨てられていない（プロジェクトあたり9本） | `WatchFile.initOnce()` / `watchFld()`、`Project.ts` の prj.json 監視で `fw` 自身も `pc.push()` |
| 2 | プロジェクト単位の登録が「拡張機能の寿命」の側に積まれていた | `ctx.subscriptions.push()` 7箇所を `pc.push()` または `PrjSetting.#ds` へ変更 |
| 3 | `PrjSetting.dispose()` が空回り | `p.onDidDispose()` / `wv.onDidReceiveMessage()` を `#ds` へ push、`#wp?.dispose()` も追加 |
| 4 | `initOnce()` が登録の戻り値を捨てていた | `fwFld.onDidCreate()` / `onDidDelete()` の戻り値を `pc.push()` へ |
| 5 | 破棄時にタイマーを止めていなかった | `PrjCmn.dispose()` で自身の2本を、`WfbSettingSn` / `WPFolder` は `pc.push({dispose: ...})` で登録して解消 |

`WPFolder` は `close()`（タイマー停止＋webview破棄）を `pc.push({dispose: ()=> this.close()})`
として登録し、プロジェクト破棄時にも同じ経路で片付くようにした
（`close()` は多重呼び出しでも安全）。

#### ⚠️ 影響の範囲を正しく見ておく

**フォルダを1つだけ開いて使う限り、実害はほぼ無い。**
拡張機能を止めるときに VSCode が `ctx.subscriptions` をまとめて片付けるので、
「捨て損ね」の寿命＝VSCode を閉じるまでで済む。

**効いてくるのは、フォルダを閉じる・開き直す・複数開くとき。**
つまり**マルチルートを名乗るなら必須**で、名乗らないなら急がない。
この判断で **keywords を外し、直してから戻す**ことにした。

### ✅ 問題なかったもの（再調査しないための記録）

**プロジェクトごとの持ち物**として正しく作られていたもの：

| 場所 | 形 |
|---|---|
| LSP 本体 | **ワークスペースフォルダごとに `LspWs` を1つ**（`mLspWs`）。設計は正しい |
| [Debugger.ts:46](../Debugger.ts:46) | `#hcurPrj2Dbg` … プロジェクトで引く |
| [CteScore.ts:156](../CteScore.ts:156) | `#hCur2Me` … パスで引く |
| [PrjTreeItem.ts:142](../PrjTreeItem.ts:142) | `#hPathWs2onBtn` … ワークスペースで引く |
| [PrjSetting.ts:173](../PrjSetting.ts:173) | `#hWsFld2token` … フォルダで引く |
| [Project.ts:693](../Project.ts:693) | `#aPickItems` … **インスタンスの持ち物**。エンジン別のリファレンスはこれで正しく分かれる |

**全体で1つでよい**もの（マシンや拡張機能に属し、プロジェクトに属さない）：

`ActivityBar.#hEnv`（node/npm/bun/pip の有無）、`#pathPyScripts`、
`statBreak`（シェルの区切り。OS で決まる）、`useBun`、
`aTagSum`（md.json の中身。エンジン差は `mkTagPickItems()` が引数で吸収）、
`Project.#doneBoot`（起動一度きりの印）。

**解放できているもの**：タスク実行（`hTaskExe` を `terminate()`）、
デバッグセッション（`stopDebugging`）、環境調査の `exec`（起動時に終わる短命なもの）。

### 直すときの順序

1. ✅ **[file-watch.md](file-watch.md)(A)** … 暗号化に触るので最初。単独の版で。**決着済み・2026-09-13**
2. ✅ **不具合 2・3・4・5** … **決着済み・2026-09-13**。2 は LSP 側（LangSrv.ts）、
3〜5 は拡張側 `WorkSpaces.ts` `#refresh()` の増減処理を一括修正
3. ✅ **不具合 6** … **決着済み・2026-09-13**（`longestUnderPath()` に統一）
4. ✅ **解放 1〜5** … **決着済み・2026-09-13**。`PrjCmn` に project-scoped の
破棄口を新設し `Project.dispose()` から一括で片付くよう統一
5. ✅ **不具合 4・6 の自動テスト追加** … **決着済み・2026-09-13**（下記参照）
6. ✅ **Windows実機での多重フォルダ動作確認 → `keywords` に `multi-root ready` を戻す**
… **決着済み・2026-09-14**（下記参照）

✅ **不具合 4・6 の自動テストを追加した（2026-09-13）。**
- **不具合6**：`isUnderPath()` / `longestUnderPath()` のユニットテストを追加
  （[test/CmnShare.test.ts](../../test/CmnShare.test.ts)）。入れ子ワークスペース・
  前方一致だけの別フォルダを区別できることを確認
- **不具合4**：`test/int/multi.ts` に、3フォルダ目を動的に追加してから先頭を
  閉じ、`getRootPathWs()`（`ActivityBar` 経由で `activate()` の戻り値から
  観測する新設の入口。統合テスト専用）でツリーの残り行を確認するケースを追加。
  実行して確認済み（`3 passing`）
- **副産物**：追加中に見つけた **`PrjTreeItem.create()` の `pathWs` が
  `normFp()` 未適用**（`wsFld.uri.fsPath` の生値）という不一致も修正。
  `WorkSpaces.ts` `#refresh()` 側の削除時比較は `normFp()` 済みだったため、
  Windows ではバックスラッシュ区切りと `/` 区切りで食い違い、不具合4が
  **Windowsでのみ再発しうる**状態だった（macでは `normFp` が恒等関数のため
  発覚しなかった）

**不具合 2・3・5・リソース解放1〜5 の自動テストは未着手のまま**
（コード側の修正は済み）。

✅ **Windows実機での多重フォルダ動作確認、完了（2026-09-14）。**
Win側セッションで origin/master を pull → `bun run build` →
`bun run test:int`（main + multi 全 passing）・`bun run test:ui`
（30/30件成功）・`bun run chk:types`（エラーなし）を実行し、全て通過を確認。
これを受けて `package.json` の `keywords` に `multi-root ready` を復帰した。

