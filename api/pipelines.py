"""
Pipelines API routes for nirs4all.

This module provides FastAPI routes for pipeline operations.
"""

from fastapi import APIRouter, HTTPException, Body
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


@router.post("/pipelines")
async def save_pipeline(
    name: str = Body(...),
    description: str = Body(...),
    pipeline: list = Body(...)
):
    """Save/pin a pipeline to the workspace."""
    try:
        pipelines_path = workspace_manager.get_pipelines_path()
        if not pipelines_path:
            raise HTTPException(status_code=409, detail="No workspace selected")

        pipelines_dir = Path(pipelines_path)
        pipelines_dir.mkdir(parents=True, exist_ok=True)

        # Create filename from name (sanitize)
        filename = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in name)
        pipeline_file = pipelines_dir / f"{filename}.json"

        # Create pipeline data structure
        from datetime import datetime
        pipeline_data = {
            "name": name,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "steps": pipeline
        }

        # Write to file
        with open(pipeline_file, 'w', encoding='utf-8') as f:
            json.dump(pipeline_data, f, indent=2)

        return {
            "success": True,
            "id": filename,
            "path": str(pipeline_file)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save pipeline: {str(e)}")


@router.post("/files/read")
async def read_local_file(file_path: str = Body(..., embed=True)):
    """Read contents of a local file (for pywebview desktop mode)."""
    try:
        path = Path(file_path)

        # Security check: ensure file exists and is accessible
        if not path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        if not path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Read file content
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        return {"content": content, "path": str(path)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.post("/files/write")
async def write_local_file(file_path: str = Body(...), content: str = Body(...)):
    """Write contents to a local file (for pywebview desktop mode)."""
    try:
        path = Path(file_path)

        # Ensure parent directory exists
        path.parent.mkdir(parents=True, exist_ok=True)

        # Write file content
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

        return {"success": True, "path": str(path)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
