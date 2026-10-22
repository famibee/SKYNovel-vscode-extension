// ローカル検査（ネットワークに触らない部分）。process_app()の①自動検出パスを
// ランチャーUIのワーカースレッドから呼べる形に切り出したもの。
// ダウンロード・インストーラー選択ダイアログ（②フォールバックの実行そのもの）は
// ここには含めない（UI側がボタン押下に応じて別途呼ぶ。実装順序4の時点では未配線）。

use crate::{asar, checksum, detect, footer};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LocalState {
	/// 旧版が見つからない（カードを出さない対象）
	NotInstalled,
	/// 自動検出（setting.sn抽出＋チェックサム一致）に成功した
	Installed { checksum: String, arch: Option<detect::Arch> },
	/// 自動検出には失敗したが、インストーラー本体チェックサムによる
	/// フォールバック（②）が使える＝購入者に当時のインストーラーを選んでもらえば判定できる
	NeedsConfirmation,
}

pub fn inspect_local(
	cfg: &footer::AppConfig,
	platform: detect::Platform,
	mac_apps_dir: &Path,
	win_dirs: &[PathBuf],
) -> LocalState {
	let Some(install_path) = detect::find_installed_app(&cfg.app_name, platform, mac_apps_dir, win_dirs) else {
		return LocalState::NotInstalled;
	};

	let method1 = (|| -> Option<(String, Option<detect::Arch>)> {
		let asar_path = detect::asar_path_for_install(&install_path, platform)?;
		let setting_sn = asar::extract_by_basename(&asar_path, &cfg.setting_sn_file_name).ok()?;
		if !checksum::matches_any_known_checksum(&setting_sn, &cfg.checksum_setting) {
			return None;
		}
		let hash = checksum::checksum_hex(&setting_sn);
		let arch = detect::detect_installed_arch(&install_path, platform, &cfg.app_name);
		Some((hash, arch))
	})();

	match method1 {
		Some((checksum, arch)) => LocalState::Installed { checksum, arch },
		None => {
			if cfg.checksum_installer.is_empty() {
				// 旧版らしきフォルダはあるが、購入者チェックの材料（インストーラー本体の
				// チェックサム）も無い＝これ以上は判定できない。カードを出さない
				LocalState::NotInstalled
			} else {
				LocalState::NeedsConfirmation
			}
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;

	fn app_cfg(app_name: &str, checksum_setting: Vec<&str>, checksum_installer: Vec<&str>) -> footer::AppConfig {
		footer::AppConfig {
			app_name: app_name.to_string(),
			checksum_setting: checksum_setting.into_iter().map(String::from).collect(),
			checksum_installer: checksum_installer.into_iter().map(String::from).collect(),
			checksum_latest: String::new(),
			latest_arch: String::new(),
			setting_sn_file_name: "setting.sn".to_string(),
			download_url: "https://example.com/x".to_string(),
		}
	}

	fn setup_installed_app(root: &Path, app_name: &str, asar_bytes: &[u8]) {
		let resources = root.join(format!("{app_name}.app")).join("Contents/Resources");
		fs::create_dir_all(&resources).unwrap();
		fs::write(resources.join("app.asar"), asar_bytes).unwrap();
	}

	#[test]
	fn not_installed_when_app_dir_is_absent() {
		let dir = std::env::temp_dir().join(format!("sn_inspect_test_notfound_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let cfg = app_cfg("NoSuchGame", vec!["abc"], vec![]);
		let result = inspect_local(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, LocalState::NotInstalled);
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn installed_when_checksum_matches() {
		let dir = std::env::temp_dir().join(format!("sn_inspect_test_installed_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = false";
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar_bytes);

		let known = checksum::checksum_hex(content);
		let cfg = app_cfg("MyGame", vec![&known], vec![]);
		let result = inspect_local(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, LocalState::Installed { checksum: known, arch: None });
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn needs_confirmation_when_checksum_mismatches_but_installer_fallback_available() {
		let dir = std::env::temp_dir().join(format!("sn_inspect_test_needsconfirm_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = true";	// 体験版扱いの中身（既知チェックサムと不一致）
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar_bytes);

		let known = checksum::checksum_hex(b"&const.experiment = false");
		let cfg = app_cfg("MyGame", vec![&known], vec!["installer-checksum"]);
		let result = inspect_local(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, LocalState::NeedsConfirmation);
		fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn not_installed_when_checksum_mismatches_and_no_installer_fallback() {
		let dir = std::env::temp_dir().join(format!("sn_inspect_test_nofallback_{}", std::process::id()));
		fs::create_dir_all(&dir).unwrap();

		let content = b"&const.experiment = true";
		let header = format!(r#"{{"files":{{"setting.sn":{{"size":{},"offset":"0"}}}}}}"#, content.len());
		let asar_bytes = asar::build_fake_asar(&header, content);
		setup_installed_app(&dir, "MyGame", &asar_bytes);

		let known = checksum::checksum_hex(b"&const.experiment = false");
		let cfg = app_cfg("MyGame", vec![&known], vec![]);	// checksum_installerが空
		let result = inspect_local(&cfg, detect::Platform::Mac, &dir, &[]);

		assert_eq!(result, LocalState::NotInstalled);
		fs::remove_dir_all(&dir).unwrap();
	}
}
