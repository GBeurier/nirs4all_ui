"""
Predictions API routes for nirs4all.

This module provides FastAPI routes for prediction operations.
"""

from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import json
import os
from datetime import datetime
from typing import Optional, List

from .workspace_manager import workspace_manager

router = APIRouter()


@router.get("/predictions/counts")
async def get_predictions_counts():
    """Get counts of predictions in the workspace."""
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            return {"total": 0}

        results_dir = Path(results_path)
        total_predictions = 0

        if results_dir.exists():
            # Count predictions.json files in subdirectories
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            total_predictions += len(data)
                except Exception:
                    continue  # Skip files that can't be read

        return {"total": total_predictions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count predictions: {str(e)}")


@router.get("/predictions/search")
async def search_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    q: Optional[str] = None,
    dataset: Optional[str] = None,
    model_name: Optional[str] = None,
    partition: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    include_arrays: str = Query("false", regex="^(true|false)$")
):
    """
    Search and filter predictions with pagination and sorting.

    Args:
        page: Page number (1-indexed)
        page_size: Number of results per page
        q: Text search query (searches in model_name, dataset_name, config_name)
        dataset: Filter by dataset name
        model_name: Filter by model name
        partition: Filter by partition (train/val/test)
        date_from: Filter by date (ISO format)
        date_to: Filter by date (ISO format)
        sort_by: Column to sort by (id, dataset_name, model_name, val_score, test_score, etc.)
        sort_dir: Sort direction (asc/desc)
        include_arrays: Include y_true/y_pred arrays in response (true/false)
    """
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            return {"predictions": [], "total": 0, "page": page, "page_size": page_size}

        results_dir = Path(results_path)
        all_predictions = []
        include_arrays_bool = include_arrays.lower() == "true"

        if results_dir.exists():
            # Load all predictions from all dataset folders
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        dataset_name = predictions_file.parent.name

                        # Get file modification time
                        file_mtime = os.path.getmtime(predictions_file)
                        file_date = datetime.fromtimestamp(file_mtime).isoformat()

                        if isinstance(data, list):
                            for pred in data:
                                pred['_dataset_folder'] = dataset_name
                                pred['_file_date'] = file_date
                                pred['_file_path'] = str(predictions_file)

                                # Strip arrays if not requested to reduce payload size
                                if not include_arrays_bool:
                                    if 'y_true' in pred:
                                        pred['_arrays_stripped'] = True
                                        pred['y_true'] = []
                                    if 'y_pred' in pred:
                                        pred['y_pred'] = []
                                    if 'sample_indices' in pred:
                                        pred['sample_indices'] = []
                                    if 'weights' in pred:
                                        pred['weights'] = []

                                all_predictions.append(pred)
                except Exception as e:
                    print(f"Error reading {predictions_file}: {e}")
                    continue

        # Apply filters
        filtered = all_predictions

        # Text search
        if q and q.strip():
            q_lower = q.strip().lower()
            filtered = [
                p for p in filtered
                if q_lower in str(p.get('model_name', '')).lower()
                or q_lower in str(p.get('dataset_name', '')).lower()
                or q_lower in str(p.get('config_name', '')).lower()
                or q_lower in str(p.get('id', '')).lower()
                or q_lower in str(p.get('preprocessings', '')).lower()
            ]

        # Dataset filter
        if dataset:
            filtered = [p for p in filtered if p.get('dataset_name') == dataset]

        # Model name filter
        if model_name:
            filtered = [p for p in filtered if p.get('model_name') == model_name]

        # Partition filter
        if partition:
            filtered = [p for p in filtered if p.get('partition') == partition]

        # Date range filters
        if date_from:
            try:
                date_from_dt = datetime.fromisoformat(date_from)
                filtered = [
                    p for p in filtered
                    if datetime.fromisoformat(p.get('_file_date', '')) >= date_from_dt
                ]
            except:
                pass

        if date_to:
            try:
                date_to_dt = datetime.fromisoformat(date_to)
                filtered = [
                    p for p in filtered
                    if datetime.fromisoformat(p.get('_file_date', '')) <= date_to_dt
                ]
            except:
                pass

        # Sorting
        if sort_by:
            reverse = (sort_dir == "desc")
            try:
                # Handle numeric vs string sorting
                if sort_by in ['val_score', 'test_score', 'train_score', 'n_samples', 'n_features', 'step_idx', 'op_counter']:
                    filtered.sort(key=lambda x: float(x.get(sort_by, 0) or 0), reverse=reverse)
                elif sort_by == '_file_date' or sort_by == '_date':
                    filtered.sort(key=lambda x: x.get('_file_date', ''), reverse=reverse)
                else:
                    filtered.sort(key=lambda x: str(x.get(sort_by, '')).lower(), reverse=reverse)
            except Exception as e:
                print(f"Sort error: {e}")
        else:
            # Default sort by file date desc
            filtered.sort(key=lambda x: x.get('_file_date', ''), reverse=True)

        # Add a date field for display
        for pred in filtered:
            pred['_date'] = pred.get('_file_date', '')[:10] if pred.get('_file_date') else ''

        # Pagination
        total = len(filtered)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated = filtered[start_idx:end_idx]

        return {
            "predictions": paginated,
            "total": total,
            "page": page,
            "page_size": page_size
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search predictions: {str(e)}")


@router.get("/predictions/meta")
async def get_predictions_meta():
    """Get metadata about predictions (unique models, configs, partitions)."""
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            return {"models": [], "configs": [], "partitions": [], "datasets": []}

        results_dir = Path(results_path)
        models = set()
        configs = set()
        partitions = set()
        datasets = set()

        if results_dir.exists():
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for pred in data:
                                if 'model_name' in pred:
                                    models.add(pred['model_name'])
                                if 'config_name' in pred:
                                    configs.add(pred['config_name'])
                                if 'partition' in pred:
                                    partitions.add(pred['partition'])
                                if 'dataset_name' in pred:
                                    datasets.add(pred['dataset_name'])
                except Exception:
                    continue

        return {
            "models": sorted(list(models)),
            "configs": sorted(list(configs)),
            "partitions": sorted(list(partitions)),
            "datasets": sorted(list(datasets))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get predictions meta: {str(e)}")


@router.get("/predictions/datasets")
async def get_predictions_datasets():
    """Get list of datasets with predictions."""
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            return {"datasets": []}

        results_dir = Path(results_path)
        datasets = []

        if results_dir.exists():
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    dataset_name = predictions_file.parent.name
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        count = len(data) if isinstance(data, list) else 0

                    datasets.append({
                        "name": dataset_name,
                        "count": count,
                        "path": str(predictions_file.parent)
                    })
                except Exception:
                    continue

        return {"datasets": datasets}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get datasets: {str(e)}")


@router.delete("/predictions/{prediction_id}")
async def delete_prediction(prediction_id: str):
    """Delete a prediction by ID."""
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            raise HTTPException(status_code=404, detail="Results path not found")

        results_dir = Path(results_path)
        found = False

        if results_dir.exists():
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                    if isinstance(data, list):
                        original_len = len(data)
                        data = [p for p in data if p.get('id') != prediction_id]

                        if len(data) < original_len:
                            # Save updated predictions
                            with open(predictions_file, 'w', encoding='utf-8') as f:
                                json.dump(data, f, indent=2)
                            found = True
                            break
                except Exception as e:
                    print(f"Error processing {predictions_file}: {e}")
                    continue

        if not found:
            raise HTTPException(status_code=404, detail=f"Prediction {prediction_id} not found")

        return {"message": f"Prediction {prediction_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete prediction: {str(e)}")