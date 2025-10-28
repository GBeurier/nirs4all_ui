# Production Mode Dataset Linking Fix

## Problem
When running the application in production mode (PyInstaller packaged executable), attempting to link a dataset resulted in an error:

```
Failed to link dataset: API Error: 400 - {'detail': 'Failed to load dataset: Internal error: dataset_config_parser module not found in repository'}
```

## Root Cause
The `workspace_manager.py` file was using **dynamic module loading** to import the `dataset_config_parser` module:

```python
# OLD CODE (broken in production)
parser_path = Path(__file__).parents[2] / 'nirs4all' / 'nirs4all' / 'dataset' / 'dataset_config_parser.py'
if not parser_path.exists():
    raise ValueError("Internal error: dataset_config_parser module not found in repository")

spec = importlib.util.spec_from_file_location('dataset_config_parser_local', str(parser_path))
parser_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser_mod)
```

This approach:
1. Relied on the development repository structure (relative paths)
2. Did not work in PyInstaller packaged executables where the file structure is different
3. Did not properly bundle the `nirs4all` library with the executable

## Solution

### 1. Use Proper Python Imports
Replaced dynamic module loading with standard Python imports:

```python
# NEW CODE (works in both dev and production)
from nirs4all.data.dataset_config_parser import parse_config
from nirs4all.data.loader import handle_data

# Then use directly:
parsed_config, dataset_name = parse_config(dataset_path)
x_train, y_train, headers = handle_data(full_config, 'train')
```

**Changes made in `api/workspace_manager.py`:**
- Line 28-29: Added imports:
  - `from nirs4all.data.dataset_config_parser import parse_config`
  - `from nirs4all.data.loader import handle_data`
- Line 12: Removed unused `import importlib.util`
- Line 205-207: Replaced 11 lines of dynamic loading with direct `parse_config()` call
- Line 471-476: Replaced 11 lines of dynamic loading with direct `parse_config()` call
- Line 577-589: Replaced 11 lines of dynamic loading with direct `handle_data()` call

### 2. Bundle nirs4all Library with PyInstaller
Updated `nirs4all.spec` to include the `nirs4all` library in the packaged executable:

**Data Files:**
```python
# Check if nirs4all library exists in parent directory (development mode)
nirs4all_lib_dir = curr_dir.parent / 'nirs4all' / 'nirs4all'
if nirs4all_lib_dir.exists():
    print(f"Including nirs4all library from: {nirs4all_lib_dir}")
    # Add the nirs4all package to be bundled
    for root, dirs, files in os.walk(nirs4all_lib_dir):
        dirs[:] = [d for d in dirs if d not in ['__pycache__', '.git', 'tests', '.pytest_cache']]
        for file in files:
            if file.endswith('.py'):
                file_path = Path(root) / file
                rel_to_parent = file_path.relative_to(curr_dir.parent)
                all_datas.append((str(file_path), str(rel_to_parent.parent)))
```

**Hidden Imports:**
```python
hiddenimports=[
    # ... existing imports ...
    # nirs4all library modules
    'nirs4all',
    'nirs4all.dataset',
    'nirs4all.dataset.dataset_config',
    'nirs4all.dataset.dataset_config_parser',
    'nirs4all.dataset.loader',
],
```

## Testing
To test the fix:

1. **Development mode:**
   ```bash
   npm run dev:all
   ```
   - Try linking a dataset from the Workspace page
   - Should work as before

2. **Production mode:**
   ```bash
   # Build the frontend
   npm run build

   # Build the executable
   pyinstaller nirs4all.spec

   # Run the executable
   .\build\nirs4all\nirs4all.exe
   ```
   - Try linking a dataset from the Workspace page
   - Should now work without errors

## Files Changed
1. `api/workspace_manager.py` - Fixed import and usage of `parse_config`
2. `nirs4all.spec` - Added nirs4all library bundling configuration

## Benefits
- ✅ Works in both development and production modes
- ✅ Cleaner code (standard imports instead of dynamic loading)
- ✅ Better PyInstaller integration
- ✅ Easier to maintain and debug
- ✅ Follows Python best practices
