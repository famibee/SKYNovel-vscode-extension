// 自己参照データの読み取り（legacy-app-patch.md「実装基盤（論点2）」の設計）。
//
// 配布される実行ファイルは [汎用バイナリ本体][JSON][u32 LE: JSONバイト長][8バイトのマジック]
// という形をしている。sn_extension 側がこのバイナリの末尾にプロジェクト固有データを
// 単純に連結するだけで1ファイルの配布物を作れる（`append_footer` はその処理そのもの。
// 実際の連結は TypeScript 側の生成 CLI が担う想定だが、フォーマットの往復が壊れていないことを
// この Rust 側でも確認できるよう、エンコード側もここに置いている）。

use serde::Deserialize;

const MAGIC: &[u8; 8] = b"SNLPATCH";

// 1アプリ分の設定。配布物には複数個（Config = Vec<AppConfig>）を埋め込める
// （2026-09-14: 複数ver・複数アプリを1本の実行ファイルで扱えるようにする対応。
// 生成側 genLegacyPatch.ts も同時期にJSON配列を書き出す方式へ変更済み）
#[derive(Debug, Deserialize, PartialEq, Eq)]
pub struct AppConfig {
	#[serde(rename = "appName")]
	pub app_name: String,
	// 単一値ではなく配列（legacy-app-patch.md「詰められていない仕様」#1・2026-09-13決定：
	// 過去複数回リリースされた setting.sn のどれとでも一致してよい）
	#[serde(rename = "checksumSetting")]
	pub checksum_setting: Vec<String>,
	// setting.snが見つからなかったlegacyInstaller向けの、インストーラー本体そのものの
	// チェックサム（常時埋め込まれるフォールバック。2026-09-17・詰められていない仕様#8）。
	// ①setting.sn抽出に失敗したときだけ②こちらで購入者に当時のインストーラー本体を
	// 選ばせて比較する
	#[serde(rename = "checksumInstaller", default)]
	pub checksum_installer: Vec<String>,
	// 配布予定の最新版のチェックサム（①setting.sn方式・②インストーラー本体方式のどちらかで
	// 計算されたもの。空文字列＝未提供）。インストール済みバージョンがこれと一致するなら
	// 既に最新版なのでダウンロードをスキップする（2026-09-17・ユーザー指摘）
	#[serde(rename = "checksumLatest", default)]
	pub checksum_latest: String,
	// 配布予定の最新版のarch（"x64"|"ia32"|"arm64"|"universal"）。genLegacyPatch.tsが
	// electron-builderのartifactName規約からlatestInstallerのファイル名を見て抽出する。
	// 空文字列＝未提供（archチェックを行わない・従来通りの動作）。
	// macOS 27 "Golden Gate"を最後にRosetta 2の一般アプリ向けサポートが終わる見込みとなり、
	// 「setting.snのチェックサムは同じだがarchだけ新しくなった」ケースを検知するために追加した
	// （2026-09-17・legacy-app-patch.md 詰められていない仕様#9）
	#[serde(rename = "latestArch", default)]
	pub latest_arch: String,
	// asar 内での basename のみ（フォルダ位置は問わない。同ドキュメント2026-09-13決定）
	#[serde(rename = "settingSnFileName")]
	pub setting_sn_file_name: String,
	#[serde(rename = "downloadUrl")]
	pub download_url: String,
}

// 埋め込みJSONのトップレベルはアプリごとの設定の配列
pub type Config = Vec<AppConfig>;

// stub（汎用バイナリ本体）の末尾に JSON を連結する。順序：json ++ len(u32 LE) ++ magic
pub fn append_footer(stub: &[u8], json: &str) -> Vec<u8> {
	let json_bytes = json.as_bytes();
	let mut out = Vec::with_capacity(stub.len() + json_bytes.len() + 4 + MAGIC.len());
	out.extend_from_slice(stub);
	out.extend_from_slice(json_bytes);
	out.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
	out.extend_from_slice(MAGIC);
	out
}

// full_bytes は実行ファイル全体のバイト列（実運用では自分自身のファイルを丸ごと読む）。
// マジックが無ければ None（連結前の裸のバイナリを直接実行した場合など）
pub fn extract_trailing_json(full_bytes: &[u8]) -> Option<String> {
	let tail_len = MAGIC.len() + 4;
	if full_bytes.len() < tail_len { return None; }

	let (rest, magic) = full_bytes.split_at(full_bytes.len() - MAGIC.len());
	if magic != MAGIC { return None; }

	let (rest2, len_bytes) = rest.split_at(rest.len() - 4);
	let json_len = u32::from_le_bytes(len_bytes.try_into().ok()?) as usize;
	if rest2.len() < json_len { return None; }	// 壊れたデータ（長さがおかしい）

	let json_bytes = &rest2[rest2.len() - json_len..];
	String::from_utf8(json_bytes.to_vec()).ok()
}

pub fn parse_config(json: &str) -> Result<Config, serde_json::Error> {
	serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
	use super::*;

	fn sample_json() -> String {
		r#"[{"appName":"MyGame","checksumSetting":["abc123","def456"],"checksumInstaller":[],"settingSnFileName":"3b0bb3e8-deff-5722-94d5-885d9cb5fd0e.sn","downloadUrl":"https://example.com/patch"}]"#.to_string()
	}

	#[test]
	fn round_trip_append_then_extract() {
		let stub = b"\x00fake-elf-or-macho-bytes\x00";
		let json = sample_json();

		let full = append_footer(stub, &json);
		let extracted = extract_trailing_json(&full).expect("マジックが見つかるはず");
		assert_eq!(extracted, json);
	}

	#[test]
	fn extract_returns_none_when_no_magic() {
		assert_eq!(extract_trailing_json(b"just a plain binary, no footer"), None);
		assert_eq!(extract_trailing_json(b""), None);
	}

	#[test]
	fn extract_returns_none_on_truncated_length() {
		// 長さフィールドが実際のデータより大きい＝壊れている
		let mut broken = Vec::new();
		broken.extend_from_slice(b"ab");	// 2バイトしか JSON が無いのに
		broken.extend_from_slice(&(100u32).to_le_bytes());	// 100バイトあると主張
		broken.extend_from_slice(MAGIC);
		assert_eq!(extract_trailing_json(&broken), None);
	}

	#[test]
	fn parse_config_reads_camelcase_json() {
		let cfg = parse_config(&sample_json()).unwrap();
		assert_eq!(cfg, vec![AppConfig {
			app_name: "MyGame".to_string(),
			checksum_setting: vec!["abc123".to_string(), "def456".to_string()],
			checksum_installer: vec![],
			checksum_latest: String::new(),
			latest_arch: String::new(),
			setting_sn_file_name: "3b0bb3e8-deff-5722-94d5-885d9cb5fd0e.sn".to_string(),
			download_url: "https://example.com/patch".to_string(),
		}]);
	}

	#[test]
	fn parse_config_reads_multiple_apps() {
		let json = r#"[
			{"appName":"GameA","checksumSetting":["a1"],"settingSnFileName":"a.sn","downloadUrl":"https://example.com/a"},
			{"appName":"GameB","checksumSetting":["b1"],"settingSnFileName":"b.sn","downloadUrl":"https://example.com/b"}
		]"#;
		let cfg = parse_config(json).unwrap();
		assert_eq!(cfg.len(), 2);
		assert_eq!(cfg[0].app_name, "GameA");
		assert_eq!(cfg[1].app_name, "GameB");
	}
}
