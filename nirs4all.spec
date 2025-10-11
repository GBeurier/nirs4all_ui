# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# Get the current directory
curr_dir = Path(os.getcwd())

# Collect all files from dist directory
dist_datas = []
dist_dir = curr_dir / 'dist'
if dist_dir.exists():
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(curr_dir)
            dist_datas.append((str(file_path), str(rel_path.parent)))

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=dist_datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='nirs4all',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Set to False for windowed app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path here if you have one
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='nirs4all',
)
