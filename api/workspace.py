"""
Workspace API routes for nirs4all.

This module provides FastAPI routes for workspace management operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from .workspace_manager import workspace_manager


class SetWorkspaceRequest(BaseModel):
    path: str
    persist_global: bool = True


class LinkDatasetRequest(BaseModel):
    path: str
    config: Optional[Dict[str, Any]] = None


class WorkspaceResponse(BaseModel):
    workspace: Optional[Dict[str, Any]]
    datasets: List[Dict[str, Any]]


router = APIRouter()


@router.get("/workspace", response_model=WorkspaceResponse)
async def get_workspace():
    """Get the current workspace and its datasets."""
    try:
        workspace_config = workspace_manager.get_current_workspace()

        if not workspace_config:
            return WorkspaceResponse(workspace=None, datasets=[])

        return WorkspaceResponse(
            workspace=workspace_config.to_dict(),
            datasets=workspace_config.datasets
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workspace: {str(e)}")


@router.post("/workspace/select")
async def select_workspace(request: SetWorkspaceRequest):
    """Set the current workspace."""
    try:
        workspace_config = workspace_manager.set_workspace(request.path)
        return {
            "success": True,
            "message": f"Workspace set to {request.path}",
            "workspace": workspace_config.to_dict()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set workspace: {str(e)}")


@router.post("/datasets/link")
async def link_dataset(request: LinkDatasetRequest):
    """Link a dataset to the current workspace."""
    try:
        dataset_info = workspace_manager.link_dataset(request.path, config=request.config)
        return {
            "success": True,
            "message": "Dataset linked successfully",
            "dataset": dataset_info
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to link dataset: {str(e)}")


@router.post("/workspace/link")
async def link_dataset_alias(request: LinkDatasetRequest):
    """Alias endpoint kept for frontend compatibility: /api/workspace/link"""
    return await link_dataset(request)


@router.delete("/datasets/{dataset_id}")
async def unlink_dataset(dataset_id: str):
    """Unlink a dataset from the current workspace."""
    try:
        success = workspace_manager.unlink_dataset(dataset_id)
        if not success:
            raise HTTPException(status_code=404, detail="Dataset not found")

        return {
            "success": True,
            "message": "Dataset unlinked successfully"
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlink dataset: {str(e)}")


@router.delete("/workspace/unlink/{dataset_id}")
async def unlink_dataset_alias(dataset_id: str):
    """Alias endpoint for frontend compatibility: /api/workspace/unlink/{id}"""
    return await unlink_dataset(dataset_id)


@router.post("/datasets/{dataset_id}/refresh")
async def refresh_dataset(dataset_id: str):
    """Refresh dataset information by reloading it."""
    try:
        dataset_info = workspace_manager.refresh_dataset(dataset_id)
        if not dataset_info:
            raise HTTPException(status_code=404, detail="Dataset not found or refresh failed")

        return {
            "success": True,
            "message": "Dataset refreshed successfully",
            "dataset": dataset_info
        }
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh dataset: {str(e)}")


@router.post("/workspace/dataset/{dataset_id}/detect-files")
async def detect_dataset_files(dataset_id: str):
    """Auto-detect files for a dataset using parse_config."""
    try:
        files = workspace_manager.detect_dataset_files(dataset_id)
        return {
            "success": True,
            "files": files
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to detect files: {str(e)}")


@router.post("/workspace/dataset/{dataset_id}/load")
async def load_dataset_info(dataset_id: str, body: Dict[str, Any]):
    """Load dataset with config and files to get actual dimensions."""
    try:
        config = body.get('config', {})
        files = body.get('files', [])

        dataset_info = workspace_manager.load_dataset_info(dataset_id, config, files)
        if not dataset_info:
            raise HTTPException(status_code=404, detail="Dataset not found")

        return {
            "success": True,
            "dataset": dataset_info
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {str(e)}")


@router.get("/workspace/dataset/{dataset_id}/config")
async def get_dataset_config(dataset_id: str):
    """Return stored dataset information and (lightweight) config metadata."""
    try:
        ws = workspace_manager.get_current_workspace()
        if not ws:
            raise HTTPException(status_code=409, detail="No workspace selected")
        for d in ws.datasets:
            if d.get('id') == dataset_id:
                return {"dataset": d}
        raise HTTPException(status_code=404, detail="Dataset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dataset config: {str(e)}")


@router.put("/workspace/dataset/{dataset_id}/config")
async def update_dataset_config(dataset_id: str, config: Dict[str, Any]):
    """Store a user-provided config object for a dataset in the workspace.json"""
    try:
        ws = workspace_manager.get_current_workspace()
        if not ws:
            raise HTTPException(status_code=409, detail="No workspace selected")
        for d in ws.datasets:
            if d.get('id') == dataset_id:
                d['config'] = config
                workspace_manager._save_workspace_config()
                return {"success": True, "dataset": d}
        raise HTTPException(status_code=404, detail="Dataset not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update dataset config: {str(e)}")


@router.get("/workspace/paths")
async def get_workspace_paths():
    """Get workspace-related paths."""
    try:
        results_path = workspace_manager.get_results_path()
        pipelines_path = workspace_manager.get_pipelines_path()

        return {
            "results_path": results_path,
            "pipelines_path": pipelines_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get paths: {str(e)}")



@router.get('/workspace/groups')
async def get_groups():
    try:
        groups = workspace_manager.get_groups()
        return {"groups": groups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list groups: {str(e)}")


class CreateGroupRequest(BaseModel):
    name: str


@router.post('/workspace/groups')
async def create_group(req: CreateGroupRequest):
    try:
        grp = workspace_manager.create_group(req.name)
        return {"success": True, "group": grp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create group: {str(e)}")


@router.put('/workspace/groups/{group_id}')
async def rename_group(group_id: str, req: CreateGroupRequest):
    try:
        ok = workspace_manager.rename_group(group_id, req.name)
        if not ok:
            raise HTTPException(status_code=404, detail='Group not found')
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rename group: {str(e)}")


@router.delete('/workspace/groups/{group_id}')
async def delete_group(group_id: str):
    try:
        ok = workspace_manager.delete_group(group_id)
        if not ok:
            raise HTTPException(status_code=404, detail='Group not found')
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete group: {str(e)}")


@router.post('/workspace/groups/{group_id}/datasets')
async def add_dataset_to_group(group_id: str, body: Dict[str, Any]):
    try:
        dataset_id = body.get('dataset_id')
        if not dataset_id:
            raise HTTPException(status_code=400, detail='dataset_id required')
        ok = workspace_manager.add_dataset_to_group(group_id, dataset_id)
        if not ok:
            raise HTTPException(status_code=404, detail='Group not found')
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add dataset to group: {str(e)}")


@router.delete('/workspace/groups/{group_id}/datasets/{dataset_id}')
async def remove_dataset_from_group(group_id: str, dataset_id: str):
    try:
        ok = workspace_manager.remove_dataset_from_group(group_id, dataset_id)
        if not ok:
            raise HTTPException(status_code=404, detail='Group not found')
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove dataset from group: {str(e)}")
