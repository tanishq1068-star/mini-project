import os
import sys

# Configure Matplotlib writable directory before importing it
os.environ["MPLCONFIGDIR"] = os.path.abspath(os.path.join(os.path.dirname(__file__), ".mpl_cache"))
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.api import router as api_router

app = FastAPI(
    title="GeoVision AI Backend",
    description="Multi-temporal satellite image change detection API for deforestation and water resource monitoring.",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes under /api and also at top level for convenience
app.include_router(api_router, prefix="/api", tags=["API"])
app.include_router(api_router, tags=["Root API Endpoints"])

# Mount static reports directory if it exists
reports_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "reports"))
os.makedirs(reports_path, exist_ok=True)
app.mount("/static/reports", StaticFiles(directory=reports_path), name="reports")


@app.get("/")
def root():
    return {
        "application": "GeoVision AI",
        "description": "Satellite Image Change Detection for Deforestation and Water Resources",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "docs": "/docs",
            "samples": "/api/samples",
            "results": "/api/results"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
