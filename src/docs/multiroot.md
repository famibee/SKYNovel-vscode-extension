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

✅ **不具合6件は 2026-09-13 に全件決着済み。** 残るは**リソース解放5件**のみ。

⚠️ **keywords から `multi-root ready` を外した（2026-07-29）。**
**下の全件を直してから戻すこと。** 表示と実装の食い違いは、
再申請を控えた拡張機能では特に持ちたくない。
戻すのは `package.json` の `keywords` に1行足すだけ。

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

### リソースの解放【調査済み・2026-07-29】

上の 2・3 と**同じ根**（作る口はあるのに、捨てる口が無い／届いていない）。
**フォルダを閉じて開き直すたびに積み増える**ので、症状はマルチルートで出る。

| # | 何が残るか | どこ |
|---|---|---|
| 1 | **ファイル監視オブジェクトが1つも捨てられていない**（プロジェクトあたり9本） | [WatchFile.ts:199](../batch/WatchFile.ts:199) ほか |
| 2 | **プロジェクト単位の登録が「拡張機能の寿命」の側に積まれている** | `ctx.subscriptions` を使う7箇所 |
| 3 | **`PrjSetting.dispose()` が空回り**。設定画面とフォルダ画面が閉じない | [PrjSetting.ts:150](../PrjSetting.ts:150) |
| 4 | **`initOnce()` が登録の戻り値を捨てている** | [WatchFile.ts:47](../batch/WatchFile.ts:47) |
| 5 | **破棄時にタイマーを止めていない** | 下記5箇所 |

#### 1. 監視オブジェクトが捨てられていない

```ts
const fw = workspace.createFileSystemWatcher(…);
if (crechg) this.pc.ctx.subscriptions.push(fw.onDidCreate(…), fw.onDidChange(…));
if (del)    this.pc.ctx.subscriptions.push(fw.onDidDelete(…));
```

**片付けているのは「イベントの購読」だけで、`fw` 自身はどこにも渡していない。**
`FileSystemWatcher` は OS のファイル監視を握っているので、購読を外しても
**監視そのものは動き続ける**。数はプロジェクトあたり **9本**
（`watchFld()` の7回＋フォルダ監視＋`prj.json` 監視）。

#### 2. 片付けリストの取り違え

`ctx.subscriptions` は **VSCode が拡張機能を止めるときに一括で片付ける**ための箱。
**プロジェクト単位のものをここへ入れると、フォルダを閉じても外れない。**
入れてはいけないものが入っているのは7箇所
（[WatchFile.ts:205](../batch/WatchFile.ts:205)・[:231](../batch/WatchFile.ts:231)、
[WfbSettingSn.ts:54](../batch/WfbSettingSn.ts:54)、
[PrjSetting.ts:227](../PrjSetting.ts:227)・[:232](../PrjSetting.ts:232)、
[WPFolder.ts:59](../WPFolder.ts:59)・[:60](../WPFolder.ts:60)）。

⇒ **開き直すと購読が二重になり、古い方も発火する。**
`WatchFile` の受け口は static（上の 1）なので、
**古いプロジェクトの監視が発火して、いまのプロジェクトの設定で暗号化・最適化が走る。**
単なるメモリの話ではなく**処理が余分に走る**。

行き先は `Project.#ds`（プロジェクトの寿命）が正しい。**箱は既にある。**

#### 3. `PrjSetting.dispose()` が空回り

```ts
readonly #ds: Disposable[] = [];
dispose() {for (const d of this.#ds) d.dispose()}
```

**`#ds` に push している箇所が1つも無い。** 宣言と破棄だけがあって中身が空。
`Project` は `#ds.push(this.#ps = new PrjSetting(…))` で確かに呼ぶが、
**呼んだ先が何もしない**ので、**設定画面（webview）とフォルダ画面が
プロジェクトを閉じても開いたまま残る**。

💡 **「dispose を呼んでいる」だけでは確認にならない**、の実例。
呼ばれた側が空でも、呼び出し側のコードは正しく見える。

#### 4. `initOnce()` が戻り値を捨てている

```ts
fwFld.onDidCreate(newUri=> …);   // 戻り値 Disposable を捨てている
fwFld.onDidDelete(oldUri=> …);
```

（旧 `workspace.onDidRenameFiles(...)` の購読はこの節に含まれていたが、
[file-watch.md](file-watch.md)(D) の対応で購読自体を削除したため、
いまはここに残る2箇所が対象）

VSCode のイベント登録は **Disposable を返す**。受け取っていないので
**拡張機能を止めるときでさえ外れない。**

#### 5. 破棄時にタイマーが止まらない

| 場所 | 待ち |
|---|---|
| [Project.ts:454](../Project.ts:454) `#tmNeedGo` | 300ms（LSP への再走査要求のまとめ） |
| [PrjCmn.ts:138](../PrjCmn.ts:138) `#tiLasyPathJson` | 500ms（path.json 更新のまとめ。2026-09-13、[file-watch.md](file-watch.md)(B) で `WatchFile` から `PrjCmn` へ移設） |
| [WfbSettingSn.ts:125](../batch/WfbSettingSn.ts:125) `#tiDelay` | — |
| [WPFolder.ts:143](../WPFolder.ts:143) `#tiDelay` | 500ms |
| [PrjCmn.ts:188](../PrjCmn.ts:188) `#tiLasyQ` | 100ms |

いずれも**張り直すときには `clearTimeout` している**ので、まとめ処理としては正しい。
**足りないのは破棄時だけ。** ⇒ 閉じる直前にファイルを触ると、
**破棄済みのプロジェクトに対してコールバックが動く。**

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
4. **解放 1〜5** … 残作業。**全部「捨てる口」の話**なので一度に。
`Project.#ds` へ寄せ、破棄時の `clearTimeout` も含めてまとめて直す
5. **全部済んだら `keywords` に `multi-root ready` を戻す**

⚠️ **キーワードを戻すのを忘れないこと。** 外した理由が「直すまで」なので、
直したのに戻さないと**今度は実装が表示より良い**という別の食い違いになる。

⚠️ **テストは既にある。** `test/int/multi.ts`（`.code-workspace` で2プロジェクトを開く）
が土台になる。**いまは (A) の再現しか見ていない**ので、不具合 2〜6 の自動テストは
未着手のまま（コード側の修正は済み）。**4 と 6 は自動テストで判定しやすい**
（行数と、どのプロジェクトが返るか）。

