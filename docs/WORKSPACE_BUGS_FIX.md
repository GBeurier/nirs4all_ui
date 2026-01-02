# Workspace Dataset Display and Config Saving Bugs - Fix Summary

## Issues Fixed

### Bug 1: All Datasets Show Pipe Separator ("|") in Features Column
**Problem:** The feature count was displaying with a pipe separator (e.g., "100|100") for all datasets, even single-source datasets. The pipe should only appear for multi-source datasets.

**Root Cause:** The `formatNumFeatures` function in `DatasetTable.tsx` was always attempting to split and join with pipes, without checking if the dataset actually has multiple sources.

**Fix:** Updated the logic to check `num_sources` first and only use pipe separators when `num_sources > 1`.

**File Changed:** `src/components/DatasetTable.tsx`

**Before:**
```tsx
const formatNumFeatures = (d: Dataset): string => {
  const nfAny: any = (d as any).num_features_per_source ?? (d as any).num_features;
  if (Array.isArray(nfAny)) return nfAny.join(' | ');
  if (typeof nfAny === 'number') return String(nfAny);
  if (typeof nfAny === 'string') {
    if ((nfAny as string).includes(',')) return (nfAny as string).split(',').map((s) => s.trim()).join(' | ');
    if ((nfAny as string).includes(';')) return (nfAny as string).split(';').map((s) => s.trim()).join(' | ');
    if (d.num_sources && d.num_sources > 1 && /\d+\s+\d+/.test(nfAny)) return (nfAny as string).split(/\s+/).join(' | ');
    return nfAny as string;
  }
  return 'N/A';
};
```

**After:**
```tsx
const formatNumFeatures = (d: Dataset): string => {
  const nfAny: any = (d as any).num_features_per_source ?? (d as any).num_features;
  const numSources = (d as any).num_sources ?? (d as any).sources ?? 1;

  // Only use pipe separator for multi-source datasets
  if (numSources > 1) {
    if (Array.isArray(nfAny)) return nfAny.join(' | ');
    if (typeof nfAny === 'string') {
      if ((nfAny as string).includes(',')) return (nfAny as string).split(',').map((s) => s.trim()).join(' | ');
      if ((nfAny as string).includes(';')) return (nfAny as string).split(';').map((s) => s.trim()).join(' | ');
      if (/\d+\s+\d+/.test(nfAny)) return (nfAny as string).split(/\s+/).join(' | ');
    }
  }

  // Single source or fallback: just return the number
  if (Array.isArray(nfAny)) return String(nfAny[0] ?? 'N/A');
  if (typeof nfAny === 'number') return String(nfAny);
  if (typeof nfAny === 'string') return nfAny;
  return 'N/A';
};
```

**Result:**
- Single-source datasets: Display "100" (no pipe)
- Multi-source datasets: Display "100 | 50 | 80" (with pipes)

---

### Bug 2: Dataset Properties (Delimiter, etc.) Not Saved on Edit
**Problem:** When editing a dataset and changing the delimiter or other CSV parsing options, the changes were not being saved. The dataset would always revert to semicolon (";") delimiter.

**Root Cause:** The `EditDatasetModal` component was calling `onSave()` with only 2 parameters (datasetId and config), but the parent function `handleSaveDatasetConfig` in `WorkspacePage.tsx` expects 3 parameters (datasetId, config, **and files**). Without the files array, the backend API couldn't properly save the config along with the file structure.

**Fix:**
1. Updated `EditDatasetModal` to import `apiClient` and call `detectDatasetFiles()` to get the current file structure
2. Updated the `onSave` prop signature to include the `files` parameter
3. Modified `handleSave` to detect files before calling `onSave`

**Files Changed:** `src/components/EditDatasetModal.tsx`

**Changes Made:**

1. **Added imports:**
```tsx
import type { Dataset, DatasetFile } from '../types';
import { apiClient } from '../api/client';
```

2. **Updated prop interface:**
```tsx
interface EditDatasetModalProps {
  dataset: Dataset;
  onClose: () => void;
  onSave: (datasetId: string, config: any, files: DatasetFile[]) => Promise<void>;
}
```

3. **Updated handleSave function:**
```tsx
const handleSave = async () => {
  setLoading(true);
  try {
    const configToSave: any = {
      delimiter: config.delimiter,
      decimal_separator: config.decimalSeparator,
      has_header: config.header !== 'none',
    };

    // ... (header and file path configuration)

    // Detect files from the dataset using the backend
    const detectedFilesResponse = await apiClient.detectDatasetFiles(dataset.id);
    const detectedFiles: DatasetFile[] = detectedFilesResponse.files || [];

    // Call save with config and detected files
    await onSave(dataset.id, configToSave, detectedFiles);
    onClose();
  } catch (error) {
    console.error('Failed to save dataset config:', error);
    alert('Failed to save dataset configuration: ' + String(error));
  } finally {
    setLoading(false);
  }
};
```

**Result:**
- Delimiter changes (e.g., ";" to ",") are now properly saved
- Decimal separator changes are saved
- Header type changes are saved
- All CSV parsing options persist after editing

---

## Testing

### Test Bug 1 Fix:
1. Open the Workspace page
2. Link a single-source dataset
3. Verify the features column shows just a number (e.g., "100") without pipes
4. Link a multi-source dataset
5. Verify the features column shows numbers with pipes (e.g., "100 | 50")

### Test Bug 2 Fix:
1. Open the Workspace page
2. Click "Edit" on any dataset
3. Change the delimiter from ";" to ","
4. Change decimal separator from "." to ","
5. Click "Save Configuration"
6. Refresh the page or reopen the edit modal
7. Verify the delimiter and decimal separator are still set to ","

---

## Technical Details

### API Flow for Config Saving:
1. User clicks "Save Configuration" in EditDatasetModal
2. EditDatasetModal calls `apiClient.detectDatasetFiles(datasetId)`
3. Backend returns current file structure for the dataset
4. EditDatasetModal calls `onSave(datasetId, config, files)`
5. WorkspacePage calls `apiClient.loadDataset(datasetId, config, files)`
6. Backend API endpoint `/api/workspace/dataset/{id}/load` receives config + files
7. Backend saves config to workspace JSON and reloads dataset with new settings
8. Workspace is refreshed with updated dataset info

### Why This Works:
The backend's `load_dataset_info` function needs both:
- **config**: CSV parsing options (delimiter, decimal_separator, etc.)
- **files**: File structure (which files are X, Y, train, test, etc.)

Without the files array, the backend only has the parsing options but doesn't know which files to apply them to, so the config is effectively ignored.

---

## Files Modified

1. ✅ `src/components/DatasetTable.tsx` - Fixed feature display logic
2. ✅ `src/components/EditDatasetModal.tsx` - Fixed config saving with files parameter

## Related Files (not modified but important for understanding):
- `src/pages/WorkspacePage.tsx` - Calls EditDatasetModal with handleSaveDatasetConfig
- `src/api/client.ts` - Defines loadDataset and detectDatasetFiles API calls
- `api/workspace_manager.py` - Backend logic for load_dataset_info
