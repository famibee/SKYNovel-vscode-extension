# sn_extension

ノベルゲームエンジン SKYNovel / BlueSNovel の VSCode 拡張機能。
本体（`src/`）と言語サーバー（`server/src/`）の2プロセス構成。


## 機械可読なデータ（grep する前にここを読む）

### タグ辞書 … `dist/md.json`

SKYNovel の全タグ（114件）の仕様。**タグの引数・既定値・値域を調べるときは、
ソースを grep せずこれを読む**。

```json
"frame": {
  "sum": "フレームに設定  \nフレームそのものの属性を設定する",
  "param": [{"name":"id", "required":"y", "def":"", "rangetype":"フレーム名", "comment":"…"}],
  "snippet": [...], "detail": "…"
}
```

型は `src/md2json.ts` の `MD_STRUCT` / `MD_PARAM_DETAILS`。

- **編集するのは `src/md/*.md`**（こちらが原本）
- `bun run md2json` で `dist/md.json` と `server/src/md.json` の2箇所へ出力される
- 中間ファイル `src/md.json` は存在しない（意図的。md2json.ts の冒頭コメント参照）

### 素材台帳 … 各ゲームプロジェクトの `doc/prj/path.json`

そのプロジェクトで**実在する素材名**の一覧。`.sn` を書くとき、画像・音声の名前が
実在するかはここで確かめる。このリポジトリではなく、ゲームプロジェクト側にある。

```json
"black": {":cnt": 1, "png": "bg/black.png"}
```

拡張機能が生成・更新する（`src/Project.ts` の `updPathJson()`）。


## コマンド

| | |
|---|---|
| `bun run build` | md.json 生成 → Vue ビルド → esbuild |
| `bun run chk:types` | 型検査のみ（`tsc --noEmit`） |
| `bun run test:int` | 統合テスト。VSCode を起動して `vscode` API を叩く |
| `bun run test:ui` | UI テスト。Playwright で画面を操作する |
| `bun run release` | 公開前チェック。vsix を作り SHA256 まで出す（**公開はしない**） |

`test:ui` が `bun` ではなく `node test/ui/runUI.mjs` なのは、Playwright を bun で
動かすとタイムアウトするため。
