// パッチ生成ツール（試作単体アプリ）の Tauri 本体。
// src/docs/legacy-app-patch.md「パッチ生成ツール（試作単体アプリ）」「GUI設計案」参照。
//
// GUI（本体）は config.json の組み立てと入力UIだけを担当し、実際の判定ロジック
// （asar抽出・チェックサム計算・downloadUrl検証等）は一切持たない。
// sn_extension 側の genLegacyPatch.ts（bunで動くCLI。実機データで検証済み）を
// サブプロセスとして呼び出すだけ。開発者は bun/node が入っている前提
// （本家か分家の開発環境はあるはず。TODO.md §0参照）なので、Rust側で
// 同じロジックを再実装しない。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri_plugin_dialog::DialogExt;


#[derive(Serialize, Deserialize, Clone)]
struct AppEntry {
	#[serde(rename = "appName")]
	app_name: String,
	pass: String,
	#[serde(rename = "relPath")]
	rel_path: String,
	crypto: bool,
	#[serde(rename = "downloadUrl")]
	download_url: String,
	#[serde(rename = "legacyInstallers")]
	legacy_installers: Vec<String>,
	#[serde(rename = "scanInstalled")]
	scan_installed: bool,
}

// sn_extension リポジトリのルート（genLegacyPatch.ts の在り処）を推測する。
// このGUI自体が sn_extension/patch_gen_gui/ に置かれている前提の相対パス
// （試作単体アプリは開発者がリポジトリ内から起動する想定。TODO.md §0参照）
fn sn_extension_root() -> Result<PathBuf, String> {
	let exe = std::env::current_exe().map_err(|e| e.to_string())?;
	// 開発時（cargo tauri dev）は target/debug/ 配下で実行されるため、
	// リポジトリ探索は「実行ファイルの位置」ではなく「ソースの位置」に依存させる。
	// ここでは簡易に、環境変数 SN_EXTENSION_ROOT があれば優先し、無ければ
	// このバイナリから2階層上（patch_gen_gui/src-tauri/target/debug/… の構造を想定せず）
	// を使わず、開発中は cwd（`cargo tauri dev` は src-tauri/ で実行される）から
	// 2階層上を使う
	if let Ok(root) = std::env::var("SN_EXTENSION_ROOT") {
		return Ok(PathBuf::from(root));
	}
	let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
	// src-tauri/ で実行されている前提（cargo tauri dev の既定動作）
	let root = cwd
		.parent() // patch_gen_gui/
		.and_then(|p| p.parent()) // sn_extension/
		.map(|p| p.to_path_buf())
		.ok_or_else(|| format!("sn_extensionルートを推測できない（cwd={}）。SN_EXTENSION_ROOT環境変数で明示すること", cwd.display()))?;
	let _ = &exe;
	Ok(root)
}


//MARK: ファイル・フォルダ選択

#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Option<String> {
	let (tx, rx) = std::sync::mpsc::channel();
	app.dialog().file().pick_folder(move |folder| {
		let _ = tx.send(folder.map(|f| f.to_string()));
	});
	rx.recv().ok().flatten()
}

// フィルタ名・拡張子リストを受け取り、複数ファイル選択させる（過去/最新インストーラー追加のD&D代替）
#[tauri::command]
async fn select_installer_files(app: tauri::AppHandle) -> Vec<String> {
	let (tx, rx) = std::sync::mpsc::channel();
	app.dialog()
		.file()
		.add_filter("インストーラー", &["dmg", "exe"])
		.pick_files(move |files| {
			let paths = files
				.map(|fs| fs.into_iter().map(|f| f.to_string()).collect())
				.unwrap_or_default();
			let _ = tx.send(paths);
		});
	rx.recv().unwrap_or_default()
}

// 単一ファイル選択の汎用コマンド（pass.json選択・stub選択で共用）
#[tauri::command]
async fn select_single_file(app: tauri::AppHandle) -> Option<String> {
	let (tx, rx) = std::sync::mpsc::channel();
	app.dialog().file().pick_file(move |file| {
		let _ = tx.send(file.map(|f| f.to_string()));
	});
	rx.recv().ok().flatten()
}

#[tauri::command]
async fn select_output_path(app: tauri::AppHandle, default_name: String) -> Option<String> {
	let (tx, rx) = std::sync::mpsc::channel();
	app.dialog()
		.file()
		.set_file_name(&default_name)
		.save_file(move |file| {
			let _ = tx.send(file.map(|f| f.to_string()));
		});
	rx.recv().ok().flatten()
}


//MARK: 生成本体（genLegacyPatch.ts への委譲）

#[tauri::command]
fn run_gen_legacy_patch(apps: Vec<AppEntry>, stub_path: String, out_path: String) -> Result<String, String> {
	if apps.is_empty() {
		return Err("アプリを1つ以上追加すること".to_string());
	}

	let root = sn_extension_root()?;
	let gen_script = root.join("src").join("genLegacyPatch.ts");
	if ! gen_script.exists() {
		return Err(format!("genLegacyPatch.ts が見つからない: {}", gen_script.display()));
	}

	#[derive(Serialize)]
	struct ConfigFile {
		apps: Vec<AppEntry>,
	}
	let config = ConfigFile { apps };
	let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;

	let config_path = std::env::temp_dir().join(format!("patch_gen_gui_config_{}.json", std::process::id()));
	fs::write(&config_path, &config_json).map_err(|e| format!("設定ファイルの書き出しに失敗: {e}"))?;

	let output = Command::new("bun")
		.arg(&gen_script)
		.arg("--config").arg(&config_path)
		.arg("--stub").arg(&stub_path)
		.arg("--out").arg(&out_path)
		.current_dir(&root)
		.output();

	let _ = fs::remove_file(&config_path);

	let output = output.map_err(|e| format!("bun の起動に失敗（bunがPATHに無い可能性）: {e}"))?;
	let stdout = String::from_utf8_lossy(&output.stdout).to_string();
	let stderr = String::from_utf8_lossy(&output.stderr).to_string();
	let combined = format!("{stdout}{stderr}");

	if output.status.success() {
		Ok(combined)
	}
	else {
		Err(combined)
	}
}


#[cfg(test)]
mod tests {
	use super::*;

	// 2026-09-14: 実際の genLegacyPatch.ts をサブプロセスで呼び出せることの検証。
	// sn_osk_gitayu の実配布物（legacy-app-patch.md で実機検証済み）を使う。
	// このマシン固有のパスに依存するため CI では動かない想定（ローカル検証用）
	#[test]
	fn run_gen_legacy_patch_実際にbunサブプロセスを呼び出せる() {
		let sn_ext_root = concat!(env!("CARGO_MANIFEST_DIR"), "/../..");
		let sn_ext_root = std::fs::canonicalize(sn_ext_root).unwrap();
		if ! sn_ext_root.join("src/genLegacyPatch.ts").exists() {
			eprintln!("skip: genLegacyPatch.ts が見つからない");
			return;
		}
		std::env::set_var("SN_EXTENSION_ROOT", &sn_ext_root);

		let installer_dmg = "/Users/ugai/Documents/MacHD2/_Ugai/sn_ver/sn_osk_gitayu/build/package/v1.1.0/sn_osk_gitayu-1.1.0-x64.dmg";
		let installer_exe = "/Users/ugai/Documents/MacHD2/_Ugai/sn_ver/sn_osk_gitayu/build/package/v1.1.0/sn_osk_gitayu-1.1.0-x64.exe";
		let pass_json = "/Users/ugai/Documents/MacHD2/_Ugai/sn_ver/sn_osk_gitayu/pass.json";
		if ! std::path::Path::new(installer_dmg).exists() || ! std::path::Path::new(pass_json).exists() {
			eprintln!("skip: 実機データが無い環境（このマシン固有のテスト）");
			return;
		}

		let d_tmp = std::env::temp_dir().join(format!("patch_gen_gui_test_{}", std::process::id()));
		std::fs::create_dir_all(&d_tmp).unwrap();
		std::fs::write(d_tmp.join("stub.bin"), b"DUMMY_STUB").unwrap();
		let out_path = d_tmp.join("out.bin");

		let apps = vec![AppEntry {
			app_name: "sn_osk_gitayu".to_string(),
			pass: pass_json.to_string(),
			rel_path: "theme/setting.sn".to_string(),
			crypto: true,
			download_url: "https://example.com/patch".to_string(),
			legacy_installers: vec![installer_dmg.to_string(), installer_exe.to_string()],
			scan_installed: false,
		}];

		let result = run_gen_legacy_patch(
			apps,
			d_tmp.join("stub.bin").to_string_lossy().to_string(),
			out_path.to_string_lossy().to_string(),
		);

		std::env::remove_var("SN_EXTENSION_ROOT");

		let log = result.expect("生成に成功するはず");
		assert!(log.contains("生成完了"), "ログに生成完了が含まれるはず: {log}");
		assert!(out_path.exists(), "出力ファイルが作られているはず");
		let _ = std::fs::remove_dir_all(&d_tmp);
	}
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_dialog::init())
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
			select_folder,
			select_installer_files,
			select_single_file,
			select_output_path,
			run_gen_legacy_patch,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
