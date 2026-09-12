// チェックサム比較（体験版誤認の回避・鍵不要）。
// sn_extension 側の src/LegacyAppCheck.ts の checksumHex() / matchesKnownChecksum() の移植。
// AES-GCM は決定的（Encryptor.ts 参照）なので、暗号化済みデータのチェックサムだけで、
// 鍵を一切持たずに「既知の内容と一致するか」を判定できる。

use sha2::{Digest, Sha256};

pub fn checksum_hex(data: &[u8]) -> String {
	let mut hasher = Sha256::new();
	hasher.update(data);
	hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect()
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
}
