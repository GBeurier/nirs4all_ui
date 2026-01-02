# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# Get the current directory
curr_dir = Path(os.getcwd())

# Collect all files from dist directory (frontend build)
dist_datas = []
dist_dir = curr_dir / 'dist'
if dist_dir.exists():
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(curr_dir)
            dist_datas.append((str(file_path), str(rel_path.parent)))

# Collect all files from public directory
public_datas = []
public_dir = curr_dir / 'public'
if public_dir.exists():
    for root, dirs, files in os.walk(public_dir):
        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(curr_dir)
            public_datas.append((str(file_path), str(rel_path.parent)))

# Collect all API files (backend)
api_datas = []
api_dir = curr_dir / 'api'
if api_dir.exists():
    for root, dirs, files in os.walk(api_dir):
        # Skip __pycache__ directories
        if '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                file_path = Path(root) / file
                rel_path = file_path.relative_to(curr_dir)
                api_datas.append((str(file_path), str(rel_path.parent)))

# Combine all data files
all_datas = dist_datas + public_datas + api_datas

# Add main.py (backend entry point)
main_py = curr_dir / 'main.py'
if main_py.exists():
    all_datas.append((str(main_py), '.'))

# Check if nirs4all library exists in parent directory (development mode)
nirs4all_lib_dir = curr_dir.parent / 'nirs4all' / 'nirs4all'
if nirs4all_lib_dir.exists():
    print(f"Including nirs4all library from: {nirs4all_lib_dir}")
    # Add the nirs4all package to be bundled
    for root, dirs, files in os.walk(nirs4all_lib_dir):
        # Skip __pycache__, .git, tests, etc.
        dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', 'tests', '.pytest_cache', '__init__.pyc']]
        for file in files:
            if file.endswith('.py'):
                file_path = Path(root) / file
                # Calculate the relative path for the destination
                # We want to preserve the 'nirs4all' package structure
                rel_to_parent = file_path.relative_to(curr_dir.parent)
                all_datas.append((str(file_path), str(rel_to_parent.parent)))

# Prefer the dedicated nirs4all icon if available, otherwise fall back to legacy naming
icon_candidates = [
    curr_dir / 'public' / 'nirs4all_icon.ico',
    curr_dir / 'public' / 'nirs4all.ico',
]
exe_icon = None
for icon_path in icon_candidates:
    if icon_path.exists():
        exe_icon = str(icon_path)
        break

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=all_datas,
    hiddenimports=[
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'fastapi',
        'fastapi.staticfiles',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'starlette.middleware',
        'starlette.middleware.cors',
        'api.workspace',
        'api.datasets',
        'api.pipelines',
        'api.predictions',
        'api.workspace_manager',
        # nirs4all library modules
        'nirs4all',
        'nirs4all.dataset',
        'nirs4all.dataset.dataset_config',
        'nirs4all.dataset.dataset_config_parser',
        'nirs4all.dataset.loader',
    ],
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
    console=True,  # Set to True to show console for backend logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=exe_icon,  # Use public/nirs4all.ico if present
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
