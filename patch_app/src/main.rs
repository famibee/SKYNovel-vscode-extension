// 過去アプリ向けパッチ配布（購入者チェック付き）のパッチアプリ本体。雛形段階。
// 設計は sn_extension の src/docs/legacy-app-patch.md 参照。
// GUI フレームワークは使わない方針（終了時の案内は OS 標準ダイアログで足りる）。
//
// ⚠️ 既知の未検証事項：Windows 版の asar パス（detect::asar_path_for_install）は
// electron-builder の既定レイアウトからの推測のみで、実機検証していない
// （legacy-app-patch.md「asar 内の1ファイル抽出」参照）。
//
// 2026-09-14: 複数ver・複数アプリを1本の実行ファイルで扱えるよう、埋め込み設定を
// 単一Configから配列（Vec<AppConfig>）に変更。1アプリで購入者チェックに失敗しても
// そのアプリだけスキップして次のアプリへ進み、最後に結果サマリーを1回のダイアログで表示する
// （「複数アプリなら複数dmgが次々にDLされる」という動作イメージのため）。

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

// 1アプリ分の処理。成功なら案内メッセージ、失敗なら理由を文字列で返す
// （呼び出し側でアプリごとに結果を集約するため、ここではダイアログを出さない）
fn process_app(
	cfg: &footer::AppConfig,
	platform: detect::Platform,
	mac_apps_dir: &std::path::Path,
	win_dirs: &[std::path::PathBuf],
) -> Result<String, String> {
	let install_path = detect::find_installed_app(&cfg.app_name, platform, mac_apps_dir, win_dirs)
		.ok_or_else(|| "旧版が見つからない。購入者チェックに失敗した".to_string())?;

	let asar_path = detect::asar_path_for_install(&install_path, platform)
		.ok_or_else(|| "この環境向けの asar パスが分からない（対象外プラットフォーム）".to_string())?;

	// 体験版誤認の回避：basename 探索方式（フォルダ配置は問わない。legacy-app-patch.md
	// 2026-09-13決定）で setting.sn を抽出し、既知チェックサムのいずれかと一致するか確認する
	let setting_sn = asar::extract_by_basename(&asar_path, &cfg.setting_sn_file_name)
		.map_err(|e| format!("旧アプリ内の設定ファイル抽出に失敗した: {e}"))?;

	if !checksum::matches_any_known_checksum(&setting_sn, &cfg.checksum_setting) {
		return Err("体験版、または未対応バージョンと判定された（購入者チェックに失敗）".to_string());
	}

	// download_url は画面に一切出さない（download.rs 冒頭コメント参照：ブラウザに渡すと
	// 検証を経ていない第三者へ転送・再配布できてしまい、購入者チェックの意味が薄れる）
	let dest_dir = env::temp_dir().join(format!("{}_update", cfg.app_name));
	let downloaded = download::download(&cfg.download_url, &dest_dir)
		.map_err(|e| format!("更新ファイルの取得に失敗した: {e}"))?;

	download::open_downloaded_file(&downloaded)
		.map_err(|e| format!("取得したファイルを開けなかった: {e}\n手動で開いてください：{}", downloaded.display()))?;

	Ok(format!("更新ファイルを取得しました：{}", downloaded.display()))
}

fn build_summary(successes: &[(String, String)], failures: &[(String, String)]) -> String {
	let mut lines = Vec::new();

	if !successes.is_empty() {
		lines.push(format!("【取得完了：{}件】", successes.len()));
		for (name, msg) in successes {
			lines.push(format!("・{name}: {msg}"));
		}
	}
	if !failures.is_empty() {
		lines.push(format!("【スキップ：{}件】", failures.len()));
		for (name, reason) in failures {
			lines.push(format!("・{name}: {reason}"));
		}
	}

	lines.push(String::new());
	lines.push("引き続き、取得済みのインストール画面の案内に従ってください。".to_string());
	lines.join("\n")
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

	if cfg.is_empty() {
		return fail("埋め込み設定が空。対象アプリが1件も無い");
	}

	let platform = detect::host_platform();
	let win_dirs = detect::win_install_base_dirs_from_env();
	let mac_apps_dir = std::path::Path::new("/Applications");

	let mut successes = Vec::new();
	let mut failures = Vec::new();

	for app_cfg in &cfg {
		match process_app(app_cfg, platform, mac_apps_dir, &win_dirs) {
			Ok(msg) => successes.push((app_cfg.app_name.clone(), msg)),
			Err(reason) => failures.push((app_cfg.app_name.clone(), reason)),
		}
	}

	let message = build_summary(&successes, &failures);
	println!("{message}");

	let kind = if successes.is_empty() { dialog::Kind::Error } else { dialog::Kind::Info };
	if let Err(e) = dialog::show(kind, APP_TITLE, &message) {
		eprintln!("ダイアログ表示に失敗（処理自体は継続済み）: {e}");
	}

	if successes.is_empty() { ExitCode::FAILURE } else { ExitCode::SUCCESS }
}
