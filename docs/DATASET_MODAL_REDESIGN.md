# AddDatasetModal Redesign - Two-Step Flow

## Changes Made

### 1. ✅ Removed Export Button from Pipeline
- Removed Export button from PipelineToolbar
- Removed `onExport` prop and handler
- Save button now handles all file saving needs

**Files Changed**:
- `src/pages/PipelinePage.tsx` - Removed exportPipeline function
- `src/components/pipeline/PipelineToolbar.tsx` - Removed Export button and icon

---

### 2. ✅ Redesigned AddDatasetModal with Two-Step Flow

**New Flow**:

#### Step 1: Select Source (Clean Choice)
```
┌─────────────────────────────────────┐
│  Choose how to add your dataset:   │
│                                     │
│  ┌───────────┐    ┌───────────┐   │
│  │  📁 Folder │    │  📄 Files  │   │
│  │           │    │           │   │
│  │ Auto-detect│    │  Manual   │   │
│  └───────────┘    └───────────┘   │
└─────────────────────────────────────┘
```

- No confusing checkboxes
- No path input field
- Just two big, clear buttons
- Folder: Auto-detect X_train, Y_train, X_test, Y_test
- Files: Select multiple CSVs manually

#### Step 2: Configure Dataset
```
┌─────────────────────────────────────┐
│  Configure Dataset                  │
│                                     │
│  📁 Folder Path or Selected Files   │
│                                     │
│  Dataset Files:                     │
│  ┌─────────────────────────────┐   │
│  │ 📄 X_train.csv  [X_train ▼] │   │
│  │ 📄 Y_train.csv  [Y_train ▼] │   │
│  │ 📄 X_test.csv   [X_test  ▼] │   │
│  │ 📄 Y_test.csv   [Y_test  ▼] │   │
│  └─────────────────────────────┘   │
│                                     │
│  CSV Parsing Options:               │
│  ├─ Delimiter: [;  ▼]              │
│  ├─ Decimal: [.  ▼]                │
│  └─ Header: [nm  ▼]                │
│                                     │
│  Dataset Info:                      │
│  ├─ Samples: -- (calculating...)   │
│  └─ Features: --                   │
│                                     │
│  [← Back]      [Cancel] [Add]      │
└─────────────────────────────────────┘
```

**Key Features**:
- Clean file list with icons
- Role dropdown for each file
- Auto-detection from filenames (folder mode shows ✓)
- CSV parsing options (delimiter, decimal, header)
- Placeholder for n_samples/n_features (backend calculates)
- Back button to change source

---

## Implementation Details

### State Management
```typescript
// Step control
const [step, setStep] = useState<'select' | 'configure'>('select');
const [sourceType, setSourceType] = useState<'folder' | 'files' | null>(null);

// Files
const [datasetPath, setDatasetPath] = useState('');
const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
const [detectedFiles, setDetectedFiles] = useState<any[]>([]);

// Each detected file has: { path, role, detected: boolean }
```

### Auto-Detection Logic

**Folder Mode**:
1. User selects folder
2. Backend scans for X_train.csv, Y_train.csv, etc.
3. Returns detected files with `detected: true` flag
4. User can adjust roles if needed

**Files Mode**:
1. User selects multiple CSVs
2. Frontend auto-detects roles from filenames:
   - `x_train.csv` → X_train
   - `y_train.csv` → Y_train
   - etc.
3. Files shown with `detected: false` (manual selection)
4. User can adjust roles

### Backend Integration

The modal sends this config to backend:
```python
{
  "delimiter": ";",
  "decimal_separator": ".",
  "has_header": true,
  "header_type": "nm",  # if applicable
  "files": {            # for files mode
    "/path/to/x_train.csv": "X_train",
    "/path/to/y_train.csv": "Y_train",
    "/path/to/x_test.csv": "X_test",
    "/path/to/y_test.csv": "Y_test"
  }
}
```

---

## What Was Removed

### Removed UI Elements:
- ❌ "This is a folder" checkbox
- ❌ Path input field (replaced with buttons)
- ❌ "Browse Folder/File" combined button
- ❌ Auto-detected checkmarks panel (now inline)
- ❌ Data type checkboxes (hasX, hasY, hasMetadata)

### Removed State:
- ❌ `isFolder` boolean
- ❌ `autoDetected` boolean
- ❌ `fileRoles` dict (replaced with `detectedFiles` array)

### Simplified Logic:
- No manual path pasting (use dialogs)
- No folder/file mode toggle
- No separate file list vs detected files display

---

## User Experience

### Old Flow (Confusing):
1. Click "Add Dataset"
2. See empty path input + 2 buttons + checkbox
3. Click Folder or File(s)
4. Path appears but... is it a folder?
5. Check/uncheck "this is a folder"
6. If files, see list somewhere else
7. Scroll to find parsing options
8. Click Add

### New Flow (Clear):
1. Click "Add Dataset"
2. See two big option cards: Folder or Files
3. Click one
4. Configure screen shows:
   - What you selected (path/files)
   - All files in clean list
   - Parsing options right below
5. Validate, adjust roles if needed
6. Click Add

---

## Next Steps for Backend

### Folder Detection Endpoint
```python
@router.post("/datasets/detect")
async def detect_folder_structure(folder_path: str):
    """
    Scan folder and return detected dataset files

    Returns:
    {
      "files": [
        {"path": "X_train.csv", "role": "X_train", "detected": true},
        {"path": "Y_train.csv", "role": "Y_train", "detected": true},
        ...
      ],
      "n_samples": 1000,
      "n_features": 256
    }
    """
```

### Dataset Info Calculation
```python
@router.post("/datasets/info")
async def get_dataset_info(
    files: dict,  # {path: role}
    config: dict  # delimiter, etc.
):
    """
    Read files and return n_samples, n_features

    Returns:
    {
      "n_samples": 1000,
      "n_features": 256,
      "valid": true
    }
    """
```

---

## Testing Checklist

### Folder Mode:
1. Click "Add Dataset"
2. Click "Select Folder" card
3. ✅ Choose folder with native dialog
4. ✅ See "Configure Dataset" screen
5. ✅ File list shows detected files with green ✓
6. ✅ Roles auto-assigned (X_train, Y_train, etc.)
7. ✅ Can change role via dropdown
8. ✅ CSV options available
9. ✅ Back button returns to selection
10. ✅ Add Dataset button enabled

### Files Mode:
1. Click "Add Dataset"
2. Click "Select Files" card
3. ✅ Choose multiple CSVs (Ctrl+Click)
4. ✅ See "Configure Dataset" screen
5. ✅ File list shows all selected files
6. ✅ Roles auto-detected from names
7. ✅ Can change role via dropdown
8. ✅ CSV options available
9. ✅ Back button returns to selection
10. ✅ Add Dataset button enabled

---

## Build Complete

```bash
✓ 69 modules transformed.
dist/assets/index-BI-ck9kK.js   412.19 kB
```

Ready to test with `.\start_app.bat`
