// 処理終了時の案内ダイアログ。GUI フレームワークは使わず、OS 標準のダイアログ表示コマンドを
// 子プロセスで呼ぶだけに留める（legacy-app-patch.md「実装基盤（論点2）」の設計どおり）。
// mac: osascript の display dialog／win: mshta.exe 経由の VBScript MsgBox。
// どちらも OS 標準搭載で追加インストール不要。

use std::io;
use std::path::PathBuf;
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


// 体験版チェック機構（setting.sn）自体が無い古いビルド向け（legacy-app-patch.md
// 詰められていない仕様#8）：旧アプリの自動検出に頼らず、購入者に当時のインストーラー
// 本体（.exe/.dmg）を選ばせる。キャンセルされたら None を返す（呼び出し側で
// 「購入者チェックに失敗」扱いにする）

#[cfg(target_os = "macos")]
pub fn pick_installer_file(app_name: &str) -> io::Result<Option<PathBuf>> {
	let prompt = format!("{app_name} の旧バージョンのインストーラー（.dmg）を選択してください");
	// choose file はキャンセルされるとエラーで終了するので try/on error で空文字列に潰す
	let script = format!(
		"try\n\tPOSIX path of (choose file with prompt \"{}\")\non error\n\t\"\"\nend try",
		escape_applescript(&prompt),
	);
	let output = Command::new("osascript").arg("-e").arg(script).output()?;
	let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
	Ok(if path.is_empty() { None } else { Some(PathBuf::from(path)) })
}

// ⚠️ Windows実機で未検証（legacy-app-patch.md「Rust 開発環境の準備状況」参照。他の
// win向けコードと同じ制約）。UserAccounts.CommonDialog はXP時代からのCOMオブジェクトだが
// Windows 10/11でも動作する（.NET/PowerShell不要・OS標準搭載のみで完結させるため採用）。
// mshta（vbscript:URIの1行実行）では戻り値を受け取れないため、ここだけ一時.vbsファイル＋
// wscript.exeに戻り値をファイル経由で受け渡す方式にする
#[cfg(target_os = "windows")]
pub fn pick_installer_file(app_name: &str) -> io::Result<Option<PathBuf>> {
	let _ = app_name;
	let dir = std::env::temp_dir();
	let pid = std::process::id();
	let script_path = dir.join(format!("snlegacy_pick_{pid}.vbs"));
	let out_path = dir.join(format!("snlegacy_pick_{pid}.txt"));

	let vbs = format!(
		"Set objDialog = CreateObject(\"UserAccounts.CommonDialog\")\r\n\
		 objDialog.Filter = \"Installer (*.exe)|*.exe\"\r\n\
		 objDialog.FilterIndex = 1\r\n\
		 result = \"\"\r\n\
		 If objDialog.ShowOpen Then\r\n\
		 \tresult = objDialog.FileName\r\n\
		 End If\r\n\
		 Set fso = CreateObject(\"Scripting.FileSystemObject\")\r\n\
		 Set f = fso.CreateTextFile(\"{}\", True)\r\n\
		 f.Write result\r\n\
		 f.Close\r\n",
		out_path.display().to_string().replace('\\', "\\\\"),
	);
	std::fs::write(&script_path, vbs)?;

	Command::new("wscript.exe").arg("//nologo").arg(&script_path).status()?;

	let result = std::fs::read_to_string(&out_path).unwrap_or_default();
	let _ = std::fs::remove_file(&script_path);
	let _ = std::fs::remove_file(&out_path);

	let trimmed = result.trim();
	Ok(if trimmed.is_empty() { None } else { Some(PathBuf::from(trimmed)) })
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn pick_installer_file(_app_name: &str) -> io::Result<Option<PathBuf>> {
	Ok(None)	// 配布対象外プラットフォーム
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
