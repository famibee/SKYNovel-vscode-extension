# -*- coding: utf-8 -*-
"""
test/ui/runUI.ts の (VE)→Explorer D&D ケースが呼び出す、Windows 実機用の
ドラッグ実行スクリプト。win_explorer_drag.py（Explorer→(VE)方向）の逆方向。

VSCode側（送り元）の座標は呼び出し側(runUI.ts)が window.devicePixelRatio込みで
物理ピクセルに変換済みのものを渡してくる。送り先(実Explorerウィンドウ)を
このスクリプトが開き、そこへ向けてSendInputでドラッグする。

依存: pywinauto, pywin32 (win_explorer_drag.txt 参照)

使い方:
    python win_explorer_drop.py <start_x> <start_y> <dest_dir> <filename> [ctrl]

標準出力の最後の行に `RESULT:{"dropped": true/false}` を1行で出す。
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
    if len(sys.argv) not in (5, 6):
        print("usage: win_explorer_drop.py <start_x> <start_y> <dest_dir> <filename> [ctrl]", file=sys.stderr)
        return 1
    start_x, start_y = int(sys.argv[1]), int(sys.argv[2])
    # ⚠️ win_explorer_drag.py と同じ地雷：`/` が混ざると explorer.exe が
    # 既定フォルダを開いてしまう。normpath で `\` 区切りに揃える
    dest_dir = os.path.normpath(sys.argv[3])
    filename = sys.argv[4]
    use_ctrl = len(sys.argv) == 6 and sys.argv[5].lower() == "ctrl"

    os.makedirs(dest_dir, exist_ok=True)
    subprocess.Popen(["explorer.exe", dest_dir])

    hwnd_dst = None
    for _ in range(10):  # 最大 10 * 0.5s = 5s
        time.sleep(0.5)
        hwnd_dst = find_hwnd_by_path(dest_dir)
        if hwnd_dst:
            break
    if not hwnd_dst:
        print("RESULT:" + json.dumps({"dropped": False, "reason": "dest explorer window not found"}))
        return 1

    work_x = user32.GetSystemMetrics(0)
    work_y = user32.GetSystemMetrics(1)
    half_w = work_x // 2
    win32gui.ShowWindow(hwnd_dst, 9)  # SW_RESTORE
    # 送り元(VSCode)はプライマリモニタ左半分に配置済みという前提で、
    # 送り先Explorerは右半分に配置する(重なり回避)。前面化はしない
    # (送り元側の入力受け取りに影響する可能性があるため)
    win32gui.MoveWindow(hwnd_dst, half_w, 0, half_w, work_y, True)
    time.sleep(0.3)

    client = win32gui.GetClientRect(hwnd_dst)
    topleft = win32gui.ClientToScreen(hwnd_dst, (0, 0))
    cw = client[2] - client[0]
    ch = client[3] - client[1]
    end = (topleft[0] + cw // 2, topleft[1] + int(ch * 0.6))

    before = set(os.listdir(dest_dir))
    print(f"[info] start=({start_x},{start_y}) end={end} ctrl={use_ctrl}")

    if use_ctrl:
        win32api.keybd_event(win32con.VK_CONTROL, 0, 0, 0)
        time.sleep(0.1)
    try:
        drag((start_x, start_y), end)
    finally:
        if use_ctrl:
            win32api.keybd_event(win32con.VK_CONTROL, 0, win32con.KEYEVENTF_KEYUP, 0)

    time.sleep(0.3)
    after = set(os.listdir(dest_dir))
    dropped = filename in after

    try:
        win32gui.PostMessage(hwnd_dst, win32con.WM_CLOSE, 0, 0)
    except Exception:
        pass

    print("RESULT:" + json.dumps({"dropped": dropped, "before": sorted(before), "after": sorted(after)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
