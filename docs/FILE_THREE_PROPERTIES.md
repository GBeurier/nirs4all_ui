# Dataset File Configuration - Three Properties System

## Overview

Each file in a dataset has THREE independent properties:

1. **Type**: What the file contains (X, Y, or metadata)
2. **Split**: Training or test data
3. **Source**: For X files only - which source/instrument (1, 2, 3, etc.)

## File Property Details

### 1. Type (Required)
- **X (Spectra)**: Spectroscopic data, features matrix
- **Y (Analyte)**: Target values, labels
- **Metadata**: Additional information about samples

### 2. Split (Required)
- **Train**: Training data
- **Test**: Test/validation data

### 3. Source (X files only)
- **1, 2, 3, 4, 5**: Source/instrument number
- Used when dataset has multiple X matrices from different sources
- Sources are concatenated along axis 0
- **N/A for Y and metadata files**

## Data Handling Logic

### Multiple X Files with Same Source
Files with the same type, split, and source are **vstacked**:
```
X_train_source1_part1.csv  } vstacked into
X_train_source1_part2.csv  } single X_train_source1
```

### Multiple Sources
Files with different sources are **concatenated** (axis 0):
```
X_train_source1.csv  } concatenated into
X_train_source2.csv  } multi-source X_train
```

### Examples

#### Single Source Dataset
```
File                Type  Split  Source
─────────────────────────────────────
X_train.csv         X     train  1
Y_train.csv         Y     train  —
X_test.csv          X     test   1
Y_test.csv          Y     test   —
```

#### Multi-Source Dataset
```
File                Type  Split  Source
─────────────────────────────────────
X_train_s1.csv      X     train  1
X_train_s2.csv      X     train  2
Y_train.csv         Y     train  —
X_test_s1.csv       X     test   1
X_test_s2.csv       X     test   2
Y_test.csv          Y     test   —
metadata.csv        meta  train  —
```

#### Multiple X Files (Same Source)
```
File                Type  Split  Source
─────────────────────────────────────
X_train_1.csv       X     train  1     } vstacked
X_train_2.csv       X     train  1     }
Y_train.csv         Y     train  —
X_test.csv          X     test   1
Y_test.csv          Y     test   —
```

## UI Design

### File List Display
Each file shows:
```
┌────────────────────────────────────────────────┐
│ 📄 X_train_source2.csv              ✓ Auto  ✕ │
│ ┌──────────┬──────────┬─────────────────────┐ │
│ │ Type     │ Split    │ Source              │ │
│ │ [X ▼]    │ [Train▼] │ [Source 2 ▼]       │ │
│ └──────────┴──────────┴─────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Add More Files Button
Located at top-right of file list:
- Opens file picker again
- Auto-detects properties from filenames
- Auto-increments source numbers for X files
- Appends to existing file list

## Auto-Detection Rules

### From Filename Patterns

**Type Detection**:
- Contains `y_` or `y-` → Y
- Contains `metadata` → metadata
- Otherwise → X

**Split Detection**:
- Contains `test` → test
- Otherwise → train

**Source Detection** (X files only):
- Pattern `source\d+` or `s\d+` → extract number
- Example: `X_train_source2.csv` → source 2
- Example: `X_train_s3.csv` → source 3
- No pattern → source 1 (default)

## Backend Data Structure

### Sent to Backend
```json
{
  "delimiter": ";",
  "decimal_separator": ".",
  "has_header": true,
  "header_type": "nm",
  "files": [
    {
      "path": "/path/to/X_train.csv",
      "type": "X",
      "split": "train",
      "source": 1
    },
    {
      "path": "/path/to/Y_train.csv",
      "type": "Y",
      "split": "train",
      "source": null
    },
    {
      "path": "/path/to/X_train_s2.csv",
      "type": "X",
      "split": "train",
      "source": 2
    }
  ]
}
```

### Backend Processing Logic
```python
# Group by type, split, source
grouped = {}
for file_info in config['files']:
    key = (file_info['type'], file_info['split'], file_info['source'])
    if key not in grouped:
        grouped[key] = []
    grouped[key].append(file_info['path'])

# For each group, vstack files with same key
for (ftype, split, source), paths in grouped.items():
    if len(paths) > 1:
        # Vstack multiple files with same properties
        data = [pd.read_csv(p, delimiter=delimiter) for p in paths]
        combined = pd.concat(data, axis=0, ignore_index=True)
    else:
        combined = pd.read_csv(paths[0], delimiter=delimiter)

    # Store with key
    if ftype == 'X':
        X_data[split][source] = combined
    elif ftype == 'Y':
        Y_data[split] = combined
    else:
        metadata[split] = combined

# Then concatenate sources (axis 0)
X_train_combined = concatenate_sources(X_data['train'])  # axis 0
X_test_combined = concatenate_sources(X_data['test'])    # axis 0
```

## Features

### ✅ Three Independent Properties
- Type, Split, Source configured separately
- Clear dropdowns for each property
- Source only enabled for X files

### ✅ Add More Files
- Button at top of file list
- Opens file picker to add additional files
- Auto-detects properties
- Auto-increments source numbers

### ✅ Remove Files
- ✕ button on each file
- Removes file from configuration
- Can be re-added later

### ✅ Auto-Detection
- Detects type from filename
- Detects split from filename
- Detects source number from filename
- Shows ✓ Auto badge when auto-detected

### ✅ Manual Override
- All properties editable via dropdowns
- Source dropdown shows 1-5
- Type changes clear source if not X

## Validation Rules

### Required
- At least one X file (train or test)
- At least one Y file (train or test)

### Recommended
- X_train and Y_train
- X_test and Y_test
- Matching sources in train/test

### Optional
- Metadata files
- Multiple sources
- Multiple files per configuration

## Testing Checklist

### Single Source Dataset
1. Select 4 files: X_train, Y_train, X_test, Y_test
2. ✅ All auto-detected correctly
3. ✅ X files show source 1
4. ✅ Y files show N/A for source
5. Add dataset

### Multi-Source Dataset
1. Select files with source numbers in names
2. ✅ Sources auto-detected (1, 2, 3)
3. ✅ Can adjust source via dropdown
4. Add dataset

### Add More Files
1. Initial selection: X_train, Y_train
2. Click "+ Add More Files"
3. Select: X_test, Y_test
4. ✅ New files appended to list
5. ✅ Properties auto-detected
6. Add dataset

### Remove Files
1. Select 5 files
2. Click ✕ on one file
3. ✅ File removed from list
4. ✅ Can continue without it
5. Add dataset

### Manual Configuration
1. Select files with unclear names
2. ✅ Auto-detection makes best guess
3. Manually adjust Type/Split/Source
4. ✅ Dropdowns work correctly
5. ✅ Source disabled for Y/metadata
6. Add dataset

## Build Status

```
✓ 69 modules transformed.
dist/assets/index-Gb7I9cPH.js   415.10 kB
```

Ready to test with `.\start_app.bat`
