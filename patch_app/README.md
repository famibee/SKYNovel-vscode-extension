# sn_legacy_patch（過去アプリ向けパッチ配布・購入者チェック付き）

`upd_url.json`／`[update_check]` を持たない・使えない過去出荷アプリのユーザーに、
メーカーが別途配布する小さな実行ファイル。実行すると「旧版が本物か」をローカルで
確認したうえで、新版インストーラを自動ダウンロード・起動する。

設計の経緯・判定ロジックの根拠は
[../src/docs/legacy-app-patch.md](../src/docs/legacy-app-patch.md) 参照。
このファイルは「作り方・使い方」だけを持つ。

sn_extension（VSCode拡張機能）には組み込まない独立ツール。開発者（メーカー）が
手元で実行して配布物を作る。


## 全体の流れ

```
patch_app を release ビルド（1回。win/mac 別。OS/CPUごとに1本のstub）
        ↓
配布したいアプリごとに config.json を書く
        ↓
bun src/genLegacyPatch.ts で stub + config.json → 配布用の1ファイルを生成
        ↓
配布用ファイルを自社サイト等で配布。利用者はダブルクリックするだけ
```


## 1. stub（汎用バイナリ本体）をビルドする

全プロジェクト共通。プロジェクトごとの再ビルドは不要（後述の生成CLIがバイト列を
連結するだけなので、stub自体は使い回せる）。

```sh
cd patch_app
~/.cargo/bin/cargo build --release
```

成果物：
- mac: `target/release/sn_legacy_patch`
- windows: `target/release/sn_legacy_patch.exe`（クロスコンパイルの場合は
  `--target x86_64-pc-windows-gnu` 等が要る。Rust開発環境の準備状況は
  legacy-app-patch.md 参照）

`cargo test` で単体テスト（ロジック部分・GUIメッセージ組み立て部分など）が一通り走る。


## 2. 配布したいアプリごとに設定ファイル（config.json）を書く

1本の実行ファイルに複数アプリ・複数バージョンをまとめられる。`apps` 配列に
並べるだけでよい。

```json
{
  "apps": [
    {
      "appName": "MyGame",
      "pass": "/path/to/MyGame/doc/prj/pass.json",
      "relPath": "theme/setting.sn",
      "crypto": true,
      "downloadUrl": "https://example.com/mygame-installer.dmg",
      "settings": [
        "/path/to/MyGame/v1.0/setting.sn",
        "/path/to/MyGame/v1.1/setting.sn"
      ]
    },
    {
      "appName": "AnotherGame",
      "pass": "/path/to/AnotherGame/doc/prj/pass.json",
      "relPath": "theme/setting.sn",
      "crypto": false,
      "downloadUrl": "https://example.com/anothergame-installer.exe",
      "settings": ["/path/to/AnotherGame/v1.0/setting.sn"]
    }
  ]
}
```

| フィールド | 内容 |
|---|---|
| `appName` | インストール済み判定に使うアプリ名（mac: `/Applications/<appName>.app`、win: `Program Files` 等の直下フォルダ名）。`/`・`\`・`..` は使えない |
| `pass` | そのプロジェクトの `pass.json`（暗号鍵）のパス。生成時にのみ使う。鍵自体は配布物には一切含まれない |
| `relPath` | `setting.sn` の `doc/prj` からの相対パス（通常 `theme/setting.sn`） |
| `crypto` | プロジェクトの `crypto:true/false` 設定と合わせる |
| `downloadUrl` | 新版インストーラの**直リンク**（Webページ不可。`http(s)://` 必須） |
| `settings` | そのアプリの**過去に出荷した全バージョン分**の `setting.sn`（平文）のパス。最低1つ。1つでも足りないと、そのバージョンの正規購入者が誤って弾かれる |

`settings` に渡す各ファイルは `&const.体験版 = …` を含んでいる必要がある
（テンプレ標準の変数。生成時にチェックされ、無いとエラーで止まる）。


## 3. 配布物を生成する

```sh
bun src/genLegacyPatch.ts --config config.json --stub patch_app/target/release/sn_legacy_patch --out MyGamePatch
```

成功すると、アプリごとの `checksumSetting` 件数・`settingSnFileName`（asar内で
探す実ファイル名）が表示される。`--out` に指定したパスが配布用の実行ファイル
（`chmod +x` は mac 側で必要）。


## 4. 配布・実行時の動作

- 利用者が実行ファイルをダブルクリックすると、`apps` に並べた順にアプリを処理する
- アプリごとに「旧版がインストールされているか」→「体験版でなく本物の製品版か
  （暗号化済み `setting.sn` のチェックサム比較）」を確認し、通れば
  `downloadUrl` を curl で取得して自動的に開く（mac: `open`、win: そのまま起動）
- **途中の1アプリで判定に失敗してもそこでは止まらず、そのアプリだけスキップして
  次のアプリへ進む**。複数アプリを1本にまとめた場合、対象が複数あれば
  ダウンロードも複数回・順に走る
- 全アプリの処理が終わったら、成功・スキップの件数をまとめた案内ダイアログを
  1回だけ表示する（mac: `osascript`、win: `mshta.exe` 経由。追加ライブラリ不要）
- ダウンロードURLは画面に一切表示しない（購入者チェックを経ていない第三者への
  転送を防ぐため）


## 制限・注意点

- **署名なし配布物**。mac は初回起動時に quarantine 属性への対処
  （右クリック→「開く」）、windows は SmartScreen 警告が出うる
- `downloadUrl` が実際にインストーラの直リンクであることは生成時に検証していない。
  紹介ページ（HTML）を渡すと curl がそのHTMLを取得するだけで失敗する
- 「インストール済みの過去バージョンアプリから自動でチェックサムを収集する」
  機能は無い。`settings` は手元にある過去出荷インストーラから毎回手動で集める
- Windows/mac 両実機で動作確認済み（2026-09-14。detect・download・footer・
  ロジック分岐まで含む一連の動作）。詳細は legacy-app-patch.md 参照
