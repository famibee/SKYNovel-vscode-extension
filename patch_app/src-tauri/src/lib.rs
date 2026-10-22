// 配布パッチアプリ本体（Tauri v2）。2026-10-22、eguiから乗り換え。
// 設計は sn_extension の src/docs/legacy-app-patch.md 参照。
//
// この段階（実装順序1・2のスパイク）では最小構成のみ：
// - Tauriアプリとして起動できるか（スパイク①）
// - 自分自身の実行ファイルの末尾にappendPatchFooter()で追記したJSONを、
//   Tauriビルドの実行ファイルに対しても読み戻せるか（スパイク②。最大の技術リスク）
// をまとめて確認する。カードUI・マニフェスト等は後続ステップで追加する。

use sn_legacy_patch_core::footer;

// スパイク②の検証用コマンド。自分自身を読み、末尾のフッタJSONを取り出せるかどうかを
// 文字列で返す（フロント側で表示する）。フッタが無ければその旨を返す（エラーではない。
// 開発ビルドではフッタが付いていないのが正常なため）
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
		.invoke_handler(tauri::generate_handler![self_check])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
