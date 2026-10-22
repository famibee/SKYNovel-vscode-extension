// カード1枚の状態を、ローカル検査結果（sn_legacy_patch_core::inspect::LocalState）と
// 遠隔マニフェストのプラットフォーム別エントリから決める純粋関数。
// 表示文言・ボタンラベルはフロント側（ui/app.js のSTATUS_LABEL/ACTION_LABEL）が持つので、
// ここでは状態の分類だけを返す。各バリアント名はそれらのマップのキーと一字一句揃えてある
// （src/docs/legacy-app-patch.md「カードの状態遷移」参照）。

use crate::manifest::ManifestOsEntry;
use sn_legacy_patch_core::detect;
use sn_legacy_patch_core::inspect::LocalState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
pub enum CardStatus {
	#[serde(rename = "upToDate")]
	UpToDate,
	#[serde(rename = "updateAvailable")]
	UpdateAvailable,
	#[serde(rename = "archMigration")]
	ArchMismatch,
	#[serde(rename = "needsConfirm")]
	NeedsConfirmation,
	#[serde(rename = "manifestError")]
	CheckFailed,
}

/// local が NotInstalled のカードは呼び出し側で作らない（一覧に出さない）前提。
pub fn decide_status(local: &LocalState, manifest_entry: Option<&ManifestOsEntry>) -> CardStatus {
	match local {
		LocalState::NotInstalled => CardStatus::CheckFailed,	// 呼ばれない想定だが、保守的にフォールバックする
		LocalState::NeedsConfirmation => CardStatus::NeedsConfirmation,
		LocalState::Installed { checksum, arch } => {
			let Some(entry) = manifest_entry else {
				return CardStatus::CheckFailed;
			};
			if entry.checksum_latest.is_empty() || entry.checksum_latest.to_lowercase() != checksum.to_lowercase() {
				return CardStatus::UpdateAvailable;
			}
			let arch_ok = match arch {
				Some(a) => detect::arch_matches(&entry.latest_arch, *a),
				None => true,
			};
			if arch_ok { CardStatus::UpToDate } else { CardStatus::ArchMismatch }
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use detect::Arch;

	fn entry(checksum_latest: &str, latest_arch: &str) -> ManifestOsEntry {
		ManifestOsEntry {
			download_url: "https://example.com/x".to_string(),
			checksum_latest: checksum_latest.to_string(),
			latest_arch: latest_arch.to_string(),
		}
	}

	#[test]
	fn needs_confirmation_is_independent_of_manifest() {
		assert_eq!(decide_status(&LocalState::NeedsConfirmation, None), CardStatus::NeedsConfirmation);
		assert_eq!(decide_status(&LocalState::NeedsConfirmation, Some(&entry("abc", ""))), CardStatus::NeedsConfirmation);
	}

	#[test]
	fn installed_without_manifest_is_check_failed() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: None };
		assert_eq!(decide_status(&local, None), CardStatus::CheckFailed);
	}

	#[test]
	fn installed_with_matching_checksum_case_insensitive_is_up_to_date() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: None };
		assert_eq!(decide_status(&local, Some(&entry("ABC", ""))), CardStatus::UpToDate);
	}

	#[test]
	fn installed_with_mismatched_checksum_is_update_available() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: None };
		assert_eq!(decide_status(&local, Some(&entry("xyz", ""))), CardStatus::UpdateAvailable);
	}

	#[test]
	fn installed_with_matching_checksum_but_different_arch_is_arch_migration() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: Some(Arch::X64) };
		assert_eq!(decide_status(&local, Some(&entry("abc", "arm64"))), CardStatus::ArchMismatch);
	}

	#[test]
	fn installed_with_matching_checksum_and_matching_arch_is_up_to_date() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: Some(Arch::Arm64) };
		assert_eq!(decide_status(&local, Some(&entry("abc", "arm64"))), CardStatus::UpToDate);
	}

	#[test]
	fn installed_with_empty_checksum_latest_is_update_available() {
		// マニフェスト側がまだ最新情報を持っていない場合（通常は起こらない想定だが、
		// 安全側＝「最新です」と誤表示しない方向に倒す）
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: None };
		assert_eq!(decide_status(&local, Some(&entry("", ""))), CardStatus::UpdateAvailable);
	}

	#[test]
	fn installed_with_universal_binary_always_matches_arch() {
		let local = LocalState::Installed { checksum: "abc".to_string(), arch: Some(Arch::Universal) };
		assert_eq!(decide_status(&local, Some(&entry("abc", "x64"))), CardStatus::UpToDate);
	}
}
