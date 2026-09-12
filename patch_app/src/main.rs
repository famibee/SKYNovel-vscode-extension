// 過去アプリ向けパッチ配布（購入者チェック付き）のパッチアプリ本体。雛形段階。
// 設計は sn_extension の src/docs/legacy-app-patch.md 参照。
// GUI フレームワークは使わない方針（終了時の案内は OS 標準ダイアログで足りる）。
//
// ⚠️ 既知の未検証事項：Windows 版の asar パス（detect::asar_path_for_install）は
// electron-builder の既定レイアウトからの推測のみで、実機検証していない
// （legacy-app-patch.md「asar 内の1ファイル抽出」参照）。

mod asar;
mod checksum;
mod detect;
mod dialog;
mod download;
mod footer;

use std::env;
use std::fs;
use std::process::ExitCode;

const APP_TITLE: &str = "アップデートのご案内";

fn fail(message: &str) -> ExitCode {
	eprintln!("{message}");
	let _ = dialog::show(dialog::Kind::Error, APP_TITLE, message);
	ExitCode::FAILURE
}

fn main() -> ExitCode {
	let exe_path = match env::current_exe() {
		Ok(p) => p,
		Err(e) => return fail(&format!("自分自身の実行パスが取得できない: {e}")),
	};

	let full_bytes = match fs::read(&exe_path) {
		Ok(b) => b,
		Err(e) => return fail(&format!("自分自身の読み取りに失敗: {e}")),
	};

	let Some(json) = footer::extract_trailing_json(&full_bytes) else {
		return fail("埋め込み設定が見つからない。sn_extension が生成した配布用バイナリではない可能性がある");
	};

	let cfg = match footer::parse_config(&json) {
		Ok(c) => c,
		Err(e) => return fail(&format!("埋め込み設定の形式が不正: {e}")),
	};

	let platform = detect::host_platform();
	let win_dirs = detect::win_install_base_dirs_from_env();
	let mac_apps_dir = std::path::Path::new("/Applications");

	let Some(install_path) = detect::find_installed_app(&cfg.app_name, platform, mac_apps_dir, &win_dirs) else {
		return fail(&format!("「{}」の旧版が見つからない。購入者チェックに失敗した", cfg.app_name));
	};

	let Some(asar_path) = detect::asar_path_for_install(&install_path, platform) else {
		return fail("この環境向けの asar パスが分からない（対象外プラットフォーム）");
	};

	// 体験版誤認の回避：basename 探索方式（フォルダ配置は問わない。legacy-app-patch.md
	// 2026-09-13決定）で setting.sn を抽出し、既知チェックサムのいずれかと一致するか確認する
	let setting_sn = match asar::extract_by_basename(&asar_path, &cfg.setting_sn_file_name) {
		Ok(bytes) => bytes,
		Err(e) => return fail(&format!("旧アプリ内の設定ファイル抽出に失敗した: {e}")),
	};

	if !checksum::matches_any_known_checksum(&setting_sn, &cfg.checksum_setting) {
		return fail(&format!("「{}」は体験版、または未対応バージョンと判定された（購入者チェックに失敗）", cfg.app_name));
	}

	// download_url は画面に一切出さない（download.rs 冒頭コメント参照：ブラウザに渡すと
	// 検証を経ていない第三者へ転送・再配布できてしまい、購入者チェックの意味が薄れる）
	let dest_dir = env::temp_dir().join(format!("{}_update", cfg.app_name));
	let downloaded = match download::download(&cfg.download_url, &dest_dir) {
		Ok(p) => p,
		Err(e) => return fail(&format!("更新ファイルの取得に失敗した: {e}")),
	};

	if let Err(e) = download::open_downloaded_file(&downloaded) {
		return fail(&format!("取得したファイルを開けなかった: {e}\n手動で開いてください：{}", downloaded.display()));
	}

	let message = format!(
		"「{}」の更新ファイルを取得しました。\n引き続きインストール画面の案内に従ってください。",
		cfg.app_name,
	);
	println!("{message}");
	if let Err(e) = dialog::show(dialog::Kind::Info, APP_TITLE, &message) {
		eprintln!("ダイアログ表示に失敗（処理自体は成功）: {e}");
	}

	ExitCode::SUCCESS
}
