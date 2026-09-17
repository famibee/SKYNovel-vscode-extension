# sn_legacy_patch（過去アプリ向けパッチ配布・購入者チェック付き）

`upd_url.json`／`[update_check]` を持たない・使えない過去出荷アプリのユーザーに、
メーカーが別途配布する小さな実行ファイル。実行すると「旧版が本物か」をローカルで
確認したうえで、新版インストーラを自動ダウンロード・起動する。

設計の経緯・判定ロジックの根拠は
[../src/docs/legacy-app-patch.md](../src/docs/legacy-app-patch.md) 参照。
このファイルは**配布物本体（stub）のビルド方法・動作**だけを持つ。

開発者（メーカー）が実際に配布物を生成する手順は
**[../patch_gen_gui/README.md](../patch_gen_gui/README.md)（GUIツール）参照**。

sn_extension（VSCode拡張機能）には組み込まない独立ツール。


## stub（汎用バイナリ本体）をビルドする

全プロジェクト共通。プロジェクトごとの再ビルドは不要（GUI側が設定情報と
バイト列を連結するだけなので、stub自体は使い回せる）。

**patch_gen_gui（GUI）は生成のたびにこの手順を自動実行する**ため、通常は
手動でビルドする必要はない。以下は手動確認用。

mac向けは**universal2**（x86_64+arm64を`lipo`で1バイナリに結合）でビルドする
（2026-09-17〜。macOS 27 "Golden Gate"を最後にRosetta 2の一般アプリ向けサポートが
終わる見込みとなったため、Intel Mac・Apple Siliconどちらでもそのまま動くように
した。legacy-app-patch.md 詰められていない仕様#9・残件#4参照）：

```sh
cd patch_app
rustup target add x86_64-apple-darwin aarch64-apple-darwin   # 初回のみ

# Homebrew版rustcが$PATH上で先に来ているとaarch64ビルドが失敗するため、
# RUSTCでrustup版を明示する（legacy-app-patch.md「Rust 開発環境の準備状況」参照）
RUSTC=~/.cargo/bin/rustc ~/.cargo/bin/cargo build --release --target x86_64-apple-darwin
RUSTC=~/.cargo/bin/rustc ~/.cargo/bin/cargo build --release --target aarch64-apple-darwin

mkdir -p target/universal2-apple-darwin/release
lipo -create \
  -output target/universal2-apple-darwin/release/sn_legacy_patch \
  target/x86_64-apple-darwin/release/sn_legacy_patch \
  target/aarch64-apple-darwin/release/sn_legacy_patch
```

成果物：
- mac: `target/universal2-apple-darwin/release/sn_legacy_patch`
- windows: **Windows実機上で**同じコマンドを実行する（`x86_64-pc-windows-msvc`。
  mac からのクロスコンパイル環境は結局不要と判明した。2026-09-17。詳細は
  legacy-app-patch.md「Rust 開発環境の準備状況」参照）。成果物 `sn_legacy_patch.exe`
  は `prebuilt/x86_64-pc-windows-msvc/` に置く（patch_gen_gui が自動探索する場所）。
  win側は現状x64のみで、ia32/arm64向けの対応は未着手
  （legacy-app-patch.md 残件#4参照）

`cargo test` で単体テスト（ロジック部分・案内ダイアログのメッセージ組み立て
部分など）が一通り走る。

このビルド成果物（stub）を [patch_gen_gui/](../patch_gen_gui/) の画面で選択し、
アプリごとの設定と合わせて配布物を生成する。


## 配布・実行時の動作

- 利用者が実行ファイルをダブルクリックすると、まとめられたアプリを順に処理する
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


## 制限・注意点（stub本体）

- **署名なし配布物**。mac は初回起動時に quarantine 属性への対処
  （右クリック→「開く」）、windows は SmartScreen 警告が出うる
- electron-builder の制約で、**Windows上ではmacOS向けインストーラーをビルド
  できない**（署名の有無に関わらない制約）。win環境の開発者は、そもそも
  mac版インストーラーを持っていない可能性が高い
- Windows/mac 両実機で動作確認済み（2026-09-14。detect・download・footer・
  ロジック分岐まで含む一連の動作）。詳細は legacy-app-patch.md 参照

配布物の生成（アプリごとの設定入力・過去バージョンのチェックサム収集・
downloadUrl検証等）に関する使い方・注意点は
[patch_gen_gui/README.md](../patch_gen_gui/README.md) 参照。
