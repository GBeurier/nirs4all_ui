# Dataset Configuration System - Complete Architecture

## Overview
This document describes the comprehensive dataset configuration system that supports:
- Multiple files per dataset (X, Y, metadata)
- Train/test partitions
- Multiple X sources (stack/concatenate modes)
- Auto-detection and manual configuration
- Caching and refresh capabilities

## Data Models

### TypeScript (Frontend)

```typescript
interface DatasetFile {
  path: string;                      // Relative or absolute file path
  type: 'x' | 'y' | 'group';        // x=features, y=targets, group=metadata
  partition: 'train' | 'test';       // Data partition
  source_id?: number;                // For grouping multiple X sources
}

interface Dataset {
  id: string;
  name: string;
  path: string;                      // Base folder or primary file
  linked_at?: string;
  config?: DatasetConfig;
  files?: DatasetFile[];             // Individual file configurations
  groups?: string[];
  num_samples?: number;
  num_features?: number;
  num_targets?: number;
  num_sources?: number;
  last_loaded?: string;              // Timestamp of last load
}

interface DatasetConfig {
  delimiter?: string;                // CSV delimiter
  decimal_separator?: string;        // Decimal separator
  has_header?: boolean;             // Has header row
  header_type?: string;             // 'nm', 'cm-1', 'text'
  x_source_mode?: 'stack' | 'concat'; // Multi-source handling
  preprocessing?: {...};
  features?: {...};
}
```

## Workflows

### 1. Adding a Dataset

**User Action**: Click "Add Dataset"

**Process**:
1. User selects folder/file and configures CSV options
2. Frontend calls `POST /api/workspace/link` with path and config
3. Backend:
   - Calls `parse_config(path)` to detect files
   - Creates initial DatasetFile entries
   - Stores in workspace.json (not yet loaded)
4. Frontend: Opens edit modal to review/modify files

### 2. Configuring Files

**User Action**: Edit dataset or review after adding

**Process**:
1. Frontend calls `POST /api/workspace/dataset/{id}/detect-files`
2. Backend:
   - Loads dataset path
   - Calls `parse_config()` to find X/Y/group files
   - Maps to DatasetFile format:
     ```python
     {
       'path': 'Xcal.csv',
       'type': 'x',
       'partition': 'train',
       'source_id': None
     }
     ```
3. User reviews in modal:
   - Can add/remove files
   - Modify type/partition/source_id
   - Configure CSV options
4. Clicks "Save & Load Dataset"

### 3. Loading Dataset (Getting Dimensions)

**User Action**: Save configuration in edit modal

**Process**:
1. Frontend calls `POST /api/workspace/dataset/{id}/load` with config and files
2. Backend:
   - Constructs full config dict from DatasetFile array:
     ```python
     config = {
       'train_x': ['file1.csv', 'file2.csv'],  # From files with type='x', partition='train'
       'train_y': ['file3.csv'],
       'test_x': [...],
       ...
     }
     ```
   - Calls `load_XY()` from loader.py with config
   - Gets actual arrays and dimensions
   - Updates dataset info:
     ```python
     {
       'num_samples': 150,
       'num_features': 1000,
       'num_targets': 3,
       'num_sources': 2,
       'last_loaded': '2025-10-12T10:30:00'
     }
     ```
3. Saves to workspace.json (includes cache)
4. Frontend refreshes and shows dimensions in table

### 4. Refreshing Datasets

**User Action**: Click refresh button

**Process**:
1. Frontend calls `POST /api/datasets/{id}/refresh` for each dataset
2. Backend:
   - Reads config and files from workspace.json
   - Calls loader to re-load data
   - Updates dimensions
   - Saves to workspace.json
3. Frontend shows updated information

**Optimization**: Parallel refresh with Promise.all()

### 5. Caching Strategy

**workspace.json Structure**:
```json
{
  "datasets": [
    {
      "id": "dataset_1",
      "name": "corn_nirs",
      "path": "/data/corn",
      "linked_at": "2025-10-12T09:00:00",
      "last_loaded": "2025-10-12T10:30:00",
      "config": {
        "delimiter": ";",
        "decimal_separator": ".",
        "has_header": true,
        "x_source_mode": "stack"
      },
      "files": [
        {"path": "Xcal.csv", "type": "x", "partition": "train"},
        {"path": "Ycal.csv", "type": "y", "partition": "train"},
        {"path": "Xval.csv", "type": "x", "partition": "test"}
      ],
      "num_samples": 150,
      "num_features": 1000,
      "num_targets": 3,
      "num_sources": 1
    }
  ]
}
```

**On Startup**:
- Load workspace.json
- Display cached dimensions immediately
- No need to reload datasets unless modified or refreshed

**On Edit/Save**:
- Re-load dataset with new configuration
- Update cache with new dimensions
- last_loaded timestamp updated

## Backend Implementation

### Key Methods in workspace_manager.py

```python
def detect_dataset_files(self, dataset_id: str) -> List[Dict]:
    """
    Auto-detect files using parse_config.
    Returns list of DatasetFile dicts.
    """
    # 1. Get dataset path
    # 2. Call parse_config(path)
    # 3. Map train_x, train_y, test_x, etc. to DatasetFile format
    # 4. Return files array

def load_dataset_info(self, dataset_id: str, config: Dict, files: List[Dict]) -> Dict:
    """
    Load dataset to get actual dimensions.
    """
    # 1. Build full config dict from files array
    # 2. Call load_XY() or handle_data()
    # 3. Get shapes: X.shape, y.shape
    # 4. Calculate num_sources from source_id grouping
    # 5. Update dataset in workspace.json with dimensions
    # 6. Return updated dataset info

def refresh_dataset(self, dataset_id: str) -> Dict:
    """
    Reload dataset using cached config and files.
    """
    # 1. Get dataset from workspace.json
    # 2. Call load_dataset_info() with stored config/files
    # 3. Return updated info
```

### Integration with loader.py

The existing `load_XY()` and `handle_data()` functions work with the standard config format:

```python
config = {
    'train_x': 'path/to/Xcal.csv',  # or ['file1.csv', 'file2.csv']
    'train_y': 'path/to/Ycal.csv',
    'test_x': 'path/to/Xval.csv',
    ...
}
```

We construct this from the DatasetFile array in `load_dataset_info()`.

## Frontend Components

### EditDatasetModal_v2

**Features**:
- Auto-detect button (calls detect-files endpoint)
- File list with add/remove
- Each file: path, type dropdown, partition dropdown, source_id input
- CSV options: delimiter, decimal separator, header, x_source_mode
- Save & Load button (calls load endpoint)

**State**:
```typescript
{
  files: DatasetFile[],
  config: {
    delimiter, decimalSeparator, header, xSourceMode
  },
  loading, autoDetecting
}
```

### WorkspacePage

**Refresh All Button**:
```typescript
const handleRefreshAll = async () => {
  setLoading(true);
  await Promise.all(
    datasets.map(ds => apiClient.refreshDataset(ds.id))
  );
  await loadWorkspace();
  setLoading(false);
};
```

## API Endpoints

### New Endpoints

1. `POST /api/workspace/dataset/{id}/detect-files`
   - Auto-detect files using parse_config
   - Returns: `{ files: DatasetFile[] }`

2. `POST /api/workspace/dataset/{id}/load`
   - Body: `{ config: {...}, files: [...] }`
   - Loads dataset and returns dimensions
   - Returns: `{ dataset: {...} }`

3. `POST /api/datasets/{id}/refresh`
   - Reloads dataset using cached config
   - Returns: `{ dataset: {...} }`

### Updated Endpoints

1. `POST /api/workspace/link`
   - Body now includes config
   - Calls parse_config for initial detection
   - Creates dataset entry (not loaded yet)

2. `PUT /api/workspace/dataset/{id}/config`
   - Now stores full config including files array
   - Updates workspace.json

## File Path Resolution

Paths can be:
- **Relative**: `Xcal.csv` → resolved relative to dataset.path
- **Absolute**: `/data/corn/Xcal.csv` → used as-is

Backend uses Path resolution:
```python
file_path = Path(dataset.path) / file['path']
if not file_path.is_absolute():
    file_path = (Path(dataset.path) / file_path).resolve()
```

## Multi-Source X Handling

**Source Grouping**:
- Files with same `source_id` are grouped
- Files with `source_id=None` get individual sources
- Example:
  ```
  {path: 'X1.csv', type: 'x', partition: 'train', source_id: 0}
  {path: 'X2.csv', type: 'x', partition: 'train', source_id: 0}
  {path: 'X3.csv', type: 'x', partition: 'train', source_id: 1}
  ```
  → 2 sources, source 0 has 2 files

**Mode**:
- `stack`: Rows from same source combined vertically (more samples)
- `concat`: Features from same source combined horizontally (more features)

**Backend Implementation**:
```python
if x_source_mode == 'stack':
    # Group by source_id, stack within source, then combine sources
    X_combined = np.vstack([stack_within_source(files) for files in grouped])
elif x_source_mode == 'concat':
    # Group by source_id, concat within source
    X_combined = np.hstack([concat_within_source(files) for files in grouped])
```

## Benefits

1. **Flexibility**: Support any file organization
2. **Performance**: Cache avoids reloading on startup
3. **Transparency**: User sees exactly what files are used
4. **Validation**: Load step catches config errors early
5. **Scalability**: Refresh only changed datasets

## Implementation Priority

1. ✅ Update TypeScript types
2. ✅ Create EditDatasetModal_v2
3. ⏳ Implement backend detect_dataset_files()
4. ⏳ Implement backend load_dataset_info()
5. ⏳ Implement backend refresh_dataset()
6. ⏳ Update frontend to use new modal
7. ⏳ Add refresh button functionality
8. ⏳ Test with various file configurations
