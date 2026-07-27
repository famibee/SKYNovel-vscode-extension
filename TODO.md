# BlueSNovel / SKYNovel拡張機能 TODO

最終更新：2026-07-27（完了分は CHANGELOG.md へ移動。最終的にカラを目指す）

## 1. VS Marketplace 是正対応・期日とゴール

修正A（ncu をバンドルから外す）・修正B（pip install の同意化）はどちらも完了（CHANGELOG v4.30.5 / v4.31.0）。

動作確認（2026-07-27、macOS / Windows 両方で完了）：dmg・exe ビルドと起動、
フォント最適化の同意ダイアログ、出力フォルダを開くボタン、
**フォント変換（`&def_fonts` 全フォントのサブセット化）と OFF での復帰**。
この過程で見つかった不具合はすべて修正済み（CHANGELOG v4.31.1）。

→ **コード作業と動作確認は完了。残るは配布と再申請の手続きのみ。**

| 時期 | やること |
|---|---|
| 修正完了次第 | GitHub Releases で配布（SHA256 併記）＋ブログ告知 |
| その後 | Open VSX 登録を検討 |
| 8/23 以降 | Marketplace へ正式再申請（是正内容を条項付きで報告） |

手順は §7、Releases に貼るリリースノート原稿は §8 にある。

前提（規約を読んで確認済み）：

- `famibee2.skynovel2` の item ID・インストール数・レビューは復活しない。再公開は新しい extension name になる
- Publisher Agreement 13(d) No Exclusivity — 他マーケットプレイスへの公開は明文で許容。Open VSX 併用は問題なし
- ToU 4(x) — 過去にアクセスを剥奪された者はサイトを利用してはならない。**別アカウント作り直しは独立した規約違反**
- Publisher Agreement 3(g) / 12 は理由の有無を問わず削除可と規定。法的に争う線はない

MS へ検知理由の照会メールを 2026-07-26 に送信済み（担当者ID `655cd9f9`）。回答は期待値が低いので待たない。

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

- **リファレンス検索パレットのリンク先を、プロジェクト種別で切り替える**
	- 現状はタグ名も URL も `https://famibee.github.io/SKYNovel/tag.html#<タグ名>` 固定
	（[src/WorkSpaces.ts](src/WorkSpaces.ts) の `aPickItems` を組み立てている箇所）。
	BlueSNovel のプロジェクトを開いていても SKYNovel 側のドキュメントへ飛ぶ
	- **判断基準が未定**。何をもって BlueSNovel と判定するか（`doc/prj/prj.json` の
	フィールド？ `package.json` の依存？ テンプレの種別？）を決めるのが先
	- **LSP 側にも波及する**。ホバーや補完の説明文も同じ `md.json` を引いていて、
	`server/src/md.json` として別途同梱している。切り替えるならタグ辞書自体を
	プロジェクト単位で持つ設計になる。パレットだけ直しても中途半端になる

---

## 4. 公開前チェック【自動化済み】

`bun run release`（[release_chk.ts](release_chk.ts)）で、ビルドと以下のチェックまで自動。
**公開（vsce publish）は手動のまま**（PAT を CI に置かない方針）。

1. exec/spawn 系でパッケージマネージャを叩く箇所が許可リストに無ければ落とす
2. バンドルに混ぜてはいけない依存が dependencies に無いか
3. cold ビルド（webpack キャッシュを消してから）で型エラー0を確認
4. vsix 同梱物（秘密・設定・生成物が入っていないか、必要なものが揃っているか）
5. dist の巨大チャンク・`.npmrc` 読み取りコードの混入
6. vsix の SHA256 を出力

チェックを増やすときは release_chk.ts に足す。許可リストを緩めるときは
**理由をコメントに残すこと**（それが再申請時の説明材料になる）。

残っている案：

- GitHub Actions 化。ただし公開まで自動化すると PAT を secrets に置くことになるので、当面はローカル実行のまま

---

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
