"""
FastAPI backend for nirs4all UI.

This module provides the web API for the nirs4all desktop application,
handling workspace management, dataset operations, and pipeline execution.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException
import uvicorn
from pathlib import Path

from api.workspace import router as workspace_router
from api.datasets import router as datasets_router
from api.pipelines import router as pipelines_router
from api.predictions import router as predictions_router

# Create FastAPI app
app = FastAPI(
    title="nirs4all API",
    description="API for nirs4all NIRS analysis desktop application",
    version="1.0.0"
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(workspace_router, prefix="/api", tags=["workspace"])
app.include_router(datasets_router, prefix="/api", tags=["datasets"])
app.include_router(pipelines_router, prefix="/api", tags=["pipelines"])
app.include_router(predictions_router, prefix="/api", tags=["predictions"])

# Serve static files from public and dist folders
public_path = Path(__file__).parent / "public"
dist_path = Path(__file__).parent / "dist"

# Serve built files in production
if dist_path.exists():
    # Serve static assets (JS, CSS, images)
    if (dist_path / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# Mount public folder for static assets (always available)
# Must be after /assets to avoid conflicts
if public_path.exists():
    app.mount("/public", StaticFiles(directory=str(public_path)), name="public")

    # Also serve public files at root level for production compatibility
    @app.get("/nirs4all_logo.png")
    async def serve_logo():
        """Serve logo from public folder"""
        logo_file = public_path / "nirs4all_logo.png"
        if logo_file.exists():
            return FileResponse(str(logo_file))
        raise HTTPException(status_code=404, detail="Logo not found")

    @app.get("/component-library.json")
    async def serve_component_library():
        """Serve component library from public folder"""
        lib_file = public_path / "component-library.json"
        if lib_file.exists():
            return FileResponse(str(lib_file))
        raise HTTPException(status_code=404, detail="Component library not found")

    @app.get("/nirs4all.svg")
    async def serve_vite_svg():
        """Serve vite svg from public folder"""
        svg_file = public_path / "nirs4all.svg"
        if svg_file.exists():
            return FileResponse(str(svg_file))
        raise HTTPException(status_code=404, detail="Vite SVG not found")

    @app.get("/nirs4all.ico")
    async def serve_favicon_ico():
        """Serve .ico favicon from public folder (fallback for some platforms)"""
        ico_file = public_path / "nirs4all.ico"
        if ico_file.exists():
            return FileResponse(str(ico_file))
        # If no .ico is present, try to serve a PNG fallback
        png_file = public_path / "nirs4all_logo.png"
        if png_file.exists():
            return FileResponse(str(png_file))
        raise HTTPException(status_code=404, detail="Favicon not found")

    @app.get("/")
    async def serve_spa():
        """Serve the main SPA HTML file"""
        index_file = dist_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "dist/index.html not found. Run: npm run build"}

    # Catch-all route for SPA client-side routing
    @app.get("/{full_path:path}")
    async def serve_spa_routes(full_path: str):
        """Serve SPA for all non-API routes"""
        # Don't intercept API routes or static files
        if full_path.startswith("api/") or full_path.startswith("public/"):
            return {"error": "Not found"}, 404

        # Serve index.html for all other routes (SPA routing)
        index_file = dist_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "dist/index.html not found. Run: npm run build"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "dist_exists": dist_path.exists()}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
