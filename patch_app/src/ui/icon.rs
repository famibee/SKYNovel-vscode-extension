// アイコン（PNGバイト列）をeguiのテクスチャに変換する。
// egui_extras の image loader は使わず、eframeが既に依存に持つ image crate
// （features=["png"]）で自前デコードする（legacy-app-patch.md「追加クレート最小限」方針）。

use eframe::egui;

#[derive(Debug)]
pub enum IconError {
	Decode(image::ImageError),
	SizeMismatch,
}

impl std::fmt::Display for IconError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			IconError::Decode(e) => write!(f, "PNGデコードに失敗: {e}"),
			IconError::SizeMismatch => write!(f, "画像サイズとピクセルデータの長さが一致しない"),
		}
	}
}

/// PNGバイト列からegui::ColorImageを作る。
/// ColorImage::from_rgba_unmultiplied はサイズ不一致でpanicする実装のため、
/// 事前にチェックして呼び出し側へErrで返す（壊れたアイコン1枚でランチャー全体が
/// 落ちないようにする。panic="unwind"にした判断と対になる防御）
pub fn color_image_from_png(bytes: &[u8]) -> Result<egui::ColorImage, IconError> {
	let img = image::load_from_memory_with_format(bytes, image::ImageFormat::Png)
		.map_err(IconError::Decode)?
		.to_rgba8();
	let (w, h) = img.dimensions();
	let raw = img.as_raw();
	if (w as usize) * (h as usize) * 4 != raw.len() {
		return Err(IconError::SizeMismatch);
	}
	Ok(egui::ColorImage::from_rgba_unmultiplied([w as usize, h as usize], raw))
}

#[cfg(test)]
mod tests {
	use super::*;

	const DUMMY_ICON: &[u8] = include_bytes!("../../assets/dummy_icon.png");

	#[test]
	fn color_image_from_png_decodes_valid_png() {
		let img = color_image_from_png(DUMMY_ICON).expect("デコードできるはず");
		assert_eq!(img.size, [32, 32]);
	}

	#[test]
	fn color_image_from_png_rejects_garbage_bytes() {
		let result = color_image_from_png(b"not a png");
		assert!(matches!(result, Err(IconError::Decode(_))));
	}
}
