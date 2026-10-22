// 配布パッチアプリ本体。artcraft-launcher風のカード表示ランチャーUI（2026-10-22〜）。
// 判定ロジックは sn_legacy_patch_core（src/lib.rs）に、UI層は src/ui/ に分離してある。
// 設計は sn_extension の src/docs/legacy-app-patch.md 参照。
//
// この段階（実装順序3・★チェックポイント）ではダミーデータでカードUIを描画するのみ。
// 実際のローカル検査・マニフェスト・DL・インストール検知は後続ステップで繋ぐ。

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ui;

use eframe::egui;
use ui::LauncherApp;

fn main() -> eframe::Result {
	let options = eframe::NativeOptions {
		viewport: egui::ViewportBuilder::default()
			.with_title("アップデートのご案内")
			.with_inner_size([760.0, 560.0])
			.with_min_inner_size([520.0, 360.0]),
		renderer: eframe::Renderer::Glow,
		..Default::default()
	};

	eframe::run_native(
		"sn_legacy_patch",
		options,
		Box::new(|_cc| Ok(Box::new(LauncherApp::new()))),
	)
}
