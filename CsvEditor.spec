# -*- mode: python ; coding: utf-8 -*-
APP_NAME = "CsvEditor"

import os
import re
import json
import shutil


# def source_folder_move(dist_path):
#     try:
#         shutil.move(os.path.join(dist_path, "_internal", "static"), dist_path)
#     except Exception as e:
#         raise FileExistsError(f"static 폴더 이동에 실패하였습니다.\n{e}")


# 버전 정보 확인
with open("CsvEditor.py", "r", encoding="utf-8") as f:
    cont = f.read()
# Accept VERSION strings like "0.0.1" or "v0.0.1" with either quote style
# If multiple VERSION lines exist, use the last one found (treat as latest)
matches = re.findall(r"VERSION\s*=\s*['\"]v?(\d+\.\d+\.\d+)['\"]", cont)
ver_info = matches[-1] if matches else None

if not ver_info:
    raise ValueError(
        "======================Could not find version info=====================\n ==> Check CsvEditor.py"
    )

print("===================== Building Application =====================")
print(f"Building {APP_NAME} {ver_info}")
print("===============================================================")


block_cipher = None

a = Analysis(
    ["CsvEditor.py"],
    pathex=[],
    binaries=[],
    datas=[("static/", "static/")],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["PyQt5", "PyQt5.sip", "PyQt6", "PySide2", "PySide6"],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name=f"{APP_NAME} {ver_info}",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    icon="ico/favicon.ico",
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    runtime_tmpdir=os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "CsvEditor", ".run"
    ),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=f"{APP_NAME} {ver_info}",
)

# # 빌드 산출물 정리
# dest_dir = os.path.join("dist", f"{APP_NAME} {ver_info}")
# try:
#     source_folder_move(dest_dir)
# except Exception:
#     pass
