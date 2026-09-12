// asar 内の1ファイル抽出。legacy-app-patch.md「asar 内の1ファイル抽出」参照。
//
// asar はヘッダ（Chromium Pickle 形式でエンコードされた JSON。ファイルツリーと各ファイルの
// offset/size を記述）＋ファイル本体の連結という単純な形式。該当1ファイルだけシークして
// 読めば、asar 全体（127MB規模）を読み込む必要はない。
//
// ヘッダのバイナリレイアウト（@electron/asar の実装に合わせる）：
//   [4B: 4固定（外側ピックルのpayload_size）][4B: header_size(LE u32)]
//   [4B: JSON文字列長(LE u32)][JSON文字列(header_size全体でこの後ろに4バイト境界パディングあり)]
// ファイル本体の先頭オフセット（base_offset）は `8 + header_size`。各ファイルの offset は
// そこからの相対値（10進文字列で JSON に入っている）。
//
// basename 探索方式（legacy-app-patch.md 2026-09-13 決定）：ヘッダのツリーを再帰的に走査し、
// 「basename が一致する最初の1件」を返す。フォルダ配置（`out/renderer/prj/` 配下の構成）を
// 一切前提にしないため、本家/分家/エンジン世代の asar 構成差異に影響されない。

use serde::Deserialize;
use std::collections::HashMap;
use std::fmt;
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;

#[derive(Debug, Deserialize)]
struct Entry {
	files		: Option<HashMap<String, Entry>>,
	size		: Option<u64>,
	offset		: Option<String>,
	unpacked	: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct Header {
	files: HashMap<String, Entry>,
}

#[derive(Debug)]
pub enum AsarError {
	Io(io::Error),
	InvalidHeader(&'static str),
	Json(serde_json::Error),
	NotFound,
	Unpacked,	// 対象ファイルが asar 外に展開されている（unpacked）。未対応
}

impl fmt::Display for AsarError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			Self::Io(e) => write!(f, "IOエラー: {e}"),
			Self::InvalidHeader(m) => write!(f, "asarヘッダが不正: {m}"),
			Self::Json(e) => write!(f, "asarヘッダのJSON解析に失敗: {e}"),
			Self::NotFound => write!(f, "該当ファイルが見つからない"),
			Self::Unpacked => write!(f, "対象ファイルは unpacked（asar外展開）のため未対応"),
		}
	}
}

impl From<io::Error> for AsarError {
	fn from(e: io::Error) -> Self { Self::Io(e) }
}
impl From<serde_json::Error> for AsarError {
	fn from(e: serde_json::Error) -> Self { Self::Json(e) }
}

// ヘッダ部分だけを読み進め、(ヘッダJSON, ファイル本体の開始オフセット) を返す。
// asar 全体を読み込まない：ヘッダに必要な分（8バイト＋header_sizeバイト）だけ読む。
fn parse_header<R: Read>(reader: &mut R) -> Result<(Header, u64), AsarError> {
	let mut head8 = [0u8; 8];
	reader.read_exact(&mut head8)?;
	let header_size = u32::from_le_bytes(head8[4..8].try_into().unwrap()) as usize;

	let mut inner = vec![0u8; header_size];
	reader.read_exact(&mut inner)?;

	// inner はそれ自体もう1段の Pickle（[4B: payload_size(=str_len+4の丸め)][4B: str_len][json]）。
	// 実機の asar（electron-builder製）で実バイト列を確認して判明した二重入れ子構造
	// （2026-09-13・実地検証）。先頭4バイト（payload_size）は読み飛ばしてよい
	if inner.len() < 8 { return Err(AsarError::InvalidHeader("内側ピックルが短すぎる")); }
	let str_len = u32::from_le_bytes(inner[4..8].try_into().unwrap()) as usize;
	if inner.len() < 8 + str_len { return Err(AsarError::InvalidHeader("JSON文字列が途中で切れている")); }

	let json_str = std::str::from_utf8(&inner[8..8 + str_len])
		.map_err(|_| AsarError::InvalidHeader("JSONがUTF-8でない"))?;

	let header: Header = serde_json::from_str(json_str)?;
	Ok((header, (8 + header_size) as u64))
}

// ツリーを再帰的に探索し、basename が一致する最初のファイルエントリを返す
fn find_by_basename<'a>(files: &'a HashMap<String, Entry>, basename: &str) -> Option<&'a Entry> {
	for (name, entry) in files {
		if let Some(children) = &entry.files {
			if let Some(found) = find_by_basename(children, basename) { return Some(found); }
		}
		else if name == basename {
			return Some(entry);
		}
	}
	None
}

// reader（asar アーカイブ全体を指す Read+Seek）から、basename に一致する1ファイルの
// 内容を抽出する。ヘッダを読んだ後、対象ファイルの範囲だけシークして読む。
pub fn extract_from_reader<R: Read + Seek>(reader: &mut R, basename: &str) -> Result<Vec<u8>, AsarError> {
	let (header, base_offset) = parse_header(reader)?;

	let entry = find_by_basename(&header.files, basename).ok_or(AsarError::NotFound)?;
	if entry.unpacked == Some(true) { return Err(AsarError::Unpacked); }

	let offset: u64 = entry.offset.as_deref()
		.ok_or(AsarError::InvalidHeader("offsetが無い"))?
		.parse()
		.map_err(|_| AsarError::InvalidHeader("offsetが数値でない"))?;
	let size = entry.size.ok_or(AsarError::InvalidHeader("sizeが無い"))? as usize;

	reader.seek(SeekFrom::Start(base_offset + offset))?;
	let mut buf = vec![0u8; size];
	reader.read_exact(&mut buf)?;
	Ok(buf)
}

pub fn extract_by_basename(archive_path: &Path, basename: &str) -> Result<Vec<u8>, AsarError> {
	let mut file = File::open(archive_path)?;
	extract_from_reader(&mut file, basename)
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::io::Cursor;

	// テスト用：本物と同じバイナリレイアウトの asar を組み立てる（フィクスチャ）。
	// 実機の asar（electron-builder製）で実バイト列を確認して判明した二重入れ子の
	// Pickle構造を再現する（2026-09-13・実地検証。parse_header() のコメント参照）
	fn build_fake_asar(header_json: &str, file_bodies: &[u8]) -> Vec<u8> {
		let json_bytes = header_json.as_bytes();

		// もっとも内側：[4B: str_len][json]（+4バイト境界パディング）
		let mut str_pickle = Vec::new();
		str_pickle.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
		str_pickle.extend_from_slice(json_bytes);
		while str_pickle.len() % 4 != 0 { str_pickle.push(0); }

		// その1段外：[4B: payload_size][str_pickle]
		let mut inner = Vec::new();
		inner.extend_from_slice(&(str_pickle.len() as u32).to_le_bytes());
		inner.extend_from_slice(&str_pickle);

		let mut out = Vec::new();
		out.extend_from_slice(&4u32.to_le_bytes());	// 最外殻ピックルのpayload_size（常に4）
		out.extend_from_slice(&(inner.len() as u32).to_le_bytes());	// header_size
		out.extend_from_slice(&inner);
		out.extend_from_slice(file_bodies);
		out
	}

	#[test]
	fn extract_finds_file_regardless_of_folder_nesting() {
		let content = b"&const.experiment = false\n";
		// out/renderer/prj/theme/<uuid>.sn という深いネストの中に埋める
		let header = serde_json::json!({
			"files": {"out": {"files": {"renderer": {"files": {"prj": {"files": {"theme": {"files": {
				"target.sn": {"size": content.len(), "offset": "0"},
			}}}}}}}}},
		});
		let asar = build_fake_asar(&header.to_string(), content);

		let mut reader = Cursor::new(asar);
		let extracted = extract_from_reader(&mut reader, "target.sn").unwrap();
		assert_eq!(extracted, content);
	}

	#[test]
	fn extract_uses_offset_to_skip_preceding_files() {
		let first = b"dummy-other-file";
		let target = b"the-real-target-bytes";
		let mut bodies = Vec::new();
		bodies.extend_from_slice(first);
		bodies.extend_from_slice(target);

		let header_json = format!(
			r#"{{"files":{{"a.bin":{{"size":{},"offset":"0"}},"target.sn":{{"size":{},"offset":"{}"}}}}}}"#,
			first.len(), target.len(), first.len(),
		);
		let asar = build_fake_asar(&header_json, &bodies);

		let mut reader = Cursor::new(asar);
		let extracted = extract_from_reader(&mut reader, "target.sn").unwrap();
		assert_eq!(extracted, target);
	}

	#[test]
	fn extract_returns_not_found_for_missing_basename() {
		let header_json = r#"{"files":{"a.sn":{"size":0,"offset":"0"}}}"#;
		let asar = build_fake_asar(header_json, b"");
		let mut reader = Cursor::new(asar);
		assert!(matches!(extract_from_reader(&mut reader, "missing.sn"), Err(AsarError::NotFound)));
	}

	#[test]
	fn extract_errors_on_unpacked_file() {
		let content = b"x";
		let header_json = format!(
			r#"{{"files":{{"big.bin":{{"size":{},"offset":"0","unpacked":true}}}}}}"#,
			content.len(),
		);
		let asar = build_fake_asar(&header_json, content);
		let mut reader = Cursor::new(asar);
		assert!(matches!(extract_from_reader(&mut reader, "big.bin"), Err(AsarError::Unpacked)));
	}
}
