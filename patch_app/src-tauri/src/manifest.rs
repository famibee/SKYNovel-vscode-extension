// 遠隔マニフェスト取得・パース。curlをサブプロセスで呼ぶだけ（download.rsと同じ考え方。
// reqwest等のHTTPクライアントクレートは追加しない）。
// スキーマは src/docs/legacy-app-patch.md「遠隔マニフェスト」参照：
// { "schema": 1, "apps": { "<appName>": { "version", "win": {...}, "mac": {...} } } }
//
// 埋め込み側（footer.rs の AppConfig）は旧スキーマ（downloadUrl/checksumLatest/latestArchを
// 直接持つ）のまま無改修（legacy-app-patch.md「実装順序」参照：lib側は47件のテストが通る
// 状態を崩さない）。このファイルはそれとは別に、遠隔から取得した最新版情報を保持するだけの
// 新規データ型。呼び出し側（lib.rs）が両者を実行時にマージする。

use sn_legacy_patch_core::detect::Platform;
use std::collections::HashMap;
use std::process::Command;

#[cfg(target_os = "windows")]
const CURL: &str = r"C:\Windows\System32\curl.exe";
#[cfg(target_os = "macos")]
const CURL: &str = "/usr/bin/curl";

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestOsEntry {
	pub download_url: String,
	#[serde(default)]
	pub checksum_latest: String,
	#[serde(default)]
	pub latest_arch: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ManifestAppEntry {
	#[serde(default)]
	pub version: String,
	#[serde(default)]
	pub win: Option<ManifestOsEntry>,
	#[serde(default)]
	pub mac: Option<ManifestOsEntry>,
}

impl ManifestAppEntry {
	pub fn for_platform(&self, platform: Platform) -> Option<&ManifestOsEntry> {
		match platform {
			Platform::Mac => self.mac.as_ref(),
			Platform::Windows => self.win.as_ref(),
			Platform::Other => None,
		}
	}
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct Manifest {
	// 現状は読み込み時に値を検証していない（スキーマは現行の1のみ）。将来の非互換変更に
	// 備えて残してあるフィールドなので、今のところ未参照でも消さない
	#[allow(dead_code)]
	pub schema: u32,
	pub apps: HashMap<String, ManifestAppEntry>,
}

pub fn fetch_manifest(url: &str) -> Result<Manifest, String> {
	let output = Command::new(CURL)
		.arg("-fsSL")	// 失敗時に非ゼロ終了・サイレント・リダイレクト追従
		.arg(url)
		.output()
		.map_err(|e| format!("curlの起動に失敗した: {e}"))?;

	if !output.status.success() {
		return Err(format!("マニフェスト取得に失敗した（終了コード: {}）", output.status));
	}

	serde_json::from_slice(&output.stdout).map_err(|e| format!("マニフェストの解析に失敗した: {e}"))
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::io::Write;

	fn write_temp_manifest(json: &str, suffix: &str) -> std::path::PathBuf {
		let path = std::env::temp_dir().join(format!("sn_manifest_test_{}_{}.json", std::process::id(), suffix));
		let mut f = std::fs::File::create(&path).unwrap();
		f.write_all(json.as_bytes()).unwrap();
		path
	}

	#[test]
	fn fetch_manifest_reads_local_file_via_curl() {
		let json = r#"{"schema":1,"apps":{"MyGame":{"version":"1.3.0","win":{"downloadUrl":"https://example.com/w","checksumLatest":"abc","latestArch":"x64"},"mac":{"downloadUrl":"https://example.com/m","checksumLatest":"def","latestArch":"universal"}}}}"#;
		let path = write_temp_manifest(json, "ok");
		let url = format!("file://{}", path.display());

		let manifest = fetch_manifest(&url).expect("ローカルファイルを取得できるはず");
		assert_eq!(manifest.schema, 1);
		let entry = manifest.apps.get("MyGame").unwrap();
		assert_eq!(entry.version, "1.3.0");
		assert_eq!(entry.win.as_ref().unwrap().checksum_latest, "abc");
		assert_eq!(entry.mac.as_ref().unwrap().latest_arch, "universal");
		assert_eq!(entry.for_platform(Platform::Mac).unwrap().latest_arch, "universal");
		assert_eq!(entry.for_platform(Platform::Windows).unwrap().checksum_latest, "abc");
		assert!(entry.for_platform(Platform::Other).is_none());

		std::fs::remove_file(&path).unwrap();
	}

	#[test]
	fn fetch_manifest_fails_for_missing_file() {
		let result = fetch_manifest("file:///no/such/path/manifest.json");
		assert!(result.is_err());
	}

	#[test]
	fn fetch_manifest_fails_for_broken_json() {
		let path = write_temp_manifest("not json", "broken");
		let url = format!("file://{}", path.display());

		let result = fetch_manifest(&url);
		assert!(result.is_err());

		std::fs::remove_file(&path).unwrap();
	}
}
