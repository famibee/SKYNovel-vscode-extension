// 案A：インストール済みアプリの検出。
// sn_extension 側の src/LegacyAppCheck.ts の candidateInstallPaths() / detectInstalledApp() の移植。
// レジストリは見ない。実在確認だけ（fs のみ）。

use std::path::{Path, PathBuf};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Platform {
	Mac,
	Windows,
	Other,
}

// 実行ホストの OS。パッチアプリは対象 OS 向けに個別ビルドするので、実行時は常にこれで決まる
// （TS 版と違い、テストのために差し替える理由が無い。テストは各分岐を明示的に呼んで確かめる）
pub fn host_platform() -> Platform {
	if cfg!(target_os = "macos") { Platform::Mac }
	else if cfg!(target_os = "windows") { Platform::Windows }
	else { Platform::Other }
}

pub fn win_install_base_dirs_from_env() -> Vec<PathBuf> {
	let mut dirs = Vec::new();
	if let Ok(v) = std::env::var("ProgramFiles") { dirs.push(PathBuf::from(v)); }
	if let Ok(v) = std::env::var("ProgramFiles(x86)") { dirs.push(PathBuf::from(v)); }
	if let Ok(v) = std::env::var("LOCALAPPDATA") { dirs.push(PathBuf::from(v).join("Programs")); }
	dirs
}

pub fn candidate_install_paths(
	app_name: &str,
	platform: Platform,
	mac_applications_dir: &Path,
	win_install_base_dirs: &[PathBuf],
) -> Vec<PathBuf> {
	match platform {
		Platform::Mac => vec![mac_applications_dir.join(format!("{app_name}.app"))],
		Platform::Windows => win_install_base_dirs.iter().map(|base| base.join(app_name)).collect(),
		Platform::Other => vec![],	// 配布対象外
	}
}

pub fn detect_installed_app(
	app_name: &str,
	platform: Platform,
	mac_applications_dir: &Path,
	win_install_base_dirs: &[PathBuf],
) -> bool {
	find_installed_app(app_name, platform, mac_applications_dir, win_install_base_dirs).is_some()
}

// 実在する候補パスのうち最初の1件を返す（asar 抽出のため、真偽値だけでなくパス自体が要る）
pub fn find_installed_app(
	app_name: &str,
	platform: Platform,
	mac_applications_dir: &Path,
	win_install_base_dirs: &[PathBuf],
) -> Option<PathBuf> {
	candidate_install_paths(app_name, platform, mac_applications_dir, win_install_base_dirs)
		.into_iter()
		.find(|p| p.exists())
}

// electron-builder の既定レイアウトから app.asar のパスを推測する。
// mac は実機調査済み（legacy-app-patch.md「旧アプリ内の暗号化済み setting.sn の実際のパス特定」参照）。
// ⚠️ windows は既定値からの推測のみで未検証（同ドキュメント残件参照）
pub fn asar_path_for_install(install_path: &Path, platform: Platform) -> Option<PathBuf> {
	match platform {
		Platform::Mac => Some(install_path.join("Contents/Resources/app.asar")),
		Platform::Windows => Some(install_path.join("resources/app.asar")),
		Platform::Other => None,
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn candidate_paths_mac_is_single_applications_entry() {
		let paths = candidate_install_paths("MyGame", Platform::Mac, Path::new("/Applications"), &[]);
		assert_eq!(paths, vec![PathBuf::from("/Applications/MyGame.app")]);
	}

	#[test]
	fn candidate_paths_windows_maps_each_base_dir() {
		let bases = vec![PathBuf::from("C:/Program Files"), PathBuf::from("C:/Users/u/AppData/Local/Programs")];
		let paths = candidate_install_paths("MyGame", Platform::Windows, Path::new("/Applications"), &bases);
		assert_eq!(paths, vec![
			PathBuf::from("C:/Program Files/MyGame"),
			PathBuf::from("C:/Users/u/AppData/Local/Programs/MyGame"),
		]);
	}

	#[test]
	fn candidate_paths_other_platform_is_empty() {
		assert!(candidate_install_paths("MyGame", Platform::Other, Path::new("/Applications"), &[]).is_empty());
	}

	#[test]
	fn detect_installed_app_finds_existing_dir() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_{}", std::process::id()));
		std::fs::create_dir_all(dir.join("MyGame.app")).unwrap();

		assert!(detect_installed_app("MyGame", Platform::Mac, &dir, &[]));
		assert!(!detect_installed_app("NoSuchGame", Platform::Mac, &dir, &[]));

		std::fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn find_installed_app_returns_the_matching_path() {
		let dir = std::env::temp_dir().join(format!("sn_legacy_patch_test_find_{}", std::process::id()));
		std::fs::create_dir_all(dir.join("MyGame.app")).unwrap();

		assert_eq!(
			find_installed_app("MyGame", Platform::Mac, &dir, &[]),
			Some(dir.join("MyGame.app")),
		);
		assert_eq!(find_installed_app("NoSuchGame", Platform::Mac, &dir, &[]), None);

		std::fs::remove_dir_all(&dir).unwrap();
	}

	#[test]
	fn asar_path_for_install_uses_electron_builder_default_layout() {
		assert_eq!(
			asar_path_for_install(Path::new("/Applications/MyGame.app"), Platform::Mac),
			Some(PathBuf::from("/Applications/MyGame.app/Contents/Resources/app.asar")),
		);
		assert_eq!(
			asar_path_for_install(Path::new("C:/Program Files/MyGame"), Platform::Windows),
			Some(PathBuf::from("C:/Program Files/MyGame/resources/app.asar")),
		);
		assert_eq!(asar_path_for_install(Path::new("/x"), Platform::Other), None);
	}
}
