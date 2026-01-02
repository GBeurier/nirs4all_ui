# Quick Guide: Rebuild Production Executable

## Steps to rebuild after the fix

### 1. Ensure the nirs4all library is available
Make sure the `nirs4all` library folder exists at:
```
c:\Workspace\ML\nirs4all\
```

The spec file will automatically detect and include it during the build.

### 2. Build the frontend (if not already built)
```bash
cd c:\Workspace\ML\nirs4all_ui
npm run build
```

This creates the `dist` folder with the compiled frontend.

### 3. Clean previous build (optional but recommended)
```bash
Remove-Item -Recurse -Force .\build
Remove-Item -Recurse -Force .\dist\nirs4all  # The exe dist, not frontend dist
```

### 4. Build the executable
```bash
pyinstaller nirs4all.spec
```

The executable will be created at:
```
.\build\nirs4all\nirs4all.exe
```

### 5. Test the executable
```bash
.\build\nirs4all\nirs4all.exe
```

Then try to:
1. Change the workspace folder
2. Link a dataset
3. Verify no errors appear

## What changed?

The fix ensures that:
- ✅ The `nirs4all` library modules are bundled with the executable
- ✅ The `dataset_config_parser` module is properly imported using standard Python imports
- ✅ Both development and production modes work identically

## Troubleshooting

### If you still see the error:
1. Check that `nirs4all` folder exists in the parent directory
2. Verify the build output shows: `Including nirs4all library from: ...`
3. Try deleting the `build` folder and rebuilding

### If the executable is too large:
The nirs4all library adds some size. You can optimize by:
- Using UPX compression (already enabled)
- Excluding unused nirs4all modules in the spec file

### If imports fail:
Check the console output when running the exe for any import errors related to missing dependencies.
