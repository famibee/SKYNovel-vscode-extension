pub mod card;
pub mod icon;

use eframe::egui;
use std::collections::HashMap;

pub use card::{button_spec, fallback_initial, status_text, CardState, CardStatus};

/// ランチャー本体。この段階（実装順序3）ではダミーデータを描画するだけで、
/// 実際のローカル検査・マニフェスト取得・ダウンロードは後続ステップで繋ぐ
pub struct LauncherApp {
	cards: Vec<CardState>,
	/// app_name をキーに、初回描画時に読み込んだテクスチャを保持する
	textures: HashMap<String, egui::TextureHandle>,
}

impl LauncherApp {
	pub fn new() -> Self {
		Self { cards: dummy_cards(), textures: HashMap::new() }
	}

	fn texture_for(&mut self, ctx: &egui::Context, state: &CardState) -> Option<&egui::TextureHandle> {
		if !self.textures.contains_key(&state.app_name) {
			let bytes = state.icon_png?;
			let image = icon::color_image_from_png(bytes).ok()?;
			let handle = ctx.load_texture(&state.app_name, image, egui::TextureOptions::LINEAR);
			self.textures.insert(state.app_name.clone(), handle);
		}
		self.textures.get(&state.app_name)
	}

	fn draw_card(&mut self, ctx: &egui::Context, ui: &mut egui::Ui, idx: usize) {
		let state = self.cards[idx].clone();
		let texture = self.texture_for(ctx, &state).cloned();

		egui::Frame::group(ui.style()).show(ui, |ui| {
			ui.horizontal(|ui| {
				// 左：アイコン（64x64）。デコードできなければ頭文字のプレースホルダ
				let icon_size = egui::vec2(64.0, 64.0);
				match texture {
					Some(tex) => {
						ui.add(egui::Image::new(&tex).fit_to_exact_size(icon_size));
					}
					None => {
						let (rect, _) = ui.allocate_exact_size(icon_size, egui::Sense::hover());
						ui.painter().rect_filled(rect, 8.0, ui.visuals().widgets.inactive.bg_fill);
						ui.painter().text(
							rect.center(),
							egui::Align2::CENTER_CENTER,
							fallback_initial(&state.display_name),
							egui::FontId::proportional(24.0),
							ui.visuals().text_color(),
						);
					}
				}

				// 中央：タイトル・状態
				ui.vertical(|ui| {
					ui.heading(&state.display_name);
					ui.label(status_text(&state));
					if let Some(p) = state.progress {
						ui.add(egui::widgets::ProgressBar::new(p).show_percentage());
					}
				});

				// 右：ボタン（余白で右寄せ）
				ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
					if let Some((label, enabled)) = button_spec(&state) {
						ui.add_enabled(enabled, egui::Button::new(label));
					}
				});
			});
		});
		ui.add_space(8.0);
	}
}

impl Default for LauncherApp {
	fn default() -> Self {
		Self::new()
	}
}

impl eframe::App for LauncherApp {
	fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
		let ctx = ui.ctx().clone();
		ui.heading("アップデートのご案内");
		ui.separator();
		if self.cards.is_empty() {
			ui.label("対象のアプリが見つかりませんでした。");
			return;
		}
		egui::ScrollArea::vertical().show(ui, |ui| {
			for idx in 0..self.cards.len() {
				self.draw_card(&ctx, ui, idx);
			}
		});
	}
}

fn dummy_cards() -> Vec<CardState> {
	const DUMMY_ICON: &[u8] = include_bytes!("../../assets/dummy_icon.png");
	vec![
		CardState {
			app_name: "GameA".to_string(),
			display_name: "ゲームA".to_string(),
			status: CardStatus::UpdateAvailable,
			installed_version: Some("1.2.0".to_string()),
			latest_version: Some("1.3.0".to_string()),
			progress: None,
			icon_png: Some(DUMMY_ICON),
		},
		CardState {
			app_name: "GameB".to_string(),
			display_name: "ゲームB".to_string(),
			status: CardStatus::UpToDate,
			installed_version: Some("2.0.1".to_string()),
			latest_version: Some("2.0.1".to_string()),
			progress: None,
			icon_png: None,
		},
		CardState {
			app_name: "GameC".to_string(),
			display_name: "ゲームC".to_string(),
			status: CardStatus::NeedsConfirmation,
			installed_version: None,
			latest_version: None,
			progress: None,
			icon_png: None,
		},
		CardState {
			app_name: "GameD".to_string(),
			display_name: "ゲームD".to_string(),
			status: CardStatus::UpdateAvailable,
			installed_version: Some("3.0.0".to_string()),
			latest_version: Some("3.1.0".to_string()),
			progress: Some(0.42),
			icon_png: None,
		},
		CardState {
			app_name: "GameE".to_string(),
			display_name: "ゲームE".to_string(),
			status: CardStatus::CheckFailed,
			installed_version: None,
			latest_version: None,
			progress: None,
			icon_png: None,
		},
	]
}
