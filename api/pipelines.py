"""
Pipelines API routes for nirs4all.

This module provides FastAPI routes for pipeline operations.
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from .workspace_manager import workspace_manager

router = APIRouter()


@router.get("/pipelines")
async def list_pipelines():
    """List all available pipelines in the workspace."""
    try:
        pipelines_path = workspace_manager.get_pipelines_path()
        if not pipelines_path:
            raise HTTPException(status_code=409, detail="No workspace selected")

        pipelines_dir = Path(pipelines_path)
        pipelines = []

        if pipelines_dir.exists():
            for file_path in pipelines_dir.glob("*.json"):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        pipeline_data = json.load(f)
                        pipelines.append({
                            "id": file_path.stem,
                            "name": pipeline_data.get("name", file_path.stem),
                            "description": pipeline_data.get("description", ""),
                            "file_path": str(file_path),
                            "created_at": pipeline_data.get("created_at", ""),
                            "steps_count": len(pipeline_data.get("steps", []))
                        })
                except Exception as e:
                    print(f"Failed to load pipeline {file_path}: {e}")

        return {"pipelines": pipelines}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list pipelines: {str(e)}")


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get a specific pipeline by ID."""
    try:
        pipelines_path = workspace_manager.get_pipelines_path()
        if not pipelines_path:
            raise HTTPException(status_code=409, detail="No workspace selected")

        pipeline_file = Path(pipelines_path) / f"{pipeline_id}.json"

        if not pipeline_file.exists():
            raise HTTPException(status_code=404, detail="Pipeline not found")

        with open(pipeline_file, 'r', encoding='utf-8') as f:
            pipeline_data = json.load(f)

        return {"pipeline": pipeline_data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pipeline: {str(e)}")