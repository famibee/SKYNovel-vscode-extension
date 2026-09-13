# -*- coding: utf-8 -*-
"""
test/ui/runUI.ts の Explorer→(VE) D&D ケースが呼び出す、Windows 実機用の
ドラッグ実行スクリプト。Playwright は自分が起動した Electron しか操作できず、
別プロセスの Explorer ウィンドウには触れないため、OS 層の入力シミュレーション
（SendInput）で実際にマウスを動かしてドラッグ&ドロップを行う。

src/docs/file-watch.md の「Explorer↔VSCode 自動化の可能性」節で実機検証済みの
方式（Desktop(backend="uia")で送り元アイテムの座標を取得 + 自前 SendInput で
ドラッグ）をそのまま使う。座標は呼び出し側(runUI.ts)が
window.devicePixelRatio込みで物理ピクセルに変換済みのものを渡してくる。

依存: pywinauto, pywin32 (win_explorer_drag.txt 参照。`pip install -r
test/ui/win_explorer_drag.txt` で導入)

使い方:
    python win_explorer_drag.py <src_file> <dest_x> <dest_y> [ctrl]

標準出力の最後の行に `RESULT:{"srcExists": true/false}` を1行で出す
（呼び出し側のNodeが正規表現で拾う）。
"""
import ctypes
import json
import os
import subprocess
import sys
import time
from ctypes import wintypes

import win32api
import win32com.client
import win32con
import win32gui
from pywinauto import Desktop

user32 = ctypes.windll.user32

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass

INPUT_MOUSE = 0
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_ABSOLUTE = 0x8000
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_VIRTUALDESK = 0x4000

SM_XVIRTUALSCREEN = 76
SM_YVIRTUALSCREEN = 77
SM_CXVIRTUALSCREEN = 78
SM_CYVIRTUALSCREEN = 79


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG), ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD), ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG)),
    ]


class INPUT(ctypes.Structure):
    class _I(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT)]

    _anonymous_ = ("i",)
    _fields_ = [("type", wintypes.DWORD), ("i", _I)]


def _virtual_screen():
    return (
        user32.GetSystemMetrics(SM_XVIRTUALSCREEN),
        user32.GetSystemMetrics(SM_YVIRTUALSCREEN),
        user32.GetSystemMetrics(SM_CXVIRTUALSCREEN),
        user32.GetSystemMetrics(SM_CYVIRTUALSCREEN),
    )


def _send_mouse(dx, dy, flags):
    extra = ctypes.pointer(wintypes.ULONG(0))
    mi = MOUSEINPUT(dx, dy, 0, flags, 0, extra)
    inp = INPUT(type=INPUT_MOUSE, mi=mi)
    user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(inp))


def move_to(x, y):
    vx, vy, vw, vh = _virtual_screen()
    nx = int((x - vx) * 65535 / max(vw - 1, 1))
    ny = int((y - vy) * 65535 / max(vh - 1, 1))
    _send_mouse(nx, ny, MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK)


def left_down():
    _send_mouse(0, 0, MOUSEEVENTF_LEFTDOWN)


def left_up():
    _send_mouse(0, 0, MOUSEEVENTF_LEFTUP)


def drag(start, end, threshold_steps=8, main_steps=30, step_sleep=0.02):
    sx, sy = start
    ex, ey = end
    move_to(sx, sy)
    time.sleep(0.15)
    left_down()
    time.sleep(0.1)
    for i in range(1, threshold_steps + 1):
        move_to(sx + i * 2, sy)
        time.sleep(step_sleep)
    for i in range(1, main_steps + 1):
        t = i / main_steps
        x = int(sx + (ex - sx) * t)
        y = int(sy + (ey - sy) * t)
        move_to(x, y)
        time.sleep(step_sleep)
    move_to(ex, ey)
    time.sleep(0.4)
    time.sleep(0.3)
    left_up()
    time.sleep(0.5)


def find_hwnd_by_path(target_path):
    shell = win32com.client.Dispatch("Shell.Application")
    target_norm = os.path.normcase(os.path.normpath(target_path))
    for w in shell.Windows():
        try:
            folder = w.Document.Folder.Self.Path
        except Exception:
            continue
        if os.path.normcase(os.path.normpath(folder)) == target_norm:
            return int(w.HWND)
    return None


def main():
    if len(sys.argv) not in (4, 5):
        print("usage: win_explorer_drag.py <src_file> <dest_x> <dest_y> [ctrl]", file=sys.stderr)
        return 1
    src_file = sys.argv[1]
    dest_x, dest_y = int(sys.argv[2]), int(sys.argv[3])
    use_ctrl = len(sys.argv) == 5 and sys.argv[4].lower() == "ctrl"

    # ⚠️ explorer.exe はパス中に `/` が混ざっていると解釈に失敗し、
    # 既定のフォルダー(手元の環境では「ドキュメント」)を開いてしまう
    # (実測済み)。normpath で `\` 区切りに揃えてから渡す
    src_dir = os.path.normpath(os.path.dirname(src_file))
    filename = os.path.basename(src_file)

    subprocess.Popen(["explorer.exe", src_dir])

    # VSCode拡張ホスト＋Playwrightが同時に動いている状況ではExplorerの
    # ウィンドウ登録(Shell.Applicationへの反映)が1.5秒より遅れることがあるため、
    # 固定sleepではなくポーリングで待つ
    hwnd_src = None
    for _ in range(10):  # 最大 10 * 0.5s = 5s
        time.sleep(0.5)
        hwnd_src = find_hwnd_by_path(src_dir)
        if hwnd_src:
            break
    if not hwnd_src:
        print("[FAIL] Explorerウィンドウを検出できませんでした", file=sys.stderr)
        return 1

    work_x = user32.GetSystemMetrics(0)
    work_y = user32.GetSystemMetrics(1)
    half_w = work_x // 2
    win32gui.ShowWindow(hwnd_src, 9)  # SW_RESTORE
    win32gui.MoveWindow(hwnd_src, 0, 0, half_w, work_y, True)
    win32gui.SetForegroundWindow(hwnd_src)
    time.sleep(0.5)

    src_win = Desktop(backend="uia").window(handle=hwnd_src)
    src_win.set_focus()
    time.sleep(0.3)
    items = [it for it in src_win.descendants(control_type="ListItem") if it.window_text() == filename]
    if not items:
        # 拡張子非表示設定などで完全一致しない場合のフォールバック
        items = src_win.descendants(control_type="ListItem")
    if not items:
        print("[FAIL] 送り元アイテムをUIAで見つけられませんでした", file=sys.stderr)
        return 1
    rect = items[0].rectangle()
    start = (rect.mid_point().x, rect.mid_point().y)
    end = (dest_x, dest_y)
    print(f"[info] start={start} end={end} ctrl={use_ctrl}")

    if use_ctrl:
        win32api.keybd_event(win32con.VK_CONTROL, 0, 0, 0)
        time.sleep(0.1)
    try:
        drag(start, end)
    finally:
        if use_ctrl:
            win32api.keybd_event(win32con.VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)

    try:
        win32gui.PostMessage(hwnd_src, win32con.WM_CLOSE, 0, 0)
    except Exception:
        pass

    src_exists = os.path.exists(src_file)
    print("RESULT:" + json.dumps({"srcExists": src_exists}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
