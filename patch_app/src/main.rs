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

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;
	use std::path::PathBuf;

	fn app_cfg(app_name: &str, checksum_setting: Vec<&str>, setting_sn_file_name: &str, download_url: &str) -> footer::AppConfig {
		footer::AppConfig {
			app_name			: app_name.to_string(),
			checksum_setting	: checksum_setting.into_iter().map(String::from).collect(),
			setting_sn_file_name: setting_sn_file_name.to_string(),
			download_url		: download_url.to_string(),
		}
	}

	//MARK: build_summary（GUIダイアログに表示するメッセージの組み立て。純粋関数）

	#[test]
	fn build_summary_all_success_has_no_skip_section() {
		let successes = vec![("GameA".to_string(), "更新ファイルを取得しました：/tmp/a.dmg".to_string())];
		let message = build_summary(&successes, &[]);
		assert!(message.contains("【取得完了：1件】"));
		assert!(message.contains("GameA"));
		assert!(!message.contains("スキップ"));
	}

	#[test]
	fn build_summary_all_failure_has_no_complete_section() {
		let failures = vec![("GameA".to_string(), "旧版が見つからない".to_string())];
		let message = build_summary(&[], &failures);
		assert!(message.contains("【スキップ：1件】"));
		assert!(message.contains("GameA: 旧版が見つからない"));
		assert!(!message.contains("取得完了"));
	}

	#[test]
	fn build_summary_mixed_lists_both_sections_with_counts() {
		let successes = vec![
			("GameA".to_string(), "ok-a".to_string()),
			("GameB".to_string(), "ok-b".to_string()),
		];
		let failures = vec![("GameC".to_string(), "ng-c".to_string())];
		let message = build_summary(&successes, &failures);

		assert!(message.contains("【取得完了：2件】"));
		assert!(message.contains("【スキップ：1件】"));
		// 完了セクションがスキップより前に出る（成功を先に見せる並び）
		assert!(message.find("取得完了").unwrap() < message.find("スキップ").unwrap());
	}

	//MARK: process_app（1アプリ分の判定ロジック。asarはbasename探索方式のフィクスチャで再現）

	fn setup_installed_app(root: &std::path::Path, app_name: &str, asar_bytes: &[u8]) -> PathBuf {
		let resources = root.join(format!("{app_name}.app")).join("Contents/Resources");
		fs::create_dir_all(&resources).unwrap();
		let asar_path = resources.join("app.asar");
		fs::write(&asar_path, asar_bytes).unwrap();
		asar_path
	}

	#[test]
	fn process_app_fails_when_not_installed() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_main_notfound_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let cfg = app_cfg("NoSuchGame", vec!["abc"], "setting.sn", "https://example.com/x");
		let result = process_app(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, Err("旧版が見つからない。購入者チェックに失敗した".to_string()));
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn process_app_fails_when_setting_sn_missing_in_asar() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_main_missing_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let header = r#"{"files":{"other.sn":{"size":0,"offset":"0"}}}"#;
		let asar = asar::build_fake_asar(header, b"");
		setup_installed_app(&dir, "MyGame", &asar);

		let cfg = app_cfg("MyGame", vec!["abc"], "setting.sn", "https://example.com/x");
		let result = process_app(&cfg, detect::Platform::Mac, &dir, &[]);

		assert!(matches!(result, Err(ref msg) if msg.contains("設定ファイル抽出に失敗した")));
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn process_app_fails_when_checksum_does_not_match_known_values() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_main_mismatch_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = true";	// 体験版扱いの中身
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar);

		// 既知チェックサムは製品版の中身から計算した別の値（今回の content とは一致しない）
		let known = checksum::checksum_hex(b"&const.experiment = false");
		let cfg = app_cfg("MyGame", vec![&known], "setting.sn", "https://example.com/x");
		let result = process_app(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, Err("体験版、または未対応バージョンと判定された（購入者チェックに失敗）".to_string()));
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn process_app_passes_checksum_check_when_content_matches_any_known_version() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_main_matches_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = false";	// 製品版v2の中身、という想定
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar);

		// 過去複数バージョン分の既知チェックサム配列のうち、2番目が一致するケース
		let known_v1 = checksum::checksum_hex(b"&const.experiment = true");
		let known_v2 = checksum::checksum_hex(content);
		// 存在しないスキームを使い、curl が DNS 解決を試みる前に即失敗するようにする
		// （テストとして外部ネットワークへ実際に触りに行かないようにするため）
		let cfg = app_cfg("MyGame", vec![&known_v1, &known_v2], "setting.sn", "unsupported-scheme://x");
		let result = process_app(&cfg, detect::Platform::Mac, &dir, &[]);

		// チェックサム一致までは通過し、その先（download::download）で
		// download_url が実URLでないため失敗する（＝購入者チェック自体は通過した証拠）
		assert!(matches!(result, Err(ref msg) if msg.contains("更新ファイルの取得に失敗した")));
		fs::remove_dir_all(&dir).unwrap();
	}
}
