// 処理終了時の案内ダイアログ。GUI フレームワークは使わず、OS 標準のダイアログ表示コマンドを
// 子プロセスで呼ぶだけに留める（legacy-app-patch.md「実装基盤（論点2）」の設計どおり）。
// mac: osascript の display dialog／win: mshta.exe 経由の VBScript MsgBox。
// どちらも OS 標準搭載で追加インストール不要。

use std::io;
use std::process::Command;

#[derive(Clone, Copy)]
pub enum Kind {
	Info,
	Error,
}

// AppleScript の文字列リテラル用エスケープ（display dialog "…" の中身）
fn escape_applescript(s: &str) -> String {
	s.replace('\\', "\\\\").replace('"', "\\\"")
}

// VBScript の文字列リテラル用エスケープ（MsgBox "…" の中身。二重引用符を2つ並べるだけでよい）
fn escape_vbscript(s: &str) -> String {
	s.replace('"', "\"\"")
}

#[cfg(target_os = "macos")]
pub fn show(kind: Kind, title: &str, message: &str) -> io::Result<()> {
	let icon = match kind { Kind::Info => "note", Kind::Error => "stop" };
	let script = format!(
		"display dialog \"{}\" with title \"{}\" buttons {{\"OK\"}} default button \"OK\" with icon {}",
		escape_applescript(message), escape_applescript(title), icon,
	);
	Command::new("osascript").arg("-e").arg(script).status()?;
	Ok(())
}

#[cfg(target_os = "windows")]
pub fn show(kind: Kind, title: &str, message: &str) -> io::Result<()> {
	// vbOKOnly(0) + vbInformation(64) / vbCritical(16)
	let flags = match kind { Kind::Info => 64, Kind::Error => 16 };
	let script = format!(
		"vbscript:Close(MsgBox(\"{}\",{},\"{}\"))",
		escape_vbscript(message), flags, escape_vbscript(title),
	);
	Command::new("mshta.exe").arg(script).status()?;
	Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn show(_kind: Kind, title: &str, message: &str) -> io::Result<()> {
	eprintln!("[{title}] {message}");	// 配布対象外プラットフォームでのフォールバック
	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn escape_applescript_handles_quotes_and_backslashes() {
		assert_eq!(escape_applescript(r#"say "hi""#), r#"say \"hi\""#);
		assert_eq!(escape_applescript(r"a\b"), r"a\\b");
	}

	#[test]
	fn escape_vbscript_doubles_quotes() {
		assert_eq!(escape_vbscript(r#"say "hi""#), r#"say ""hi"""#);
		assert_eq!(escape_vbscript("no quotes here"), "no quotes here");
	}
}
