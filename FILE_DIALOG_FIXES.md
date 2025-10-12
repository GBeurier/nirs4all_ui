# File Dialog Fixes - Production Mode

## Summary of Changes

This document describes the fixes made to file dialogs in production mode (pywebview).

## Issues Fixed

### 1. ✅ Multiple File Selection Enabled
- **Problem**: Users could only select one file at a time when adding datasets
- **Solution**: Added `allowMultiple` parameter to `select_file()` method in launcher.py
- **Impact**: Users can now select multiple CSV files at once in the dataset modal

### 2. ✅ Save File Dialog Return Value Fixed
- **Problem**: `save_file()` dialog wasn't returning the selected path correctly
- **Solution**: Added proper handling for tuple/list return values from pywebview
- **Impact**: Save and Export pipeline features should now work correctly

### 3. ✅ Debug Logging Added
- **Problem**: No visibility into what file dialogs were returning
- **Solution**: Added extensive logging throughout launcher.py file dialog methods
- **Impact**: Easier to debug file dialog issues in the future

## Changes Made

### `launcher.py`

1. **`select_file()` method**:
   - Added `allow_multiple=False` parameter with default value
   - Added logging to show dialog results
   - Returns array of files when `allow_multiple=True`
   - Returns single file path when `allow_multiple=False`

2. **`save_file()` method**:
   - Added logging to show dialog results and types
   - Added proper handling for tuple/list returns from pywebview
   - Extracts first element from tuple if needed
   - Returns path as string

### `src/utils/fileDialogs.ts`

1. **Type definitions**:
   - Updated `PywebviewApi.select_file` signature to accept `allowMultiple` parameter
   - Updated return type to `string | string[] | null`

2. **`selectFile()` function**:
   - Added `allowMultiple` parameter with default `false`
   - Passes parameter through to pywebview API
   - Returns array when multiple files selected

### `src/components/AddDatasetModal.tsx`

1. **`handleSelectFile()` function**:
   - Now passes `allowMultiple: true` to `selectFile()`
   - Handles both array and string return values
   - Uses first file as display path when multiple selected
   - Logs all selected files for future use

## Testing Checklist

After restarting the application, test:

- [ ] **Multiple file selection**: Click "File(s)" in Add Dataset modal, verify you can select multiple CSV files
- [ ] **Single file selection**: Open Pipeline should still work with single file
- [ ] **Save Pipeline**: Create/edit pipeline, click Save, verify file is created at selected location
- [ ] **Export Pipeline**: Click Export, verify JSON file is created
- [ ] **Console logs**: Check for `[save_file]`, `[select_file]` logs showing paths returned

## Known Issues

### App Freezing During Dialogs
- **Symptom**: Application freezes briefly when opening file dialogs
- **Cause**: pywebview file dialogs are synchronous and block the UI thread
- **Status**: This is expected behavior with pywebview - dialogs are modal and must complete before app continues
- **Workaround**: None - this is a limitation of the pywebview framework

### Backend Not Handling Multiple Files Yet
- **Status**: Frontend can now select multiple files, but backend dataset endpoints may need updates
- **Next Step**: Update `api/datasets.py` to handle arrays of file paths
- **Workaround**: Currently uses first file only

## Next Steps

1. **Test save/export functionality** - Verify files are actually written to disk
2. **Update backend for multiple files** - Modify dataset API to handle file arrays
3. **Add file count display** - Show "3 files selected" in UI when multiple files chosen
4. **Consider async dialogs** - Investigate if pywebview can use non-blocking dialogs

## Commands to Restart App

```bash
# Stop any running instances
taskkill /F /IM python.exe /FI "WINDOWTITLE eq nirs4all*"

# Start fresh
cd d:\Workspace\ML\NIRS\nirs4all_ui
.\start_app.bat
```

## Debugging Tips

1. **Check Python console** for `[save_file]` and `[select_file]` logs
2. **Check browser console** for frontend fileDialog logs
3. **Verify file paths** are absolute Windows paths (e.g., `C:\Users\...`)
4. **Test with simple filenames** first (no spaces or special characters)
