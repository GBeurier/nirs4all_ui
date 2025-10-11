"""
Predictions API routes for nirs4all.

This module provides FastAPI routes for prediction operations.
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

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
                        elif isinstance(data, dict) and 'predictions' in data:
                            total_predictions += len(data['predictions'])
                except Exception:
                    continue  # Skip files that can't be read

        return {"total": total_predictions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count predictions: {str(e)}")


@router.get("/predictions")
async def list_predictions():
    """List all predictions in the workspace."""
    try:
        results_path = workspace_manager.get_results_path()
        if not results_path:
            return {"predictions": []}

        results_dir = Path(results_path)
        all_predictions = []

        if results_dir.exists():
            for predictions_file in results_dir.glob("*/predictions.json"):
                try:
                    with open(predictions_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        dataset_name = predictions_file.parent.name

                        if isinstance(data, list):
                            for pred in data:
                                pred['dataset'] = dataset_name
                                all_predictions.append(pred)
                        elif isinstance(data, dict) and 'predictions' in data:
                            for pred in data['predictions']:
                                pred['dataset'] = dataset_name
                                all_predictions.append(pred)
                except Exception:
                    continue  # Skip files that can't be read

        return {"predictions": all_predictions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list predictions: {str(e)}")