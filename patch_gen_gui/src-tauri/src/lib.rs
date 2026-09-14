// パッチ生成ツール（試作単体アプリ）の Tauri 本体。
// src/docs/legacy-app-patch.md「パッチ生成ツール（試作単体アプリ）」「GUI設計案」参照。
//
// GUI（本体）は config.json の組み立てと入力UIだけを担当し、実際の判定ロジック
// （asar抽出・チェックサム計算・downloadUrl検証等）は一切持たない。
// sn_extension 側の genLegacyPatch.ts（bunで動くCLI。実機データで検証済み）を
// サブプロセスとして呼び出すだけ。開発者は bun/node が入っている前提
// （本家か分家の開発環境はあるはず。TODO.md §0参照）なので、Rust側で
// 同じロジックを再実装しない。

use aws_sdk_s3::config::{BehaviorVersion, Credentials, Region};
use aws_sdk_s3::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
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

// 最新版インストーラー選択用：拡張子を1つに固定した単一ファイル選択
// （win欄は.exeのみ、mac欄は.dmgのみ選ばせる。2026-09-15・ユーザー指摘）
#[tauri::command]
async fn select_single_file_with_ext(app: tauri::AppHandle, ext: String) -> Option<String> {
	let (tx, rx) = std::sync::mpsc::channel();
	app.dialog()
		.file()
		.add_filter("インストーラー", &[ext.as_str()])
		.pick_file(move |file| {
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


//MARK: プロジェクトフォルダからの自動入力
//
// 拡張機能本体（sn_extension/src/Project.ts）のプロジェクト読み込みロジックと
// 同じ判定基準を、ファイル存在チェックだけで簡易再現する。
// - appName: package.json の productName（無ければ build.productName、name の順で
//   フォールバック）。Project.ts の T_PKG_JSON と同じフィールド名。
//   `name`（npmパッケージ名）ではなく `productName`（electron-builderが実際に
//   `/Applications/<productName>.app` としてインストールする名前）を優先するのは、
//   patch_app 側の appName がインストール先パス組み立てにそのまま使われるため
//   （LegacyAppCheck.ts の candidateInstallPaths() 参照）
// - pass.json: プロジェクト直下（Project.ts と同じ）
// - crypto: `doc_crypto/prj/`（v4.25.2以降の配置）または旧 `doc/crypto_prj/`
//   （拡張機能で開くと自動移行されるが、開かれていない場合は旧配置のまま
//   なので両方見る。Project.ts #isCryptoMode と同じ判定）
// - relPath: `doc/prj/theme/setting.sn` の実在チェックのみ（テンプレ標準の
//   既定値が本当にそこにあるかの確認）。path.json 自体はエンコード済み・
//   177KB規模の拡張機能内部フォーマット（Config.loadEx()）で、この単純な
//   ファイル存在確認より複雑になるため、ここでは踏み込まない

#[derive(Serialize)]
struct ProjectScanResult {
	#[serde(rename = "appName")]
	app_name: String,
	// package.json の name（npmパッケージ名）。electron-builder の慣例上ASCII前提の
	// 識別子であり、R2アップロード先パス（URLに載る）に使う想定。appNameは日本語の
	// productNameになりうるため別枠で持たせる（2026-09-15・実機確認で判明）
	#[serde(rename = "appSlug")]
	app_slug: String,
	pass: String,
	#[serde(rename = "relPath")]
	rel_path: String,
	crypto: bool,
	warnings: Vec<String>,
}

#[tauri::command]
fn scan_project_folder(path: String) -> Result<ProjectScanResult, String> {
	let root = PathBuf::from(&path);
	let mut warnings = Vec::new();

	let pkg_path = root.join("package.json");
	let (app_name, app_slug) = if pkg_path.exists() {
		let data = fs::read_to_string(&pkg_path).map_err(|e| format!("package.jsonの読み込みに失敗: {e}"))?;
		let json: serde_json::Value = serde_json::from_str(&data).map_err(|e| format!("package.jsonの解析に失敗: {e}"))?;
		let name = json.get("productName").and_then(|v| v.as_str())
			.or_else(|| json.get("build").and_then(|b| b.get("productName")).and_then(|v| v.as_str()))
			.or_else(|| json.get("name").and_then(|v| v.as_str()))
			.unwrap_or_default()
			.to_string();
		let slug = json.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
		(name, slug)
	}
	else {
		warnings.push("package.jsonが見つからない".to_string());
		(String::new(), String::new())
	};
	if app_name.is_empty() {
		warnings.push("appNameを特定できなかった（package.jsonのproductName/name欄を確認）".to_string());
	}

	let pass_path = root.join("pass.json");
	let pass = if pass_path.exists() {
		pass_path.to_string_lossy().to_string()
	}
	else {
		warnings.push("pass.jsonが見つからない".to_string());
		String::new()
	};

	let crypto = root.join("doc_crypto").join("prj").exists()
		|| root.join("doc").join("crypto_prj").exists();

	let rel_path = if root.join("doc").join("prj").join("theme").join("setting.sn").exists() {
		"theme/setting.sn".to_string()
	}
	else {
		warnings.push("doc/prj/theme/setting.snが見当たらない。relPathは手動で確認すること".to_string());
		String::new()
	};

	Ok(ProjectScanResult {app_name, app_slug, pass, rel_path, crypto, warnings})
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


//MARK: ホスティング管理（Cloudflare R2）
//
// 個人利用の技術検証プロトタイプという前提のため、認証情報はこの端末の
// アプリ設定フォルダに平文で保存する（拡張機能に将来統合する場合は
// VS Code の SecretStorage API に置き換える想定。src/docs/legacy-app-patch.md
// 「スコープの観察」参照）。

#[derive(Serialize, Deserialize, Clone, Default)]
struct R2Config {
	#[serde(rename = "accountId", default)]
	account_id: String,
	#[serde(default)]
	bucket: String,
	#[serde(rename = "accessKeyId", default)]
	access_key_id: String,
	#[serde(rename = "secretAccessKey", default)]
	secret_access_key: String,
	#[serde(rename = "publicBaseUrl", default)]
	public_base_url: String,
}

#[derive(Serialize)]
struct R2Object {
	key: String,
	size: i64,
	#[serde(rename = "lastModified")]
	last_modified: String,
}

fn r2_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
	let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
	Ok(dir.join("r2_config.json"))
}

fn r2_endpoint(account_id: &str) -> String {
	format!("https://{account_id}.r2.cloudflarestorage.com")
}

fn r2_client(config: &R2Config) -> Client {
	let creds = Credentials::new(
		&config.access_key_id,
		&config.secret_access_key,
		None,
		None,
		"patch_gen_gui",
	);
	let conf = aws_sdk_s3::Config::builder()
		.behavior_version(BehaviorVersion::latest())
		.region(Region::new("auto"))
		.endpoint_url(r2_endpoint(&config.account_id))
		.credentials_provider(creds)
		.force_path_style(true)
		.build();
	Client::from_conf(conf)
}

#[tauri::command]
fn r2_load_config(app: tauri::AppHandle) -> Option<R2Config> {
	let path = r2_config_path(&app).ok()?;
	let data = fs::read_to_string(path).ok()?;
	serde_json::from_str(&data).ok()
}

#[tauri::command]
fn r2_save_config(app: tauri::AppHandle, config: R2Config) -> Result<(), String> {
	let path = r2_config_path(&app)?;
	if let Some(dir) = path.parent() {
		fs::create_dir_all(dir).map_err(|e| e.to_string())?;
	}
	let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
	fs::write(&path, json).map_err(|e| e.to_string())
}

// このGUIが作る配布物は必ず patch/ 配下に置く（キー生成は app.js 参照）。
// バケットを他用途と共用していても、一覧はこのツールが管理する範囲だけに絞る。
// prefix省略時は "patch/"（一覧タブ用）、指定時はそのprefix配下だけを見る
// （アプリごとの旧バージョン検索用。r2_replace_prefix参照）
#[tauri::command]
async fn r2_list_objects(config: R2Config, prefix: Option<String>) -> Result<Vec<R2Object>, String> {
	let client = r2_client(&config);
	let resp = client
		.list_objects_v2()
		.bucket(&config.bucket)
		.prefix(prefix.unwrap_or_else(|| "patch/".to_string()))
		.send()
		.await
		.map_err(|e| e.to_string())?;
	Ok(resp
		.contents()
		.iter()
		// キーが "/" で終わる0バイトオブジェクトは実データではなく、R2のコンソール等が
		// フォルダ表示用に作るプレースホルダー。一覧に出すと誤削除の危険があるだけで
		// 意味が無いため除外する（2026-09-15・ユーザー指摘：削除ボタンのミス押しが怖い）
		.filter(|o| ! o.key().unwrap_or_default().ends_with('/'))
		.map(|o| R2Object {
			key: o.key().unwrap_or_default().to_string(),
			size: o.size().unwrap_or_default(),
			last_modified: o.last_modified().map(|d| format!("{d:?}")).unwrap_or_default(),
		})
		.collect())
}

// 指定prefix配下から keep_key 以外を削除する（旧版の自動掃除用）。
// 削除件数を返す。アップロード成功「後」に呼ぶ前提（先に消すと失敗時にファイルが
// 消失するため。2026-09-15・ユーザー要望：ランダムIDフォルダが溜まり続けるのを防ぐ）
#[tauri::command]
async fn r2_delete_others_with_prefix(config: R2Config, prefix: String, keep_key: String) -> Result<u32, String> {
	let client = r2_client(&config);
	let resp = client
		.list_objects_v2()
		.bucket(&config.bucket)
		.prefix(&prefix)
		.send()
		.await
		.map_err(|e| e.to_string())?;

	let mut deleted = 0u32;
	for obj in resp.contents() {
		let Some(key) = obj.key() else { continue };
		if key == keep_key { continue; }
		client
			.delete_object()
			.bucket(&config.bucket)
			.key(key)
			.send()
			.await
			.map_err(|e| format!("{key} の削除に失敗: {e}"))?;
		deleted += 1;
	}
	Ok(deleted)
}

// アップロード後の公開URL（表示用。downloadUrl欄へのコピペを想定）を返す
#[tauri::command]
async fn r2_upload_file(config: R2Config, local_path: String, key: String) -> Result<String, String> {
	if key.is_empty() {
		return Err("保存先キー名を入力すること".to_string());
	}
	let client = r2_client(&config);
	let body = aws_sdk_s3::primitives::ByteStream::from_path(&local_path)
		.await
		.map_err(|e| format!("ファイル読み込みに失敗: {e}"))?;
	client
		.put_object()
		.bucket(&config.bucket)
		.key(&key)
		.body(body)
		.send()
		.await
		.map_err(|e| e.to_string())?;

	let base = if config.public_base_url.is_empty() {
		r2_endpoint(&config.account_id)
	}
	else {
		config.public_base_url.trim_end_matches('/').to_string()
	};
	Ok(format!("{base}/{key}"))
}

#[tauri::command]
async fn r2_delete_object(config: R2Config, key: String) -> Result<(), String> {
	let client = r2_client(&config);
	client
		.delete_object()
		.bucket(&config.bucket)
		.key(&key)
		.send()
		.await
		.map_err(|e| e.to_string())?;
	Ok(())
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
			scan_project_folder,
			select_installer_files,
			select_single_file,
			select_single_file_with_ext,
			select_output_path,
			run_gen_legacy_patch,
			r2_load_config,
			r2_save_config,
			r2_list_objects,
			r2_upload_file,
			r2_delete_object,
			r2_delete_others_with_prefix,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
