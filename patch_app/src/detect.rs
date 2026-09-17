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
// mac・windows とも実機調査済み（legacy-app-patch.md「旧アプリ内の暗号化済み setting.sn の
// 実際のパス特定」「Windows実機でのビルド・asar抽出」参照。windowsは2026-09-17に確認）。
pub fn asar_path_for_install(install_path: &Path, platform: Platform) -> Option<PathBuf> {
	match platform {
		Platform::Mac => Some(install_path.join("Contents/Resources/app.asar")),
		Platform::Windows => Some(install_path.join("resources/app.asar")),
		Platform::Other => None,
	}
}

//MARK: インストール済みバイナリのarch判定
//
// macOS 27 "Golden Gate"（2026-09-14リリース）を最後にRosetta 2の一般アプリ向け
// サポートが終わる見込みとなり（legacy-app-patch.md 詰められていない仕様#9）、
// 「バージョンは同じだがarchだけ新しくなった配布物」を旧x64購入者に正しく
// 案内する必要が出てきた。setting.snのチェックサム一致だけでは判定できないため、
// インストール済み実行ファイル自体のヘッダを読んでarchを判定する。
// レジストリやOS APIには依存せず、ファイルのバイト列だけで完結させる
// （TS側のCLIと同じくfsのみで動く、というこのモジュール全体の方針に合わせる）。

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Arch { X64, Ia32, Arm64, Universal, Unknown }

// electron-builder既定レイアウトでの実行ファイル本体のパスを推測する。
// mac: Contents/MacOS/ 配下に1つだけ置かれる（Info.plistのCFBundleExecutableと同名だが、
// 内部からInfo.plistを読まずとも「配下で唯一のファイル」で足りる）。
// windows: インストール先直下の `{appName}.exe`（electron-builderの慣例）
pub fn installed_binary_path(install_path: &Path, platform: Platform, app_name: &str) -> Option<PathBuf> {
	match platform {
		Platform::Mac => {
			let macos_dir = install_path.join("Contents/MacOS");
			std::fs::read_dir(&macos_dir).ok()?
				.filter_map(|e| e.ok())
				.map(|e| e.path())
				.find(|p| p.is_file())
		}
		Platform::Windows => {
			let p = install_path.join(format!("{app_name}.exe"));
			if p.exists() { Some(p) } else { None }
		}
		Platform::Other => None,
	}
}

// PEヘッダの Machine フィールド（DOSヘッダ0x3cのe_lfanewでPEヘッダ位置を得て+4バイト先の2バイト）
fn arch_from_pe(bytes: &[u8]) -> Option<Arch> {
	if bytes.len() < 0x40 || &bytes[0..2] != b"MZ" { return None; }
	let pe_offset = u32::from_le_bytes(bytes[0x3c..0x40].try_into().ok()?) as usize;
	if bytes.len() < pe_offset + 6 || &bytes[pe_offset..pe_offset + 4] != b"PE\0\0" { return None; }
	let machine = u16::from_le_bytes(bytes[pe_offset + 4..pe_offset + 6].try_into().ok()?);
	Some(match machine {
		0x8664 => Arch::X64,		// IMAGE_FILE_MACHINE_AMD64
		0x014c => Arch::Ia32,		// IMAGE_FILE_MACHINE_I386
		0xaa64 => Arch::Arm64,		// IMAGE_FILE_MACHINE_ARM64
		_ => Arch::Unknown,
	})
}

// Mach-Oヘッダのcputype判定。fat/universal（先頭4バイトがビッグエンディアンでFAT_MAGIC系）は
// 複数arch同梱なのでUniversal扱い。単体Mach-Oはmagicがホストのネイティブ表現（＝常にLE。
// macOSはIntel/Apple Siliconとも常にLE）で書かれるためLEで読む
fn arch_from_macho(bytes: &[u8]) -> Option<Arch> {
	if bytes.len() < 8 { return None; }
	let magic_be = u32::from_be_bytes(bytes[0..4].try_into().ok()?);
	if magic_be == 0xcafebabe || magic_be == 0xcafebabf { return Some(Arch::Universal); }	// FAT_MAGIC/FAT_MAGIC_64

	let magic_le = u32::from_le_bytes(bytes[0..4].try_into().ok()?);
	if magic_le == 0xfeedface || magic_le == 0xfeedfacf {	// MH_MAGIC/MH_MAGIC_64
		let cputype = i32::from_le_bytes(bytes[4..8].try_into().ok()?);
		return Some(match cputype {
			0x0100_0007 => Arch::X64,	// CPU_TYPE_X86_64
			0x0100_000c => Arch::Arm64,	// CPU_TYPE_ARM64
			_ => Arch::Unknown,
		});
	}
	None
}

pub fn detect_installed_arch(install_path: &Path, platform: Platform, app_name: &str) -> Option<Arch> {
	let bin_path = installed_binary_path(install_path, platform, app_name)?;
	let bytes = std::fs::read(&bin_path).ok()?;
	match platform {
		Platform::Windows => arch_from_pe(&bytes),
		Platform::Mac => arch_from_macho(&bytes),
		Platform::Other => None,
	}
}

// 配布予定の最新版arch文字列（genLegacyPatch.tsがelectron-builderの
// artifactName規約 "${name}-${version}-${arch}.${ext}" から抽出したもの。
// "x64"|"ia32"|"arm64"|"universal"のいずれか、または未指定なら空文字列）と、
// インストール済みバイナリの実archが噛み合うかを判定する。
// - installed が Universal なら常に噛み合う（1本でどのarchでも動くため）
// - latest_arch が "universal" なら常に噛み合う（配布側がuniversalなので互換性の心配が無い）
// - 空文字列・未知の文字列は「判定不能」として噛み合う扱いにする（後方互換：
//   genLegacyPatch.tsがarchを渡さない場合は従来通りの動作に留める）
pub fn arch_matches(latest_arch: &str, installed: Arch) -> bool {
	if installed == Arch::Universal { return true; }
	match latest_arch.to_lowercase().as_str() {
		"x64" => installed == Arch::X64,
		"ia32" => installed == Arch::Ia32,
		"arm64" => installed == Arch::Arm64,
		_ => true,
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

	//MARK: arch判定

	fn pe_bytes(machine: u16) -> Vec<u8> {
		// 最小限のDOSヘッダ＋PEヘッダ（Machineフィールドのみ意味を持たせる）
		let mut b = vec![0u8; 0x40];
		b[0] = b'M'; b[1] = b'Z';
		b[0x3c..0x40].copy_from_slice(&(0x40u32).to_le_bytes());	// e_lfanew = 0x40（PEヘッダはこの直後）
		b.extend_from_slice(b"PE\0\0");
		b.extend_from_slice(&machine.to_le_bytes());
		b
	}

	#[test]
	fn arch_from_pe_reads_machine_field() {
		assert_eq!(arch_from_pe(&pe_bytes(0x8664)), Some(Arch::X64));
		assert_eq!(arch_from_pe(&pe_bytes(0x014c)), Some(Arch::Ia32));
		assert_eq!(arch_from_pe(&pe_bytes(0xaa64)), Some(Arch::Arm64));
		assert_eq!(arch_from_pe(b"not a pe file"), None);
	}

	fn macho_bytes(magic_le: u32, cputype: i32) -> Vec<u8> {
		let mut b = Vec::new();
		b.extend_from_slice(&magic_le.to_le_bytes());
		b.extend_from_slice(&cputype.to_le_bytes());
		b
	}

	#[test]
	fn arch_from_macho_reads_cputype() {
		assert_eq!(arch_from_macho(&macho_bytes(0xfeedfacf, 0x0100_0007)), Some(Arch::X64));
		assert_eq!(arch_from_macho(&macho_bytes(0xfeedfacf, 0x0100_000c)), Some(Arch::Arm64));
	}

	#[test]
	fn arch_from_macho_detects_universal_fat_binary() {
		// FAT_MAGIC はビッグエンディアンで格納される（8バイト未満だと判定前に弾かれるため
		// nfat_arch相当のダミー4バイトを続ける）
		let mut bytes = 0xcafebabeu32.to_be_bytes().to_vec();
		bytes.extend_from_slice(&[0u8; 4]);
		assert_eq!(arch_from_macho(&bytes), Some(Arch::Universal));
	}

	#[test]
	fn arch_matches_universal_installed_always_matches() {
		assert!(arch_matches("x64", Arch::Universal));
		assert!(arch_matches("arm64", Arch::Universal));
	}

	#[test]
	fn arch_matches_requires_exact_arch_when_specified() {
		assert!(arch_matches("arm64", Arch::Arm64));
		assert!(!arch_matches("arm64", Arch::X64));
		assert!(!arch_matches("x64", Arch::Arm64));
	}

	#[test]
	fn arch_matches_treats_unspecified_as_always_matching() {
		// genLegacyPatch.tsがarchを渡さない場合（latest_archが空）は従来通りの動作にする
		assert!(arch_matches("", Arch::X64));
		assert!(arch_matches("", Arch::Arm64));
	}
}
