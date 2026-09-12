// ダウンロード処理。既定ブラウザで download_url を開く案は採らない。
//
// 理由：購入者チェック（案A＋チェックサム比較）を通過した「後」に URL をブラウザへ渡すと、
// アドレスバー・履歴にそのまま残り、検証を経ていない第三者へその URL を転送・再配布できて
// しまう。せっかくの購入者チェックの意味が薄れる。ダウンロードそのものをアプリ内で完結させ、
// URL を画面に一切出さない。
//
// HTTP クライアントクレート（reqwest 等）は追加しない。curl は mac 標準搭載・Windows は
// 10 の 1803 以降で標準搭載なので、dialog.rs と同じ考え方（OS 標準ツールをサブプロセスで
// 呼ぶだけ）で足りる。PATH 上の別の curl に化けないよう、絶対パスで呼ぶ。
//
// ダウンロード後は自動的に開く（mac: dmg を mount＆Finder表示、win: exe を起動）。
// 「機械が苦手な利用者でも exe/dmg→app をダブルクリックするだけ」に寄せるための判断
// （2026-09-12・作者確認）。build.md §5「自動ダウンロード＆インストールを作らない」は
// 拡張機能自身が別の拡張機能／VSIX を取得・導入する話で、脅威モデルが異なる：
// このツールは利用者が「更新を取得する」という単一目的のために自分の意思で起動するもので、
// 実行主体の意図は起動した時点で既に確定している。
// ⚠️ トレードオフとして、ダウンローダーが直後に取得物を実行するパターンは AV の
// ヒューリスティックにやや引っかかりやすくなる。ただし本来の目的（正規購入者への更新配布）
// そのものであり、多くの正規アップデーターも同じ動作をするため許容する。

use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
const CURL: &str = r"C:\Windows\System32\curl.exe";
#[cfg(target_os = "macos")]
const CURL: &str = "/usr/bin/curl";

pub fn filename_from_url(url: &str) -> String {
	url.rsplit('/').next().filter(|s| !s.is_empty()).unwrap_or("installer").to_string()
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
pub fn download(url: &str, dest_dir: &Path) -> io::Result<PathBuf> {
	std::fs::create_dir_all(dest_dir)?;
	let out_path = dest_dir.join(filename_from_url(url));

	let status = Command::new(CURL)
		.arg("-fSL")	// 失敗時に非ゼロ終了・リダイレクト追従・進捗のみ表示
		.arg("-o").arg(&out_path)
		.arg(url)
		.status()?;

	if !status.success() {
		return Err(io::Error::other(format!("curl が失敗した（終了コード: {status}）")));
	}
	Ok(out_path)
}

#[cfg(target_os = "macos")]
pub fn open_downloaded_file(path: &Path) -> io::Result<()> {
	// dmg なら mount して Finder ウィンドウまで開く（中の .app をドラッグする、
	// mac ソフト配布の標準的な導線）。pkg ならインストーラが、単体 app ならそのまま起動する
	Command::new("/usr/bin/open").arg(path).spawn()?;
	Ok(())
}

#[cfg(target_os = "windows")]
pub fn open_downloaded_file(path: &Path) -> io::Result<()> {
	// ⚠️ 未検証（Windows 実機が無い）。exe をそのまま起動し、インストーラのウィザードに委ねる
	Command::new(path).spawn()?;
	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn filename_from_url_takes_last_segment() {
		assert_eq!(filename_from_url("https://example.com/dl/MyGameSetup.exe"), "MyGameSetup.exe");
	}

	#[test]
	fn filename_from_url_falls_back_when_no_segment() {
		assert_eq!(filename_from_url("https://example.com/"), "installer");
		assert_eq!(filename_from_url(""), "installer");
	}
}
