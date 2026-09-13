# ビルド・パッケージング設計

拡張機能自身のビルド方式・配布経路・パス表現に関する設計判断と経緯。TODO.md から分離（2026-08-26）。

⚠️ **決着・凍結した判断は対応コードのコメントへ移す**（重複を避けるため）。
ここに残すのは①対応コードが無い判断、②未着手・低優先度の宿題、③今後の
再検討を避けるための実測値・調査記録。数字を書く基準は
[TODO.md](TODO.md) 冒頭を参照。

---

## 2. 残りのリスク箇所

- **ファイル暗号化** — [src/Encryptor.ts](../Encryptor.ts) / [src/EncryptorTransform.ts](../EncryptorTransform.ts)。単体では無害だが、リモート取得やシェル実行と合わせるとランサム系ヒューリスティクスに触れうる。README で用途（作品データの保護）は明示済み（v4.31.1）。これ以上の対処は不要と判断
- C（テンプレート取得元 URL の明示）と D（PowerShell のシェル経由実行）は v4.31.1 で対処済み


---

## 3. ビルド周りの宿題

- **`dist/extension.js` が単一バンドル（約1.39MB）になった** — webpack を外した代償でコード分割が無くなった（従来 82KB ＋ 遅延チャンク）。Node での require 実測は約63ms。動的 import 先の「実行」は esbuild でも遅延されるので、増えているのはパース時間だけ

- **ESM ＋ `splitting: true` は「できる」が、今は見送り**（2026/07 調査・実測済み）
	- VSCode は **1.100（2025/04）から ESM 拡張機能を読める**。リリースノートに
	「The NodeJS extension host now supports extensions that use JavaScript-modules
	(ESM). All it needs is the `"type": "module"` entry in your extension's
	`package.json` file.」とある。本拡張の `engines.vscode` はこれより十分新しいので
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

## 3.9. Open VSX 公開【見送り決定・2026/07】

**結論：出さない。GitHub Releases のみ。使いたい人は自己責任で DL。**

見送りの決め手は2つ。

1. **`package.json` の `engines`（vscode / node）を満たすフォークがほぼ無い。**
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
	- Microsoft の Publisher Agreement 13(d) が他レジストリへの公開を許容（[TODO.md](TODO.md) §1 参照）
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

## 3.10. パス表現の整理【Stage 1 決着・実装済み・2026-09-13】

✅ **`FULL_PATH` をブランド型化し、`URI`/`vscode-uri` を境界で使う形に統一した。**
旧4型のうち `FULL_SCH_PATH`（URI文字列）は**拡張機能側では全廃**、
`FULL_PATH` は `string & {readonly __brand: 'FULL_PATH'}` に変更。
手書き変換5本（`fullSchPath2fp` / `fp2fullSchPath` / `uri2path` / `vsc2fp` / `fp2osp`）は
`uri2path` / `vsc2fp` / `fp2osp` を完全削除、`fullSchPath2fp` / `fp2fullSchPath` も
LSP側の書き換え完了に伴い実質不要になった（`CmnShare.ts` に定義だけ残存）。

**核となる設計**（[src/CmnShare.ts](../CmnShare.ts)）：
```ts
export type FULL_PATH = string & {readonly __brand: 'FULL_PATH'};

export const normFp = is_win
	? (fsPath: string): FULL_PATH=> fsPath.replaceAll('\\', '/') as FULL_PATH
	: (fsPath: string): FULL_PATH=> fsPath as FULL_PATH;

export function isUnderPath(fp: FULL_PATH, dir: FULL_PATH): boolean { … }
```
`FULL_PATH` の代表表現は**ドライブ付き・`/` 区切り**（win: `c:/Users/x/ws`）。
入口は必ず `.fsPath`（`.path` ではない。`fsPath` はドライブ文字を小文字に統一するため
大小比較の揺れが出ない）。LSP側は `vscode-uri` の `URI.parse(uri).fsPath` を
同じ `normFp()` に通すことで、拡張機能側と完全に同じ表現になる
（[server/src/LspWs.ts](../../server/src/LspWs.ts) の `uri2fp()`）。

**解消した実害・不具合**：
- ✅ **Windows で D ドライブのプロジェクトが扱えない** → 代表表現がドライブ付きになり解消
- ✅ **フォルダ名に空白があるとサムネイルが作れない**（`%20` 未復元） →
  `uri2path` 廃止・`Uri.fsPath` 直用で解消
- ✅ **§3.6 不具合2（`mLspWs` の delete 漏れでLSPが解放されない）** →
  set/delete 双方を `uri2fp()` に統一し、`destroy()` 呼び出しも追加
- ✅ **新規発見・Windowsで `mLspWs.get()` が常に外れるバグ**
  （`fullSchPath2fp(uriWs.path)` が `uriWs.path` に `file://` が付かないため
  正規表現が一致せずドライブが残る一方、サーバー側キーはドライブなしで生成される
  不一致）→ 拡張・LSP双方を `normFp` ベースに統一して解消
- ✅ **Windowsでホバーが外れるバグ**（`docs.get()` のキーが `fp2fullSchPath` 手書き生成で
  実際のクライアントURI文字列と不一致）→ `vscode-uri` の `URI.file().toString()` に統一
- ✅ **`#sendDiag` がmacではスキームなしでURIを送っていた** → 同上で解消
- ✅ **§3.6 不具合6（区切りを見ない前方一致）** → `longestUnderPath()`
  導入で最長一致化まで込みで決着（2026-09-13。詳細は multiroot.md）

**ブランド型は前倒しで採用**（作者判断・2026-09-13）。当初 Stage 2 として
「急がない」としていたが、生 string が紛れ込んでも型検査に掛からないという
最大リスクをコンパイラに肩代わりさせるため、`FULL_PATH` のみ先に導入した。
`WORKSPACE_PATH` / `PROJECT_PATH` は string のまま（Stage 2 のまま据え置き）。

### 未着手・今後の宿題

- **`ws-file://` 独自スキームの完全廃止**。LSP側は通常の `file:` URI を返すよう
  変更済みだが、拡張側 `WorkSpaces.ts` の `openURL()` の `case 'ws-file'` は
  死コードとして残っている
- **`Debugger.ts` の `#hcurPrj2Dbg` 鍵生成統一**（set/get/deleteで3種の鍵形式が
  混在。パス表現の整理とは独立した話だが、同種のバグ）

### Windows実機確認が必要な項目（mac側テストでは検証できない）

D ドライブでの起動・空白入りフォルダ名でのサムネイル・ホバーの `%3A` 一致・
診断表示位置・`revealFileInOS`／`env.openExternal`・pyftsubsetへの `c:/` パス・
タスク実行のシェル連結・マルチルートでのLspWs解放。次のWindows機会に
[testing.md](testing.md) の手順で確認すること。


---

## 5. やってはいけないこと

**拡張機能内に VSIX の自動ダウンロード＆インストール機能を作らない。** これは「リモートコードのダウンロードと実行」そのもので、MS のブログで名指しされている監視対象。自動更新が失われるのは痛いが、これを作ると再申請を自分で潰す。

更新チェックは**通知だけ**に留め、ダウンロードはユーザーの手でブラウザ経由にする。既に [src/ActivityBar.ts:276](../ActivityBar.ts:276) 付近で GitHub の CHANGELOG を fetch してバージョン比較しているので、その延長で通知は作れる。

