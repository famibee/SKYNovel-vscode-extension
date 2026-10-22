// カード1枚分の状態と、それをどう見せるか（文言・ボタン）を決める純粋関数。
// UIの描画コード（egui）から独立させ、ロジックだけをテストできるようにする
// （legacy-app-patch.md の「判定ロジックをUIに溶かさない」方針）。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CardStatus {
	/// インストール済みバージョンが最新（checksumLatest一致・arch一致）
	UpToDate,
	/// 更新あり（チェックサム不一致）
	UpdateAvailable,
	/// チェックサムは一致するがarchが噛み合わない（Rosetta終了対応等）
	ArchMismatch,
	/// 自動検出（setting.sn抽出）に失敗。購入者に当時のインストーラーを選んでもらう必要がある
	NeedsConfirmation,
	/// 遠隔マニフェストの取得に失敗した（オフライン・404等）
	CheckFailed,
}

#[derive(Debug, Clone)]
pub struct CardState {
	pub app_name: String,
	pub display_name: String,
	pub status: CardStatus,
	pub installed_version: Option<String>,
	pub latest_version: Option<String>,
	/// 0.0〜1.0。Noneはダウンロード中でない（不確定表示にしたい時は別途扱う）
	pub progress: Option<f32>,
	pub icon_png: Option<&'static [u8]>,
}

/// カードの状態説明（1行）。downloadUrlは一切含めない
/// （確立した方針：購入者チェックを経ていない第三者への転送を防ぐため）
pub fn status_text(state: &CardState) -> String {
	match state.status {
		CardStatus::UpToDate => "✓ 最新です".to_string(),
		CardStatus::UpdateAvailable => match (&state.installed_version, &state.latest_version) {
			(Some(cur), Some(latest)) => format!("{cur} → {latest}"),
			(None, Some(latest)) => format!("更新があります（{latest}）"),
			_ => "更新があります".to_string(),
		},
		CardStatus::ArchMismatch => "お使いの環境向けの版に切り替えが必要です".to_string(),
		CardStatus::NeedsConfirmation => "購入時のインストーラーでご確認ください".to_string(),
		CardStatus::CheckFailed => "更新を確認できませんでした".to_string(),
	}
}

/// ボタンのラベルと有効/無効。Noneはボタンを出さない（最新版など）
pub fn button_spec(state: &CardState) -> Option<(&'static str, bool)> {
	if state.progress.is_some() {
		return Some(("ダウンロード中…", false));
	}
	match state.status {
		CardStatus::UpToDate => None,
		CardStatus::UpdateAvailable | CardStatus::ArchMismatch => Some(("更新をダウンロード", true)),
		CardStatus::NeedsConfirmation => Some(("当時のインストーラーを選ぶ", true)),
		CardStatus::CheckFailed => Some(("再試行", true)),
	}
}

/// アイコンが無い／デコードに失敗した場合のプレースホルダ文字（頭文字1字）
pub fn fallback_initial(display_name: &str) -> String {
	display_name.chars().next().map(|c| c.to_string()).unwrap_or_else(|| "?".to_string())
}

#[cfg(test)]
mod tests {
	use super::*;

	fn base_state(status: CardStatus) -> CardState {
		CardState {
			app_name: "MyGame".to_string(),
			display_name: "マイゲーム".to_string(),
			status,
			installed_version: None,
			latest_version: None,
			progress: None,
			icon_png: None,
		}
	}

	#[test]
	fn status_text_up_to_date_has_no_version_numbers() {
		let s = base_state(CardStatus::UpToDate);
		assert_eq!(status_text(&s), "✓ 最新です");
	}

	#[test]
	fn status_text_update_available_shows_both_versions_when_known() {
		let mut s = base_state(CardStatus::UpdateAvailable);
		s.installed_version = Some("1.2.0".to_string());
		s.latest_version = Some("1.3.0".to_string());
		assert_eq!(status_text(&s), "1.2.0 → 1.3.0");
	}

	#[test]
	fn status_text_update_available_without_installed_version_still_shows_latest() {
		let mut s = base_state(CardStatus::UpdateAvailable);
		s.latest_version = Some("2.0.0".to_string());
		assert_eq!(status_text(&s), "更新があります（2.0.0）");
	}

	#[test]
	fn button_spec_up_to_date_has_no_button() {
		let s = base_state(CardStatus::UpToDate);
		assert_eq!(button_spec(&s), None);
	}

	#[test]
	fn button_spec_update_available_is_enabled() {
		let s = base_state(CardStatus::UpdateAvailable);
		assert_eq!(button_spec(&s), Some(("更新をダウンロード", true)));
	}

	#[test]
	fn button_spec_while_downloading_is_disabled_regardless_of_status() {
		let mut s = base_state(CardStatus::UpdateAvailable);
		s.progress = Some(0.42);
		assert_eq!(button_spec(&s), Some(("ダウンロード中…", false)));
	}

	#[test]
	fn button_spec_needs_confirmation_prompts_installer_pick() {
		let s = base_state(CardStatus::NeedsConfirmation);
		assert_eq!(button_spec(&s), Some(("当時のインストーラーを選ぶ", true)));
	}

	#[test]
	fn button_spec_check_failed_offers_retry() {
		let s = base_state(CardStatus::CheckFailed);
		assert_eq!(button_spec(&s), Some(("再試行", true)));
	}

	#[test]
	fn fallback_initial_takes_first_character() {
		assert_eq!(fallback_initial("マイゲーム"), "マ");
		assert_eq!(fallback_initial("Game"), "G");
		assert_eq!(fallback_initial(""), "?");
	}

	//MARK: downloadUrlを画面に出さない方針をテストで固定する
	// （legacy-app-patch.md「ダウンロードは既定ブラウザに委ねない」節の確立した判断）

	#[test]
	fn status_text_and_button_labels_never_contain_url_like_strings() {
		for status in [
			CardStatus::UpToDate,
			CardStatus::UpdateAvailable,
			CardStatus::ArchMismatch,
			CardStatus::NeedsConfirmation,
			CardStatus::CheckFailed,
		] {
			let mut s = base_state(status);
			s.installed_version = Some("1.0.0".to_string());
			s.latest_version = Some("2.0.0".to_string());
			let text = status_text(&s);
			assert!(!text.contains("http"), "status_text leaked a URL-like string: {text}");
			if let Some((label, _)) = button_spec(&s) {
				assert!(!label.contains("http"), "button label leaked a URL-like string: {label}");
			}
		}
	}
}
