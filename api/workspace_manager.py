"""
Workspace management utilities for nirs4all.

This module handles workspace persistence, configuration, and state management.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
import importlib.util
import zipfile
import pandas as pd
import numpy as np
from datetime import datetime
import platformdirs

# Add the nirs4all path for direct imports without loading the full package
nirs4all_path = Path(__file__).parent.parent.parent / "nirs4all"
if str(nirs4all_path) not in sys.path:
    sys.path.insert(0, str(nirs4all_path))

# Import only the specific modules we need
try:
    from nirs4all.dataset.dataset_config import DatasetConfigs
except ImportError as e:
    print(f"Warning: Could not import nirs4all: {e}")
    DatasetConfigs = None


@dataclass
class WorkspaceConfig:
    """Configuration for a workspace."""
    path: str
    name: str
    created_at: str
    last_accessed: str
    datasets: List[Dict[str, Any]]
    pipelines: List[Dict[str, Any]]
    groups: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkspaceConfig':
        # Accept missing keys for backward compatibility
        return cls(
            path=data.get('path', ''),
            name=data.get('name', Path(data.get('path', '')).name if data.get('path') else data.get('name', 'Unknown_dataset')),
            created_at=data.get('created_at', datetime.now().isoformat()),
            last_accessed=data.get('last_accessed', datetime.now().isoformat()),
            datasets=data.get('datasets', []),
            pipelines=data.get('pipelines', []),
            groups=data.get('groups', [])
        )


class WorkspaceManager:
    """Manages workspace operations and persistence."""

    def __init__(self):
        # Get app data directory for persistence
        self.app_data_dir = Path(platformdirs.user_data_dir("nirs4all", "nirs4all"))
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.app_data_dir / "workspace_config.json"

        # Load current workspace
        self._current_workspace_path: Optional[str] = None
        self._workspace_config: Optional[WorkspaceConfig] = None
        self._load_current_workspace()

    def _load_current_workspace(self) -> None:
        """Load the current workspace from persistent storage."""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    workspace_path = config_data.get('current_workspace_path')
                    if workspace_path and Path(workspace_path).exists():
                        self._current_workspace_path = workspace_path
                        self._load_workspace_config()
            except Exception as e:
                print(f"Failed to load workspace config: {e}")

    def _save_current_workspace(self) -> None:
        """Save the current workspace to persistent storage."""
        try:
            config_data = {
                'current_workspace_path': self._current_workspace_path,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2)
        except Exception as e:
            print(f"Failed to save workspace config: {e}")

    def _load_workspace_config(self) -> None:
        """Load workspace configuration from the workspace folder."""
        if not self._current_workspace_path:
            return

        workspace_path = Path(self._current_workspace_path)
        config_file = workspace_path / "workspace.json"

        if config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = json.load(f)
                    self._workspace_config = WorkspaceConfig.from_dict(config_data)
                    # Update last accessed
                    self._workspace_config.last_accessed = datetime.now().isoformat()
                    self._save_workspace_config()
            except Exception as e:
                print(f"Failed to load workspace config: {e}")
                self._create_default_workspace_config()
        else:
            self._create_default_workspace_config()

    def _create_default_workspace_config(self) -> None:
        """Create a default workspace configuration."""
        if not self._current_workspace_path:
            return

        workspace_path = Path(self._current_workspace_path)
        now = datetime.now().isoformat()

        self._workspace_config = WorkspaceConfig(
            path=str(workspace_path),
            name=workspace_path.name,
            created_at=now,
            last_accessed=now,
            datasets=[],
            pipelines=[]
        )

        # Create required directories
        (workspace_path / "results").mkdir(exist_ok=True)
        (workspace_path / "pipelines").mkdir(exist_ok=True)

        self._save_workspace_config()

    def _save_workspace_config(self) -> None:
        """Save workspace configuration to the workspace folder."""
        if not self._current_workspace_path or not self._workspace_config:
            return

        workspace_path = Path(self._current_workspace_path)
        config_file = workspace_path / "workspace.json"

        try:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(self._workspace_config.to_dict(), f, indent=2)
        except Exception as e:
            print(f"Failed to save workspace config: {e}")

    def set_workspace(self, path: str) -> WorkspaceConfig:
        """Set the current workspace and create necessary structure."""
        workspace_path = Path(path)

        if not workspace_path.exists():
            raise ValueError(f"Workspace path does not exist: {path}")

        if not workspace_path.is_dir():
            raise ValueError(f"Workspace path is not a directory: {path}")

        self._current_workspace_path = str(workspace_path.resolve())
        self._save_current_workspace()
        self._load_workspace_config()

        if not self._workspace_config:
            raise RuntimeError("Failed to create workspace configuration")

        return self._workspace_config

    def get_current_workspace(self) -> Optional[WorkspaceConfig]:
        """Get the current workspace configuration."""
        return self._workspace_config

    def link_dataset(self, dataset_path: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Link a dataset to the current workspace.

        Args:
            dataset_path: Path to the dataset folder
            config: Optional configuration with parsing options:
                - delimiter: CSV delimiter (default: ';')
                - decimal_separator: Decimal separator (default: '.')
                - has_header: Whether CSV has header row (default: True)
                - header_type: Type of header ('nm', 'cm-1', 'text', or None)
                - train_x, train_y, test_x, test_y, etc.: Explicit file paths
        """
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")

        dataset_path = str(Path(dataset_path).resolve())

        if not Path(dataset_path).exists():
            raise ValueError(f"Dataset path does not exist: {dataset_path}")

        # Lightweight dataset inspection without importing the full nirs4all package.
        try:
            # 1) Parse dataset folder to find X/Y paths using the local parser module (no package __init__ execution)
            parser_path = Path(__file__).parents[2] / 'nirs4all' / 'nirs4all' / 'dataset' / 'dataset_config_parser.py'
            if not parser_path.exists():
                raise ValueError("Internal error: dataset_config_parser module not found in repository")

            spec = importlib.util.spec_from_file_location('dataset_config_parser_local', str(parser_path))
            if spec is None or spec.loader is None:
                raise RuntimeError("Failed to prepare dataset_config_parser module")
            parser_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(parser_mod)

            parsed_config, dataset_name = parser_mod.parse_config(dataset_path)
            if parsed_config is None:
                raise ValueError("No valid dataset configuration found in the specified path")

            # Helper: get first X path candidate
            def _first_x_path(cfg):
                for k in ('train_x', 'test_x'):
                    v = cfg.get(k)
                    if isinstance(v, list) and len(v) > 0:
                        return v[0]
                    if isinstance(v, str) and v:
                        return v
                return None

            # Helper: get first Y path candidate
            def _first_y_path(cfg):
                for k in ('train_y', 'test_y'):
                    v = cfg.get(k)
                    if isinstance(v, list) and len(v) > 0:
                        return v[0]
                    if isinstance(v, str) and v:
                        return v
                return None

            def _inspect_data_file(path_str: str):
                p = Path(path_str)
                if not p.exists():
                    return 0, 0
                ext = p.suffix.lower()
                # NumPy arrays
                if ext == '.npy':
                    try:
                        arr = np.load(p, allow_pickle=False)
                        if arr is None:
                            return 0, 0
                        if arr.ndim == 1:
                            return int(arr.shape[0]), 1
                        return int(arr.shape[0]), int(arr.shape[1]) if arr.ndim > 1 else 1
                    except Exception:
                        return 0, 0
                if ext == '.npz':
                    try:
                        with np.load(p) as npz:
                            # take the first array inside
                            keys = list(npz.keys())
                            if not keys:
                                return 0, 0
                            arr = npz[keys[0]]
                            if arr.ndim == 1:
                                return int(arr.shape[0]), 1
                            return int(arr.shape[0]), int(arr.shape[1]) if arr.ndim > 1 else 1
                    except Exception:
                        return 0, 0

                # CSV / text-like files (use pandas)
                try:
                    if ext == '.zip':
                        with zipfile.ZipFile(p, 'r') as zf:
                            # try to find first csv file in the archive
                            candidates = [n for n in zf.namelist() if n.lower().endswith('.csv')]
                            if not candidates:
                                return 0, 0
                            with zf.open(candidates[0]) as f:
                                df = pd.read_csv(f, engine='python')
                    elif ext == '.gz':
                        df = pd.read_csv(p, compression='gzip', engine='python')
                    else:
                        df = pd.read_csv(p, engine='python')

                    if df is None:
                        return 0, 0
                    return int(df.shape[0]), int(df.shape[1])
                except Exception:
                    return 0, 0

            # Collect all candidate X paths (supports multiple sources)
            x_candidates = []
            for k in ('train_x', 'test_x'):
                v = parsed_config.get(k)
                if isinstance(v, list):
                    x_candidates.extend(v)
                elif isinstance(v, str) and v:
                    x_candidates.append(v)

            x_path = _first_x_path(parsed_config)
            y_path = _first_y_path(parsed_config)
            num_samples = 0
            num_features = 0
            num_targets = 0
            if x_path:
                try:
                    # Ensure platform compatible path (parser returns POSIX-like strings)
                    x_path_obj = Path(str(x_path))
                    if not x_path_obj.is_absolute():
                        # If parser returned a relative path, resolve relative to the dataset folder
                        base_folder = Path(dataset_path) if isinstance(dataset_path, str) else Path(str(dataset_path))
                        x_path_obj = (base_folder / x_path_obj).resolve()
                    num_samples, num_features = _inspect_data_file(str(x_path_obj))
                except Exception as e:
                    # ignore and continue with zeros
                    print(f"Warning: failed to inspect data file: {e}")

            if y_path:
                try:
                    # Ensure platform compatible path (parser returns POSIX-like strings)
                    y_path_obj = Path(str(y_path))
                    if not y_path_obj.is_absolute():
                        base_folder = Path(dataset_path) if isinstance(dataset_path, str) else Path(str(dataset_path))
                        y_path_obj = (base_folder / y_path_obj).resolve()
                    _, num_targets = _inspect_data_file(str(y_path_obj))
                except Exception as e:
                    # ignore and continue with zeros
                    print(f"Warning: failed to inspect Y file: {e}")

            # If multiple X sources were found, inspect each to get per-source feature counts
            num_features_per_source = None
            if x_candidates:
                try:
                    fps = []
                    samples_from_first = None
                    for xp in x_candidates:
                        xp_obj = Path(str(xp))
                        if not xp_obj.is_absolute():
                            xp_obj = (Path(dataset_path) / xp_obj).resolve()
                        s, f = _inspect_data_file(str(xp_obj))
                        fps.append(f)
                        if samples_from_first is None and s:
                            samples_from_first = s
                    if fps:
                        num_features_per_source = fps
                        # default num_features mirrors loader behavior: concat if specified
                        x_mode = parsed_config.get('x_source_mode', 'stack')
                        if x_mode == 'concat':
                            num_features = sum(fps)
                        else:
                            num_features = fps[0] if len(fps) > 0 else num_features
                        if samples_from_first:
                            num_samples = samples_from_first
                except Exception:
                    num_features_per_source = None

            dataset_info = {
                "id": f"dataset_{len(self._workspace_config.datasets) + 1}",
                "name": dataset_name,
                "path": str(Path(dataset_path).resolve()),
                "linked_at": datetime.now().isoformat(),
                "num_samples": num_samples,
                "num_features": num_features,
                "num_targets": num_targets,
                "task_type": parsed_config.get('task_type', 'unknown'),
                "sources": len(x_candidates) if x_candidates else 1
            }
            if num_features_per_source is not None:
                dataset_info['num_features_per_source'] = num_features_per_source

            # Check if already linked
            for existing in self._workspace_config.datasets:
                if existing["path"] == dataset_info["path"]:
                    raise ValueError("Dataset already linked")

            # Add to workspace
            self._workspace_config.datasets.append(dataset_info)
            self._workspace_config.last_accessed = datetime.now().isoformat()
            self._save_workspace_config()

            return dataset_info

        except Exception as e:
            raise ValueError(f"Failed to load dataset: {str(e)}")

    def unlink_dataset(self, dataset_id: str) -> bool:
        """Unlink a dataset from the current workspace."""
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")

        # Find and remove dataset
        original_count = len(self._workspace_config.datasets)
        self._workspace_config.datasets = [
            d for d in self._workspace_config.datasets
            if d["id"] != dataset_id
        ]

        if len(self._workspace_config.datasets) == original_count:
            return False  # Dataset not found

        self._workspace_config.last_accessed = datetime.now().isoformat()
        self._save_workspace_config()
        return True

    def refresh_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Refresh dataset information."""
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")

        # Find dataset
        dataset_info = next((d for d in self._workspace_config.datasets if d.get("id") == dataset_id), None)
        if not dataset_info:
            return None

        # Reload dataset info using nirs4all DatasetConfigs
        try:
            if DatasetConfigs is None:
                raise ValueError("nirs4all library not available")

            dataset_configs = DatasetConfigs([dataset_info["path"]])
            datasets = dataset_configs.get_datasets()

            if datasets:
                dataset = datasets[0]

                # Prepare num_features_per_source when dataset.num_features is a sequence
                nf = getattr(dataset, 'num_features', 0)
                nf_per_source = None
                try:
                    if isinstance(nf, (list, tuple)):
                        nf_per_source = list(nf)
                    elif hasattr(nf, 'tolist'):
                        nf_converted = nf.tolist()
                        if isinstance(nf_converted, (list, tuple)):
                            nf_per_source = list(nf_converted)
                except Exception:
                    nf_per_source = None

                update_payload = {
                    "num_samples": getattr(dataset, 'num_samples', 0),
                    "num_features": getattr(dataset, 'num_features', 0),
                    "task_type": getattr(dataset, 'task_type', 'unknown'),
                    "sources": getattr(dataset, 'features_sources', lambda: 1)() if hasattr(dataset, 'features_sources') else 1,
                    "last_refreshed": datetime.now().isoformat()
                }
                if nf_per_source is not None:
                    update_payload['num_features_per_source'] = nf_per_source

                dataset_info.update(update_payload)
                self._save_workspace_config()
                return dataset_info

        except Exception as e:
            print(f"Failed to refresh dataset {dataset_id}: {e}")

        return None

    def detect_dataset_files(self, dataset_id: str) -> List[Dict[str, Any]]:
        """
        Auto-detect files for a dataset using parse_config.
        Returns a list of DatasetFile dictionaries.
        """
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")

        # Find dataset
        dataset_info = None
        for d in self._workspace_config.datasets:
            if d["id"] == dataset_id:
                dataset_info = d
                break

        if not dataset_info:
            raise ValueError(f"Dataset {dataset_id} not found")

        dataset_path = dataset_info["path"]

        try:
            # Use local parser module
            parser_path = Path(__file__).parents[2] / 'nirs4all' / 'nirs4all' / 'dataset' / 'dataset_config_parser.py'
            if not parser_path.exists():
                raise ValueError("dataset_config_parser module not found")

            spec = importlib.util.spec_from_file_location('dataset_config_parser_local', str(parser_path))
            if spec is None or spec.loader is None:
                raise RuntimeError("Failed to prepare dataset_config_parser module")
            parser_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(parser_mod)

            # Parse config to detect files
            parsed_config, _ = parser_mod.parse_config(dataset_path)
            if parsed_config is None:
                return []

            # Convert parsed config to DatasetFile format
            files = []

            # Map train_x, test_x, etc. to file entries
            file_mappings = [
                ('train_x', 'x', 'train'),
                ('test_x', 'x', 'test'),
                ('train_y', 'y', 'train'),
                ('test_y', 'y', 'test'),
                ('train_group', 'group', 'train'),
                ('test_group', 'group', 'test'),
            ]

            for config_key, file_type, partition in file_mappings:
                value = parsed_config.get(config_key)
                if value:
                    if isinstance(value, list):
                        # Multiple files - assign source_ids for X files
                        for idx, file_path in enumerate(value):
                            source_id = idx if file_type == 'x' and len(value) > 1 else None
                            files.append({
                                'path': file_path,
                                'type': file_type,
                                'partition': partition,
                                'source_id': source_id
                            })
                    elif isinstance(value, str):
                        files.append({
                            'path': value,
                            'type': file_type,
                            'partition': partition,
                            'source_id': None
                        })

            return files

        except Exception as e:
            print(f"Failed to detect files for dataset {dataset_id}: {e}")
            return []

    def load_dataset_info(self, dataset_id: str, config: Dict[str, Any], files: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Load dataset with given configuration and files to get actual dimensions.
        Updates the dataset info in workspace.json with computed properties.
        """
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")

        # Find dataset
        dataset_info = None
        dataset_index = None
        for idx, d in enumerate(self._workspace_config.datasets):
            if d["id"] == dataset_id:
                dataset_info = d
                dataset_index = idx
                break

        if not dataset_info:
            raise ValueError(f"Dataset {dataset_id} not found")

        try:
            # Build full config dict from files array
            full_config = {
                'delimiter': config.get('delimiter', ';'),
                'decimal_separator': config.get('decimal_separator', '.'),
                'has_header': config.get('has_header', True),
                'x_source_mode': config.get('x_source_mode', 'stack'),
            }

            # Group files by (type, partition) and construct paths
            dataset_base_path = Path(dataset_info["path"])

            for file_entry in files:
                file_path = file_entry['path']
                # Resolve relative paths
                if not Path(file_path).is_absolute():
                    file_path = str(dataset_base_path / file_path)

                file_type = file_entry['type']
                partition = file_entry['partition']

                # Build config key: train_x, test_y, etc.
                config_key = f"{partition}_{file_type}"

                # Handle multiple files (especially multiple X sources)
                if config_key in full_config:
                    existing = full_config[config_key]
                    if isinstance(existing, list):
                        existing.append(file_path)
                    else:
                        full_config[config_key] = [existing, file_path]
                else:
                    full_config[config_key] = file_path

            # Now try to load the dataset to get dimensions
            # Use the loader module locally
            loader_path = Path(__file__).parents[2] / 'nirs4all' / 'nirs4all' / 'dataset' / 'loader.py'
            if not loader_path.exists():
                raise ValueError("loader module not found")

            spec = importlib.util.spec_from_file_location('loader_local', str(loader_path))
            if spec is None or spec.loader is None:
                raise RuntimeError("Failed to prepare loader module")
            loader_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(loader_mod)

            # Load train data to get dimensions
            num_samples = 0
            num_features = 0
            num_targets = 0
            num_sources = 1

            if full_config.get('train_x'):
                try:
                    x_train, y_train, headers = loader_mod.handle_data(full_config, 'train')

                    # Calculate dimensions
                    features_per_source = None
                    if isinstance(x_train, list):
                        # Multiple sources
                        num_sources = len(x_train)
                        if len(x_train) > 0:
                            num_samples = x_train[0].shape[0] if len(x_train[0].shape) > 0 else 0
                            # Compute per-source feature counts
                            try:
                                features_per_source = [x.shape[1] if len(x.shape) > 1 else 0 for x in x_train]
                            except Exception:
                                features_per_source = None
                            if full_config.get('x_source_mode') == 'concat':
                                # Concatenated: sum features across sources
                                num_features = sum((f or 0) for f in (features_per_source or []))
                            else:
                                # Stacked: features from first source
                                num_features = x_train[0].shape[1] if len(x_train[0].shape) > 1 else 0
                    else:
                        # Single source
                        if len(x_train.shape) >= 2:
                            num_samples, num_features = x_train.shape
                        elif len(x_train.shape) == 1:
                            num_samples = x_train.shape[0]
                            num_features = 1

                    if y_train is not None and len(y_train.shape) > 0:
                        num_targets = y_train.shape[1] if len(y_train.shape) > 1 else 1

                except Exception as e:
                    print(f"Warning: Failed to load dataset for dimension extraction: {e}")
                    # Continue with zeros

                    # Update dataset info (include per-source counts when available)
                    update_payload = {
                        'config': config,
                        'files': files,
                        'num_samples': num_samples,
                        'num_features': num_features,
                        'num_targets': num_targets,
                        'num_sources': num_sources,
                        'last_loaded': datetime.now().isoformat()
                    }
                    if features_per_source is not None:
                        update_payload['num_features_per_source'] = features_per_source

                    dataset_info.update(update_payload)

            self._workspace_config.datasets[dataset_index] = dataset_info
            self._save_workspace_config()

            return dataset_info

        except Exception as e:
            print(f"Failed to load dataset info for {dataset_id}: {e}")
            import traceback
            traceback.print_exc()
            raise

    def get_results_path(self) -> Optional[str]:
        """Get the results directory path for the current workspace."""
        if not self._current_workspace_path:
            return None
        return str(Path(self._current_workspace_path) / "results")

    def get_pipelines_path(self) -> Optional[str]:
        """Get the pipelines directory path for the current workspace."""
        if not self._current_workspace_path:
            return None
        return str(Path(self._current_workspace_path) / "pipelines")

    # ----------------------- Groups management -----------------------
    def get_groups(self) -> List[Dict[str, Any]]:
        if not self._workspace_config:
            return []
        return self._workspace_config.groups

    def create_group(self, name: str) -> Dict[str, Any]:
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")
        group = {
            "id": f"group_{len(self._workspace_config.groups) + 1}",
            "name": name,
            "dataset_ids": []
        }
        self._workspace_config.groups.append(group)
        self._save_workspace_config()
        return group

    def rename_group(self, group_id: str, new_name: str) -> bool:
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")
        for g in self._workspace_config.groups:
            if g.get("id") == group_id:
                g["name"] = new_name
                self._save_workspace_config()
                return True
        return False

    def delete_group(self, group_id: str) -> bool:
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")
        original = len(self._workspace_config.groups)
        self._workspace_config.groups = [g for g in self._workspace_config.groups if g.get("id") != group_id]
        if len(self._workspace_config.groups) != original:
            self._save_workspace_config()
            return True
        return False

    def add_dataset_to_group(self, group_id: str, dataset_id: str) -> bool:
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")
        for g in self._workspace_config.groups:
            if g.get("id") == group_id:
                if dataset_id not in g.get("dataset_ids", []):
                    g.setdefault("dataset_ids", []).append(dataset_id)
                    self._save_workspace_config()
                return True
        return False

    def remove_dataset_from_group(self, group_id: str, dataset_id: str) -> bool:
        if not self._workspace_config:
            raise RuntimeError("No workspace selected")
        for g in self._workspace_config.groups:
            if g.get("id") == group_id:
                if dataset_id in g.get("dataset_ids", []):
                    g["dataset_ids"] = [d for d in g["dataset_ids"] if d != dataset_id]
                    self._save_workspace_config()
                return True
        return False


# Global workspace manager instance
workspace_manager = WorkspaceManager()
