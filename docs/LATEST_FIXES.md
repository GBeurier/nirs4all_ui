# Latest Fixes - October 12, 2025

## Three New Issues Fixed

### 1. ✅ Pin Pipeline 405 Error - FIXED

**Problem**:
```
POST http://localhost:8000/api/pipeline 405 (Method Not Allowed)
Failed to save pipeline
```

**Root Cause**: Backend was missing the `POST /api/pipeline` endpoint.

**Solution**: Added endpoint in `api/pipelines.py`:
```python
@router.post("/pipeline")
async def save_pipeline(name, description, pipeline):
    # Creates sanitized filename
    # Saves to workspace/pipelines/
    # Returns success with id and path
```

**Files Changed**: `api/pipelines.py`

---

### 2. ✅ Export Pipeline Not Creating File - FIXED

**Problem**: Export button logs to console but no file created.

**Root Cause**: Using browser download (`a.download`) which doesn't work in pywebview.

**Solution**: Updated to use native save dialog:
```typescript
// Now checks if pywebview available
if (isPywebviewAvailable()) {
  // Use native dialog + API write
  const path = await saveFileDialog();
  await writeLocalFile(path, json);
} else {
  // Browser download fallback
  a.download = 'pipeline.json';
  a.click();
}
```

**Files Changed**: `src/pages/PipelinePage.tsx`

---

### 3. ✅ Multiple File Selection List Display - FIXED

**Problem**: When selecting multiple CSV files, modal didn't show list or allow role assignment.

**Solution**:
1. Added `selectedFiles` state (array of paths)
2. Added `fileRoles` state (path → role mapping)
3. Auto-detect roles from filenames
4. Show UI with file list and dropdowns
5. User can assign: X_train, Y_train, X_test, Y_test, metadata, source

**Files Changed**: `src/components/AddDatasetModal.tsx`

**UI Now Shows**:
```
Selected Files (4):
📄 x_train.csv       [X_train ▼]
📄 y_train.csv       [Y_train ▼]
📄 x_test.csv        [X_test ▼]
📄 y_test.csv        [Y_test ▼]
```

---

## Testing

### Pin Pipeline
1. Build pipeline with components
2. Click Pin button (📌)
3. Enter name/description → Click Pin
4. ✅ Should save to workspace/pipelines/

### Export Pipeline
1. Build pipeline
2. Click Export
3. ✅ Native save dialog opens
4. Choose location → Click Save
5. ✅ File created at location
6. ✅ Success alert shown

### Multiple Files
1. Workspace → Add Dataset
2. Click "File(s)" button
3. Select multiple CSVs (Ctrl+Click)
4. ✅ Shows list with role dropdowns
5. ✅ Roles auto-detected from names
6. Adjust roles if needed
7. Click Add Dataset

---

## Build & Run

```bash
npm run build
.\start_app.bat
```

---

## Backend TODO

`api/datasets.py` needs update to handle file roles:
```python
@router.post("/datasets")
async def add_dataset(
    path: str,
    config: dict,
    file_roles: dict = None  # NEW: {path: role}
):
    if file_roles:
        # Handle multiple files with roles
    else:
        # Handle single path (folder or file)
```

Frontend now sends this data, backend needs to consume it.
