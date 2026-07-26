# TODO：VS Marketplace 是正対応

最終更新：2026-07-27（完了分は CHANGELOG.md へ移動。最終的にカラを目指す）

## 1. 期日とゴール

修正A（ncu をバンドルから外す）・修正B（pip install の同意化）はどちらも完了（CHANGELOG v4.30.5 / v4.31.0）。

| 時期 | やること |
|---|---|
| 修正完了次第 | GitHub Releases で配布（SHA256 併記）＋ブログ告知 |
| その後 | Open VSX 登録を検討 |
| 8/23 以降 | Marketplace へ正式再申請（是正内容を条項付きで報告） |

前提（規約を読んで確認済み）：

- `famibee2.skynovel2` の item ID・インストール数・レビューは復活しない。再公開は新しい extension name になる
- Publisher Agreement 13(d) No Exclusivity — 他マーケットプレイスへの公開は明文で許容。Open VSX 併用は問題なし
- ToU 4(x) — 過去にアクセスを剥奪された者はサイトを利用してはならない。**別アカウント作り直しは独立した規約違反**
- Publisher Agreement 3(g) / 12 は理由の有無を問わず削除可と規定。法的に争う線はない

MS へ検知理由の照会メールを 2026-07-26 に送信済み（担当者ID `655cd9f9`）。回答は期待値が低いので待たない。

---

## 2. 優先度低（余力があれば）

いずれも単体では致命的でないが、修正A・Bと組み合わさると印象が悪かったもの。README 冒頭に「拡張機能がユーザー環境で実行するもの」を書いた（v4.31.0）ので文書化の要件は満たしているが、UI 側の改善余地は残る。

- **C：リモート ZIP の DL→展開→`npm i`** — [src/ActivityBar.ts:438](src/ActivityBar.ts:438) / [:525](src/ActivityBar.ts:525) で GitHub の main.zip を fetch して AdmZip で展開、[src/Project.ts:637](src/Project.ts:637) / [:1194](src/Project.ts:1194) で `npm i`。進捗表示だけでなく**取得元 URL をユーザーに見せる**と改善する
- **D：PowerShell 実行** — [src/Project.ts:742](src/Project.ts:742) の `execSync('PowerShell Get-ExecutionPolicy')`。読み取り専用なので実害はないが、`execSync` でのシェル呼び出しは検査で目立つ
- **E：ファイル暗号化** — [src/Encryptor.ts](src/Encryptor.ts) / [src/EncryptorTransform.ts](src/EncryptorTransform.ts)。単体では無害だが C・D と合わせるとランサム系ヒューリスティクスに触れる。README で用途（作品データの保護）を明示しておくと良い

---

## 3. ビルド周りの宿題

- **server/tsconfig.json と ルート tsconfig.json の設定乖離** — server/src は `strict` も `noUncheckedIndexedAccess` も無い緩い設定で書かれており、ルート設定を当てると型エラー105件。現在は webpack の `reportFiles` で src/ のみ報告に限定して回避している（CHANGELOG v4.30.5）。いつか設定を揃えて server 側も直す
- **server/tsconfig.json の `moduleResolution: node10` が TS7 で廃止予定**（TS5107）。`ignoreDeprecations: "6.0"` か bundler 系への移行が必要
- **esbuild と webpack の二重ビルド** — [build.ts](build.ts) の `./src/extension` 出力は、後続の webpack に上書きされるので実質使われていない。整理の余地あり
- **webpack のキャッシュが型エラーを隠す** — `node_modules/.cache/webpack` があると既存モジュールを再検査しないので、型エラーがあっても成功したように見える。リリース前は cold ビルドで確認すること

---

## 4. 公開前チェックの自動化（ミス防止）

リリース作業の自動化は、ビルドの手間を省くより**公開前チェック**に価値がある。今回の件はそこで止められた類のもの。

- `exec()` / `execSync()` でパッケージマネージャ（pip / npm / brew / apt）を呼ぶ箇所が増えたら CI を落とす
- `dependencies` に入っているものが本体バンドルに混入していないか検査（修正Aの再発防止）
- `.vscodeignore` の漏れ検査（vsix の中身を一覧して想定外のファイルがあれば落とす）
- cold ビルド（webpack キャッシュを消してから）で型エラー0を確認
- vsix の SHA256 を自動でリリースノートに出力

**注意：** GitHub Actions で公開まで自動化すると PAT を secrets に置くことになる。今の状況でトークン管理を増やすのは避けたいので、当面は「ビルドとチェックまで自動、公開は手動」を勧める。

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
