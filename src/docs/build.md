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

## 3.10. パス表現の整理【方針決定・2026-07-30。構造の作り直しの2番目】

✅ **`URI` オブジェクト化で合意済み（作者確認・2026-07-30）。**
**§3.6 より先にやる**（あちらの一部はここで消えるため）。順序は残件一覧を参照。

### いま何が起きているか

[src/CmnShare.ts:41](../CmnShare.ts:41) に**パスの型が4つ**ある。
分けた動機は正しい（下記）。**問題は分けたことではなく、分けたつもりになっていること。**

```ts
export type WORKSPACE_PATH	= string;	// doc/prj/script/main.sn
export type PROJECT_PATH	= string;	// script/main.sn
export type FULL_PATH		= string;	// /[user]/.../[prj]/doc/prj/script/main.sn
export type FULL_SCH_PATH	= string;	// file://c:\[user]\.../[prj]/doc/prj/
```

**4つとも `string` の別名なので、型検査は何も守ってくれない。** TypeScript の
`type X = string` は string そのものなので、**どれをどこへ渡しても通る**。
⇒ **§3.6 の不具合2（LSP が解放されない）はこの直接の帰結**：

```ts
mLspWs.set(fullSchPath2fp(wf.uri), …)   // 鍵は FULL_PATH
mLspWs.delete(uri)                       // 渡しているのは FULL_SCH_PATH
```

**書いた本人の意図としては明白な間違いなのに、コンパイラは一言も言わない。**

### 変換が手書きで、互いに食い違っている【実測・2026-07-30】

変換は5本ある（`fullSchPath2fp` / `fp2fullSchPath` / `uri2path` / `vsc2fp` / `fp2osp`）。
同じ入力を通して確かめた：

| 入力（VSCode の `uri.toString()`） | `fullSchPath2fp` | `uri2path` |
|---|---|---|
| `file:///d%3A/work/novel/a.sn` | `/work/novel/a.sn` | `/d%3A/work/novel/a.sn` |
| `file:///Users/ugai/my%20novel/a.sn` | `/Users/ugai/my novel/a.sn` | `/Users/ugai/my%20novel/a.sn` |

- 🐛 **`uri2path` は `%20` を戻さない。** `slice(7)` で先頭7文字を落とすだけ。
唯一の呼び出し元は [Project.ts:646](../Project.ts:646) の
`imageSizeFromFile(uri2path(vfpImg))` ⇒ **フォルダ名に空白があるとサムネイルが作れない**
- 🐛 **Windows のドライブ文字が消える。** `fullSchPath2fp` は `d:` ごと落とす。
戻す `fp2fullSchPath` は **`'file://c:'` を決め打ち**なので、**D ドライブが C になる**
- 🐛 **`file://` のスラッシュ数も食い違う。** `fp2fullSchPath` は `file://c:`、
[LspWs.ts:849](../../server/src/LspWs.ts:849) は `file:///c:`
- 🐛 **C ドライブ決め打ちが3箇所**（上記2つ＋[WorkSpaces.ts:491](../WorkSpaces.ts:491)）
- ⚠️ `fp2osp` は `resolve()` ＝**カレントドライブ**で補う。CmnLib.ts にその旨コメントがある。
⇒ **Windows では「プロジェクトが VSCode と同じドライブにある」前提**で動いている

### 他はどうしているか【調査済み】

**VS Code 本体・拡張機能の答えは `Uri` オブジェクト。** 文字列を切り貼りしない。
`uri.fsPath` で OS のパスを、`uri.toString()` で URI を得る。
ドライブ文字・パーセントエンコード・区切りの差は**全部その中に閉じている**。

**LSP サーバ側の答えは [`vscode-uri`](https://github.com/microsoft/vscode-uri)。**
Microsoft 製で「VS Code とその拡張機能が使っている URI 実装」そのもの。
`vscode` モジュールに依存できないサーバのために独立配布されている
（`URI.parse` / `URI.file` / `URI.toString` と、`Utils.joinPath` などのパス演算）。
**まさに本プロジェクトの状況のために存在するパッケージ。**

**相対パスの扱いの定石**：**保存せず、必要なときに基準から導出する。**
相対パスが基準から離れて単独で持ち回られると、どの基準のものか分からなくなる。

### 提案（私見。判断待ち）

**「4つを減らす」のではなく、「URI だけをオブジェクトにする」。** これが一番効く。

| | いま | 提案 |
|---|---|---|
| URI 形式 | `FULL_SCH_PATH`（string） | **`URI` オブジェクト** |
| OS のパス | `FULL_PATH`（string） | そのまま string |
| ワークスペース相対 | `WORKSPACE_PATH`（string） | そのまま string |
| プロジェクト相対 | `PROJECT_PATH`（string） | そのまま string |

**利点：ブランド型のような大掛かりな仕掛けが要らない。**
オブジェクトは string に代入できないので、**上の `mLspWs.delete(uri)` は
その場でコンパイルエラーになる。** 型の付け替えではなく、
**表現そのものを変える**ので、うっかりが構造的に起きなくなる。

同時に**手書き変換5本を捨てられる**（ドライブ決め打ちも `%20` 事故も消える）。
LSP のプロトコル上は文字列（`DocumentUri`）なので、
**入口で `URI.parse()`、出口で `.toString()`** ＝ 境界だけで変換する。

**相対2種は残してよい。** 動機（プロジェクト素材は prj をルートに見たい）は正当で、
[LspWs.ts](../../server/src/LspWs.ts) の `#fp2pp` / `#pp2fp` は
**基準（`#PATH_PRJ`）を持つ側が変換する**という正しい形になっている。
決めるべきは1つだけ：**相対パスは、基準を知っている入れ物の外へ裸で出さない。**
出すときは URI にするか、基準と対で渡す。

**残る string 同士（`FULL_PATH` / `WORKSPACE_PATH` / `PROJECT_PATH`）の取り違えは
まだ検出できない。** 必要ならブランド型（`string & {readonly [B]: 'FULL_PATH'}`）で
名前的に区別できる。ランタイム費用は0だが、**境界すべてにキャストが要る**ので
別段階にする。上の変更で危険度の高い組み合わせは消えるため、**急がない。**

### この整理で消えるもの／消えないもの

**混同しないこと。** 「根を直せば全部消える」ではない。

| §3.6 の項目 | この整理をすると |
|---|---|
| **不具合2**（鍵の型違いで LSP が解放されない） | ✅ **消える。** 鍵が `URI` オブジェクトになれば、生の文字列を `delete()` に渡した時点でコンパイルエラー |
| **不具合6**（区切りを見ない前方一致） | ⚠️ **自動では消えない。** ただし**直す場所がここに定まる**。「この URI はこの URI の配下か」を判定する関数を1つ置き、[LangSrv.ts:29](../../server/src/LangSrv.ts:29) と [WorkSpaces.ts:381](../WorkSpaces.ts:381) の**両方をそれに寄せる**（いまは同じ間違いが2箇所に複製されている） |
| **不具合3・4・5**（delete 漏れ／ツリー行／まとめて追加） | ❌ **無関係。** パスの話ではないので、そのまま残る |
| **リソース解放5件** | ❌ **無関係** |

⇒ **この整理の直接の成果は「不具合2が構造的に起きなくなる」ことと、
下の3つの実害が消えること。** 残りは §3.6 でそのまま直す。

### この整理で直る実害（利用者に見える分）

1. **Windows で D ドライブのプロジェクトが扱えない**（ドライブ文字が落ち、C 決め打ちで戻る）
2. **フォルダ名に空白があるとサムネイルが作れない**（`%20` が戻らない）
3. **`file://` のスラッシュ数・C 決め打ちの食い違い**（3箇所）

⚠️ **1 と 2 は「直った」と言う前に実機確認が要る。**
1 は Windows で D ドライブに置く（[testing.md](testing.md) の Windows テスト）。
2 は mac でもフォルダ名に空白を入れれば再現するので、**先に確認できる**。

### 段取り

- **Stage 1**：`URI` オブジェクト化と手書き変換5本の削除。`vscode-uri` を server の
dependencies へ（Microsoft 製・`vscode` 非依存）
- **Stage 2**：必要ならブランド型。**急がない**（危険度の高い組み合わせは Stage 1 で消える）

⚠️ **規模は小さくない。** `vsc2fp` 27箇所・`fullSchPath2fp` 22箇所を含め、
**LSP のプロトコル境界に触る**。**単独の版で。8/23 の再申請をまたがないこと**（残件一覧）。

⚠️ **`vscode-uri` を足すと同梱物が増える。** §3.5 で 4割減らしたばかりなので、
**`bun run release` の前後で vsix サイズを見ておく**（手書き変換5本が消える分は減る）。


---

## 5. やってはいけないこと

**拡張機能内に VSIX の自動ダウンロード＆インストール機能を作らない。** これは「リモートコードのダウンロードと実行」そのもので、MS のブログで名指しされている監視対象。自動更新が失われるのは痛いが、これを作ると再申請を自分で潰す。

更新チェックは**通知だけ**に留め、ダウンロードはユーザーの手でブラウザ経由にする。既に [src/ActivityBar.ts:276](../ActivityBar.ts:276) 付近で GitHub の CHANGELOG を fetch してバージョン比較しているので、その延長で通知は作れる。

