"""
FastAPI backend for nirs4all UI.

This module provides the web API for the nirs4all desktop application,
handling workspace management, dataset operations, and pipeline execution.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(workspace_router, prefix="/api", tags=["workspace"])
app.include_router(datasets_router, prefix="/api", tags=["datasets"])
app.include_router(pipelines_router, prefix="/api", tags=["pipelines"])
app.include_router(predictions_router, prefix="/api", tags=["predictions"])

@app.get("/")
async def root():
    """Root endpoint to check if API is running."""
    return {"message": "nirs4all API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )