# 公開前チェック・リリース手順

公開前チェックの自動化、リリース手順、参照リンク、移行案内の原稿。TODO.md から分離（2026-08-26）。

⚠️ **決着・凍結した判断は対応コードのコメントへ移す**（重複を避けるため）。
ここに残すのは①対応コードが無い判断、②未着手・低優先度の宿題、③今後の
再検討を避けるための実測値・調査記録。数字を書く基準は
[TODO.md](TODO.md) 冒頭を参照。

---

## 4. 公開前チェック【自動化済み】

`bun run release`（[tools/release_chk.ts](../../tools/release_chk.ts)）で、ビルドと以下のチェックまで自動。
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

## 6. 参照

- [Publisher Agreement (PDF)](https://cdn.vsassets.io/v/M261_20250904.11/_content/Visual-Studio-Marketplace-Publisher-Agreement.pdf)
- [Terms of Use (PDF)](https://cdn.vsassets.io/v/M264_20251020.18/_content/Microsoft-Visual-Studio-Marketplace-Terms-of-Use.pdf)
- [Security and trust in Visual Studio Marketplace (blog)](https://developer.microsoft.com/blog/security-and-trust-in-visual-studio-marketplace/)
- [ユーザー向け告知記事](https://famibee.blog.fc2.com/blog-entry-980.html)

再申請時の材料：公開済み `skynovel2-4.30.4.vsix` を既知のサプライチェーン攻撃指標（`webhook.site` / `eval(atob` / Shai-Hulud 系 IoC / 資格情報の外部送信パターン）で走査した結果は**検出なし**。資格情報関連の文字列ヒットは全て ncu の正常なコードだった。シグネチャベースの簡易チェックであり無汚染の証明ではないが、`.github/` が無く CI 公開もしていないため PAT 漏洩によるアカウント乗っ取り線は薄い。


---

## 7. リリース手順（このファイルは vsix に入らない）

### スクリプト早見表

⚠️ **直接叩かず `bun run …` を使う。** `build.ts` / `release_chk.ts` は
`tools/` へ移動したので、`bun release_chk.ts` は
**`Module not found` になる**（2026-07-28 に実際に踏んだ）。
スクリプト名を経由していれば、また移動しても呼び出し側は変わらない。

| コマンド | 用途 |
|---|---|
| `bun run watch` | 開発。デバッグ実行（F5）の preLaunchTask が自動で呼ぶ。vite と esbuild の watch |
| `bun run build` | 一回だけの開発ビルド（vue + esbuild + views/*.ts） |
| `bun run chk:types` | 型検査のみ（`tsc -p tsconfig.chk.json --noEmit`、src + server）。リリース経路ではこれが唯一の型検査 |
| `bun run lint` | ESLint を**全ファイルへ**（約10秒）。**ESLint 拡張機能は開いているファイルしか見ない**ので、これが無いと閉じたファイルの lint エラーに気づけなかった。`vscode:prepublish` からも呼ぶ |
| `bun test` | テスト |
| `bun run version:patch` | package.json のバージョンだけ上げる（`:minor` / `:major` も同様）。git タグ・コミットは作らない（`-no-git-tag-version` はダッシュ1個だが npm が解釈してくれることを実測確認済み） |
| **`bun run release`** | **公開前チェック6項目 ＋ vsix 生成**（[tools/release_chk.ts](../../tools/release_chk.ts)）。リリース時はこれを使う |
| `bun run pack_only` | チェックなしで vsix だけ作る。切り分け・急ぎのとき用 |
| `bun run update` | 依存の一括更新（本体 + server + グローバルの ncu） |
| `bun run rebuild` | node_modules 作り直し |
| `vscode:prepublish` | vsce が自動で呼ぶ。直接叩かない |

### ⚠️ 落とし穴

- スクリプト名は `release`。**`publish` という名前にすると `bun publish`（bun 組み込みの npm レジストリ公開）と打ち間違えたときに事故る**ので避けている
- `vsce publish` は使わない。PAT を置かない方針（公開は Web UI から手動）
- `bun run release` が1件でも ✗ を出したら公開しない。✗ の内容は [tools/release_chk.ts](../../tools/release_chk.ts) の該当箇所にコメントで理由が書いてある
- **ビルドは esbuild なので型を見ない。** 型検査は `vscode:prepublish` の `chk:types`（tsc）が担う。`pack_only` も prepublish 経由なので同じく通る
- `dist/` と `views/*.js` は生成物。前者は git 管理下、後者は .gitignore 済み

### 手順

0. **版番号を決める。** Marketplace は `major.minor.patch` のみで
	`5.0.0-alpha.1` のような semver の pre-release タグは**使えない**。
	公式の慣習に倣い **奇数マイナー＝先行版（alpha/beta）／偶数マイナー＝正式版**
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
	- 添付：`bluesnovel-X.Y.Z.vsix`（旧 `skynovel2-…`。改名済み）
	- 本文：SHA256 を差し替える（未公開の原稿は §8.5）
	- ⚠️ **先行版なら「Set as a pre-release」に必ずチェック。**
	`/releases/latest` は pre-release を除外するので、これで
	**既存利用者に更新通知が飛ばない**（更新通知は latest しか見ない）。
	チェックを忘れると、落ち着いていない版へ全員を誘導してしまう
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

## 8. Releases リリースノート原稿

⚠️ **版ごとの原稿はここに残さない。** 公開したら実物が GitHub Releases にあるので、
草稿は用途を終える（v4.31.1 の原稿は 2026-07-28 に削除）。
**書き方の型**だけ §7「手順」に置いてある。

未公開の原稿だけを置く場所 → §8.5


---

## 8.5. 移行案内の原稿【改名版のリリース時に使う】

✅ **文面は作者確認済み（2026-07-28）。** そのまま使ってよい。

⚠️ **まだ公開しない。** **v5.0.0 正式版**まで出さない（alpha 段階で出すと、
落ち着いていないものへ全員を移行させてしまう）。
README の「⚠️ Important Notice」ブロック（現在は Marketplace 停止のお知らせ）を
**差し替える**形で使う。

### (1) README 差し替え（bilingual）

```markdown
## ⚠️ Important Notice / 重要なお知らせ

### The extension has been renamed / 拡張機能の名前が変わりました

| | |
|---|---|
| Old / 旧 | `famibee2.skynovel2` (SKYNovel) |
| **New / 新** | **`famibee2.bluesnovel`** (BlueSNovel / SKYNovel) |

Microsoft confirmed that a removed extension is **never reinstated**, so the old
listing — its ID, install count and reviews — is gone for good. The corrected
build is published under a new name. It is the same extension, and it still
supports both engines.

**⚠️ Uninstall the old extension before installing the new one.** Both can be
installed at the same time, and they register the same command IDs and view IDs,
so they conflict.

1. Extensions view → find **SKYNovel** (`famibee2.skynovel2`) → **Uninstall**
2. Install **BlueSNovel / SKYNovel** (`famibee2.bluesnovel`)
3. Reload the window

Your projects are not affected. Nothing under `doc/prj/` is touched by this.

---

削除された拡張機能の ID は**復活しません**（Microsoft から回答済み）。
旧ページ・インストール数・レビューは戻らないため、修正版は**新しい名前**で公開します。
中身は同じ拡張機能で、両エンジン対応も変わりません。

**⚠️ 新版を入れる前に、旧版をアンインストールしてください。** 両方同時に入って
しまい、同じコマンド ID・ビュー ID を登録するため衝突します。

1. 拡張機能ビューで **SKYNovel**（`famibee2.skynovel2`）を探し、**アンインストール**
2. **BlueSNovel / SKYNovel**（`famibee2.bluesnovel`）を入れる
3. ウィンドウを再読み込み

作品プロジェクトには影響しません。`doc/prj/` 以下は一切触りません。

新版には**更新のお知らせ機能**が入っています（v4.31.2〜）。
以後は新版が出たときに通知されます（通知のみ。ダウンロードもインストールもしません）。
```

### (2) ブログ記事（貼り付け用 HTML）

過去の記事（[blog-entry-980](https://famibee.blog.fc2.com/blog-entry-980.html)）の
続報として。**そのまま貼れる形**で置く（方針だけ書いても再現できないため）。

```html
<p>2026年7月にお知らせした Marketplace の件について、続報です。</p>

<h2>拡張機能の名前が変わります</h2>
<p>削除された拡張機能の ID は<strong>復活しない</strong>と Microsoft から回答がありました。旧ページ・インストール数・レビューは戻りません。そのため修正版は<strong>新しい名前</strong>で公開します。</p>
<ul>
<li>旧：<code>famibee2.skynovel2</code>（SKYNovel）</li>
<li><strong>新：<code>famibee2.bluesnovel</code>（BlueSNovel / SKYNovel）</strong></li>
</ul>
<p>中身は同じ拡張機能です。SKYNovel と BlueSNovel の両方に対応している点も変わりません。両エンジンを見るので、表示名は両方を名乗ることにしました。</p>

<h2>⚠️ 新版を入れる前に、旧版をアンインストールしてください</h2>
<p>旧版と新版は VSCode から見て<strong>別の拡張機能</strong>なので、両方同時に入ってしまいます。どちらも同じコマンド ID・ビュー ID を登録するため、そのままでは衝突して誤動作します。</p>
<ol>
<li>拡張機能ビューで <strong>SKYNovel</strong>（<code>famibee2.skynovel2</code>）を探し、<strong>アンインストール</strong></li>
<li><strong>BlueSNovel / SKYNovel</strong>（<code>famibee2.bluesnovel</code>）を入れる</li>
<li>ウィンドウを再読み込み</li>
</ol>
<p>作品プロジェクトには影響しません。<code>doc/prj/</code> 以下は一切触りません。</p>
<p>なお新版には、旧版が入ったままだと<strong>起動時に知らせる仕組み</strong>を入れてあります。うっかり両方入れてしまっても気づけます。</p>

<h2>今後の更新について</h2>
<p>新版には<strong>更新のお知らせ機能</strong>が入っています（v4.31.2〜）。新しい版が出たときに通知します。<strong>通知のみで、ダウンロードもインストールも行いません。</strong>設定で切ることもできます。</p>
```

### (3) テンプレリポジトリの README 追記（tmp_esm_uc / tmp_blues）

**【ベース更新】を押した人には main.zip 経由で届く**ので、v4.30.4 で止まっている
利用者に触れる数少ない経路（[features.md](features.md)）。短く、リンクだけ：

```markdown
### VSCode 拡張機能をお使いの方へ（2026/08）

拡張機能は **`famibee2.bluesnovel`（BlueSNovel / SKYNovel）** に名前が変わりました。
**旧版（SKYNovel / `famibee2.skynovel2`）は先にアンインストールしてください。**
→ [詳細](https://github.com/famibee/SKYNovel-vscode-extension#readme)
```

