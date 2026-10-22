// 配布パッチアプリ本体（Tauri v2）。2026-10-22、eguiから乗り換え。
// 設計は sn_extension の src/docs/legacy-app-patch.md 参照。
//
// 判定ロジック（sn_legacy_patch_core）は無改修のまま流用する（47件のテストが通る状態を
// 崩さない方針）。遠隔マニフェスト（manifest.rs）とカード状態判定（card_status.rs）は
// このクレート側の新規追加で、実行時に埋め込み設定（footer::AppConfig）とマージする。

mod card_status;
mod manifest;

use sn_legacy_patch_core::{detect, footer, inspect, process_app};
use sn_legacy_patch_core::inspect::LocalState;
use tauri::Emitter;

// スパイク②の検証用コマンド（実装順序1・2で追加。引き続き診断用に残す）。自分自身を読み、
// 末尾のフッタJSONを取り出せるかどうかを文字列で返す。フッタが無ければその旨を返す
// （エラーではない。開発ビルドではフッタが付いていないのが正常なため）
#[tauri::command]
fn self_check() -> String {
	let exe_path = match std::env::current_exe() {
		Ok(p) => p,
		Err(e) => return format!("自分自身の実行パス取得に失敗: {e}"),
	};
	let bytes = match std::fs::read(&exe_path) {
		Ok(b) => b,
		Err(e) => return format!("自分自身の読み取りに失敗: {e}"),
	};
	match footer::extract_trailing_json(&bytes) {
		Some(json) => format!("フッタJSONを検出：{json}"),
		None => format!("フッタ無し（{} バイト。開発ビルドでは正常）", bytes.len()),
	}
}

// 自分自身の末尾に埋め込まれた設定を読む。フッタが無い（開発ビルド等）場合は空配列
// （「インストール済みでないものは表示しない」ルールと同じ理由で、設定が無ければ
// カードを一切出さない＝安全側に倒す）
fn own_configs() -> Vec<footer::AppConfig> {
	let bytes = std::env::current_exe().ok().and_then(|p| std::fs::read(p).ok());
	let json = bytes.as_deref().and_then(footer::extract_trailing_json);
	json.and_then(|j| footer::parse_config(&j).ok()).unwrap_or_default()
}

fn mac_apps_dir() -> std::path::PathBuf {
	std::path::PathBuf::from("/Applications")
}

#[derive(serde::Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct CardDto {
	app_name: String,
	state: card_status::CardStatus,
	latest_version: Option<String>,
}

fn build_card(
	cfg: &footer::AppConfig,
	platform: detect::Platform,
	mac_apps_dir: &std::path::Path,
	win_dirs: &[std::path::PathBuf],
	manifest: Option<&manifest::Manifest>,
) -> Option<CardDto> {
	let local = inspect::inspect_local(cfg, platform, mac_apps_dir, win_dirs);
	if local == LocalState::NotInstalled {
		return None;	// 未インストールのアプリはカードを出さない
	}

	let manifest_entry = manifest.and_then(|m| m.apps.get(&cfg.app_name));
	let os_entry = manifest_entry.and_then(|e| e.for_platform(platform));
	let state = card_status::decide_status(&local, os_entry);
	let latest_version = manifest_entry.map(|e| e.version.clone());

	Some(CardDto { app_name: cfg.app_name.clone(), state, latest_version })
}

// インストール済みのアプリ一覧をカード表示用データとして返す。マニフェスト取得に失敗しても
// （オフライン等）一覧自体は返す——インストール済みの各アプリが「確認できません」状態になる
// （src/docs/legacy-app-patch.md「カードの状態遷移」参照）
#[tauri::command]
fn list_apps(manifest_url: String) -> Vec<CardDto> {
	let platform = detect::host_platform();
	let win_dirs = detect::win_install_base_dirs_from_env();
	let manifest = manifest::fetch_manifest(&manifest_url).ok();

	own_configs()
		.iter()
		.filter_map(|cfg| build_card(cfg, platform, &mac_apps_dir(), &win_dirs, manifest.as_ref()))
		.collect()
}

// 【更新をダウンロード】【当時のインストーラーを選ぶ】【再試行】、いずれのボタンもこのコマンドを
// 呼ぶ（process_app自体が、自動検出失敗時のインストーラー選択ダイアログ・既に最新版なら
// スキップ、までまとめて面倒を見てくれるため）。埋め込み設定（downloadUrl等。旧スキーマで
// 未使用の値が入っている）を、遠隔マニフェストから取得した値で上書きしてから渡す
#[tauri::command]
fn trigger_update(app_name: String, manifest_url: String) -> Result<String, String> {
	let platform = detect::host_platform();
	let win_dirs = detect::win_install_base_dirs_from_env();

	let cfg = own_configs()
		.into_iter()
		.find(|c| c.app_name == app_name)
		.ok_or_else(|| "設定が見つからない".to_string())?;

	let manifest = manifest::fetch_manifest(&manifest_url)
		.map_err(|e| format!("マニフェスト取得に失敗した: {e}"))?;
	let os_entry = manifest
		.apps
		.get(&app_name)
		.and_then(|e| e.for_platform(platform))
		.ok_or_else(|| "この環境向けの配布物情報が無い".to_string())?;

	let mut merged = cfg;
	merged.download_url = os_entry.download_url.clone();
	merged.checksum_latest = os_entry.checksum_latest.clone();
	merged.latest_arch = os_entry.latest_arch.clone();

	process_app(&merged, platform, &mac_apps_dir(), &win_dirs)
}

// ダウンロード→自動オープン後、インストール完了（＝再検査で「最新です」になる）までを
// バックグラウンドでポーリングし、変化のたびに app-status-changed イベントで通知する。
// 最大10分で自動停止（src/docs/legacy-app-patch.md「インストール終了検知」参照）。
// curlサブプロセス呼び出し中心でブロッキングな処理のため、tauri::async_runtime（tokio）
// ではなく素のOSスレッドを使う（既存コードの他の処理と同じ流儀に揃える）
#[tauri::command]
fn watch_install(app: tauri::AppHandle, app_name: String, manifest_url: String) {
	std::thread::spawn(move || {
		let platform = detect::host_platform();
		let win_dirs = detect::win_install_base_dirs_from_env();
		let Some(cfg) = own_configs().into_iter().find(|c| c.app_name == app_name) else { return; };

		let deadline = std::time::Instant::now() + std::time::Duration::from_secs(600);
		while std::time::Instant::now() < deadline {
			std::thread::sleep(std::time::Duration::from_secs(5));

			let manifest = manifest::fetch_manifest(&manifest_url).ok();
			let Some(dto) = build_card(&cfg, platform, &mac_apps_dir(), &win_dirs, manifest.as_ref()) else { continue; };

			let is_up_to_date = dto.state == card_status::CardStatus::UpToDate;
			let _ = app.emit("app-status-changed", dto);
			if is_up_to_date {
				break;
			}
		}
	});
}

#[cfg(test)]
mod tests {
	use super::*;
	use sn_legacy_patch_core::{asar, checksum};
	use std::fs;

	fn app_cfg(app_name: &str, checksum_setting: Vec<&str>) -> footer::AppConfig {
		footer::AppConfig {
			app_name: app_name.to_string(),
			checksum_setting: checksum_setting.into_iter().map(String::from).collect(),
			checksum_installer: Vec::new(),
			checksum_latest: String::new(),
			latest_arch: String::new(),
			setting_sn_file_name: "setting.sn".to_string(),
			download_url: "https://example.com/x".to_string(),	// 旧スキーマの名残。list_apps経由では未参照
		}
	}

	fn setup_installed_app(root: &std::path::Path, app_name: &str, asar_bytes: &[u8]) {
		let resources = root.join(format!("{app_name}.app")).join("Contents/Resources");
		fs::create_dir_all(&resources).unwrap();
		fs::write(resources.join("app.asar"), asar_bytes).unwrap();
	}

	// build_card()がinspect::inspect_local（既存lib・無改修）とcard_status::decide_status
	// （このクレート側の新規追加）を正しくつなげているかを確かめる結合テスト。
	// 実在の/Applicationsには触れず、一時ディレクトリに偽のインストール済みアプリを置く
	#[test]
	fn build_card_returns_none_when_not_installed() {
		let dir = std::env::temp_dir().join(format!("sn_tauri_test_notinstalled_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let cfg = app_cfg("NoSuchGame", vec!["abc"]);
		let result = build_card(&cfg, detect::Platform::Mac, &dir, &[], None);

		assert_eq!(result, None);
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn build_card_is_check_failed_when_installed_but_manifest_missing() {
		let dir = std::env::temp_dir().join(format!("sn_tauri_test_nomanifest_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = false";
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar_bytes);

		let known = checksum::checksum_hex(content);
		let cfg = app_cfg("MyGame", vec![&known]);
		let result = build_card(&cfg, detect::Platform::Mac, &dir, &[], None).unwrap();

		assert_eq!(result.app_name, "MyGame");
		assert_eq!(result.state, card_status::CardStatus::CheckFailed);
		assert_eq!(result.latest_version, None);
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn build_card_is_up_to_date_when_manifest_checksum_matches() {
		let dir = std::env::temp_dir().join(format!("sn_tauri_test_uptodate_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = false";
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar_bytes);

		let known = checksum::checksum_hex(content);
		let cfg = app_cfg("MyGame", vec![&known]);

		let manifest_json = format!(
			r#"{{"schema":1,"apps":{{"MyGame":{{"version":"1.3.0","mac":{{"downloadUrl":"https://example.com/m","checksumLatest":"{known}","latestArch":""}}}}}}}}"#,
		);
		let manifest: manifest::Manifest = serde_json::from_str(&manifest_json).unwrap();

		let result = build_card(&cfg, detect::Platform::Mac, &dir, &[], Some(&manifest)).unwrap();

		assert_eq!(result.state, card_status::CardStatus::UpToDate);
		assert_eq!(result.latest_version, Some("1.3.0".to_string()));
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn list_apps_style_filter_skips_not_installed_and_keeps_installed() {
		// list_apps()自体はown_configs()（自分の実行ファイル）に依存して直接テストしづらいので、
		// その内部で使っているfilter_mapの組み立て方だけをここで固定する
		let dir = std::env::temp_dir().join(format!("sn_tauri_test_filter_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = false";
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "InstalledGame", &asar_bytes);

		let configs = vec![
			app_cfg("NotInstalledGame", vec!["abc"]),
			app_cfg("InstalledGame", vec![&checksum::checksum_hex(content)]),
		];

		let cards: Vec<CardDto> = configs
			.iter()
			.filter_map(|cfg| build_card(cfg, detect::Platform::Mac, &dir, &[], None))
			.collect();

		assert_eq!(cards.len(), 1);
		assert_eq!(cards[0].app_name, "InstalledGame");
		fs::remove_dir_all(&dir).unwrap();
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.setup(|app| {
			if cfg!(debug_assertions) {
				app.handle().plugin(
					tauri_plugin_log::Builder::default()
						.level(log::LevelFilter::Info)
						.build(),
				)?;
			}
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			self_check,
			list_apps,
			trigger_update,
			watch_install,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
