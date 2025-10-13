# Dataset Configuration Fixes

## Issues Fixed

### 1. Config Not Being Used in Refresh
**Problem**: When refreshing a dataset, the saved config (delimiter, decimal_separator, etc.) was being ignored. `DatasetConfigs` was using default settings.

**Fix**: Modified `refresh_dataset()` to build a config dict from the saved dataset config and pass it to `DatasetConfigs`.

### 2. Sample Count Only From Train Data
**Problem**: When loading dataset info, only train data was being loaded, so if you had separate test files, the sample count would temporarily show only train samples, then jump to the correct count after refresh.

**Fix**: Modified `load_dataset_info()` to load BOTH train and test data, adding their sample counts together.

## Functions That Use DatasetConfigs and handle_data

### 1. `refresh_dataset(dataset_id: str)`
**Purpose**: Reload dataset metadata using nirs4all's DatasetConfigs

**Before**:
```python
dataset_configs = DatasetConfigs([dataset_info["path"]])
```

**After**:
```python
# Build config dict from saved dataset config
dataset_config_dict = {}
if dataset_info.get("config"):
    cfg = dataset_info["config"]
    dataset_config_dict = {
        'delimiter': cfg.get('delimiter', ';'),
        'decimal_separator': cfg.get('decimal_separator', '.'),
        'has_header': cfg.get('has_header', True),
    }
    # ... add header_type, x_source_mode, file paths ...

dataset_configs = DatasetConfigs([dataset_info["path"]], config=dataset_config_dict if dataset_config_dict else None)
```

**What it returns**: Updated dataset info with num_samples, num_features, task_type, sources

---

### 2. `load_dataset_info(dataset_id: str, config: Dict, files: List[Dict])`
**Purpose**: Load dataset with given config and files to get actual dimensions

**Uses**: `handle_data(full_config, 'train')` and `handle_data(full_config, 'test')`

**Before**:
```python
if full_config.get('train_x'):
    x_train, y_train, _ = handle_data(full_config, 'train')
    # Calculate dimensions from train only
```

**After**:
```python
# Load train data
if full_config.get('train_x'):
    x_train, y_train, _ = handle_data(full_config, 'train')
    # Calculate dimensions from train

# Also load test data to add to sample count
if full_config.get('test_x'):
    x_test, y_test, _ = handle_data(full_config, 'test')
    # Add test samples to total count
```

**What it returns**: Updated dataset info with config, files, num_samples (train+test), num_features, num_targets, num_sources

---

### 3. `detect_dataset_files(dataset_id: str)`
**Purpose**: Auto-detect files using parse_config

**Uses**: `parse_config` from nirs4all (not DatasetConfigs or handle_data)

**What it returns**: List of detected files with their types and partitions

---

### 4. `link_dataset(dataset_path: str, custom_config: Optional[Dict])`
**Purpose**: Link a new dataset to the workspace

**Uses**: `parse_config` to detect files and inspect them

**What it does**: Creates initial dataset entry with basic metadata from file inspection

---

## Key Points

1. **`DatasetConfigs`** is used in `refresh_dataset()` to reload full dataset metadata
   - Now properly passes the saved config
   - Returns full dataset object with all properties

2. **`handle_data`** is used in `load_dataset_info()` to actually load data arrays
   - Now loads both train AND test partitions
   - Correctly sums sample counts
   - Gets features/targets from the data itself

3. **Config persistence flow**:
   ```
   EditModal -> Save -> load_dataset_info() -> Updates workspace.json
                                            -> Saves config + files
                                            -> Loads data to get dimensions

   Later refresh -> refresh_dataset() -> Uses saved config
                                      -> DatasetConfigs with config
                                      -> Returns updated metadata
   ```

## Testing Scenarios

1. ✅ Change delimiter from ";" to "," - should detect correct features
2. ✅ Save config - should persist and reload with same values
3. ✅ Refresh dataset - should use saved config, not defaults
4. ✅ Sample count - should be train + test, not just train
