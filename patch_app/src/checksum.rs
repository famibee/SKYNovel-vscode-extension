// チェックサム比較（体験版誤認の回避・鍵不要）。
// sn_extension 側の src/LegacyAppCheck.ts の checksumHex() / matchesKnownChecksum() の移植。
// AES-GCM は決定的（Encryptor.ts 参照）なので、暗号化済みデータのチェックサムだけで、
// 鍵を一切持たずに「既知の内容と一致するか」を判定できる。

use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;

pub fn checksum_hex(data: &[u8]) -> String {
	let mut hasher = Sha256::new();
	hasher.update(data);
	hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect()
}

// 体験版チェック機構（setting.sn）自体が無い古いビルド向け（legacy-app-patch.md
// 詰められていない仕様#8）：インストーラー本体（.exe/.dmg。数百MB規模になりうる）を
// 丸ごと読まず、サイズ＋均等間隔の64KBブロック16箇所だけをハッシュする。
//
// ⚠️ sn_extension 側の src/LegacyAppCheck.ts の sampledFileChecksum() と寸分違わず
// 同じロジックであること。整数演算のみを使い、TS/Rustのどちらで計算しても同じ結果に
// なるようにしている。片方だけ直すと全購入者が弾かれる致命的な不具合になるため、
// 変更する場合は必ず両方を直し、同じファイルで一致することを確認すること
const SAMPLE_CHUNK_SIZE: u64 = 65536;	// 64KB
const SAMPLE_COUNT: u64 = 16;

pub fn sampled_file_checksum(path: &Path) -> io::Result<String> {
	let mut file = File::open(path)?;
	let size = file.metadata()?.len();
	let mut hasher = Sha256::new();

	// ファイルサイズも取り込む（内容が偶然サンプル箇所だけ一致するケースを弾くため）
	hasher.update(&size.to_le_bytes());

	if size <= SAMPLE_CHUNK_SIZE {
		let mut buf = vec![0u8; size as usize];
		file.read_exact(&mut buf)?;
		hasher.update(&buf);
		return Ok(hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect());
	}

	for i in 0..SAMPLE_COUNT {
		// 0 〜 (size - SAMPLE_CHUNK_SIZE) の範囲に均等間隔でi=0が先頭・
		// i=SAMPLE_COUNT-1が末尾ちょうどに来るようオフセットを決める
		let offset = (size - SAMPLE_CHUNK_SIZE) * i / (SAMPLE_COUNT - 1);
		let read_len = SAMPLE_CHUNK_SIZE.min(size - offset) as usize;
		let mut buf = vec![0u8; read_len];
		file.seek(SeekFrom::Start(offset))?;
		file.read_exact(&mut buf)?;
		hasher.update(&buf);
	}
	Ok(hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect())
}

pub fn matches_known_checksum(data: &[u8], expected_hex: &str) -> bool {
	checksum_hex(data) == expected_hex.to_lowercase()
}

// 過去に複数回リリースされた setting.sn のいずれかと一致するか（legacy-app-patch.md
// 「詰められていない仕様」#1：チェックサム1個の一致のみでは旧バージョン購入者を誤って
// 弾いてしまう問題への対応。既知チェックサムの配列のどれか1つと一致すればよい）
pub fn matches_any_known_checksum(data: &[u8], expected_hexes: &[String]) -> bool {
	expected_hexes.iter().any(|hex| matches_known_checksum(data, hex))
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn checksum_hex_is_deterministic() {
		let a = checksum_hex(b"hello");
		let b = checksum_hex(b"hello");
		assert_eq!(a, b);
		assert_ne!(a, checksum_hex(b"hello2"));
	}

	#[test]
	fn matches_known_checksum_is_case_insensitive() {
		let hex = checksum_hex("体験版 = false".as_bytes());
		assert!(matches_known_checksum("体験版 = false".as_bytes(), &hex));
		assert!(matches_known_checksum("体験版 = false".as_bytes(), &hex.to_uppercase()));
		assert!(!matches_known_checksum("体験版 = true".as_bytes(), &hex));
	}

	#[test]
	fn matches_any_known_checksum_true_if_any_entry_matches() {
		let hex_v1 = checksum_hex(b"v1-bytes");
		let hex_v2 = checksum_hex(b"v2-bytes");
		let known = vec![hex_v1, hex_v2.clone()];

		assert!(matches_any_known_checksum(b"v2-bytes", &known));
		assert!(!matches_any_known_checksum(b"v3-bytes", &known));
	}

	#[test]
	fn matches_any_known_checksum_false_for_empty_list() {
		assert!(!matches_any_known_checksum(b"anything", &[]));
	}

	fn write_temp_file(name: &str, data: &[u8]) -> std::path::PathBuf {
		let path = std::env::temp_dir().join(format!("sn_legacy_patch_test_{}_{name}", std::process::id()));
		std::fs::write(&path, data).unwrap();
		path
	}

	#[test]
	fn sampled_file_checksum_is_deterministic_for_small_file() {
		let path = write_temp_file("small_a", b"hello world");
		let a = sampled_file_checksum(&path).unwrap();
		let b = sampled_file_checksum(&path).unwrap();
		assert_eq!(a, b);
		std::fs::remove_file(&path).unwrap();
	}

	#[test]
	fn sampled_file_checksum_differs_when_small_file_content_differs() {
		let path_a = write_temp_file("small_b1", b"hello world");
		let path_b = write_temp_file("small_b2", b"hello WORLD");
		let a = sampled_file_checksum(&path_a).unwrap();
		let b = sampled_file_checksum(&path_b).unwrap();
		assert_ne!(a, b);
		std::fs::remove_file(&path_a).unwrap();
		std::fs::remove_file(&path_b).unwrap();
	}

	#[test]
	fn sampled_file_checksum_differs_when_same_size_but_middle_byte_differs() {
		// SAMPLE_CHUNK_SIZE超のファイルで、先頭・末尾以外（サンプル範囲の中間）だけが
		// 違う場合でも検出できること（サンプリングが先頭・末尾だけに偏っていないことの確認）
		let size = (SAMPLE_CHUNK_SIZE * SAMPLE_COUNT) as usize;
		let mut data_a = vec![0u8; size];
		let mut data_b = data_a.clone();
		let mid = size / 2;
		data_b[mid] = 0xff;

		let path_a = write_temp_file("mid_a", &data_a);
		let path_b = write_temp_file("mid_b", &data_b);
		let a = sampled_file_checksum(&path_a).unwrap();
		let b = sampled_file_checksum(&path_b).unwrap();
		assert_ne!(a, b, "中間バイトの違いを検出できていない");

		// 念のため：末尾を変えても検出できること
		data_a[size - 1] = 0xff;
		let path_a_tail = write_temp_file("tail_a", &data_a);
		let tail_hash = sampled_file_checksum(&path_a_tail).unwrap();
		assert_ne!(tail_hash, sampled_file_checksum(&path_b).unwrap());

		std::fs::remove_file(&path_a).unwrap();
		std::fs::remove_file(&path_b).unwrap();
		std::fs::remove_file(&path_a_tail).unwrap();
	}

	#[test]
	fn sampled_file_checksum_differs_when_size_differs_but_content_prefix_same() {
		let path_a = write_temp_file("size_a", b"same-prefix");
		let path_b = write_temp_file("size_b", b"same-prefix-but-longer");
		let a = sampled_file_checksum(&path_a).unwrap();
		let b = sampled_file_checksum(&path_b).unwrap();
		assert_ne!(a, b);
		std::fs::remove_file(&path_a).unwrap();
		std::fs::remove_file(&path_b).unwrap();
	}
}
