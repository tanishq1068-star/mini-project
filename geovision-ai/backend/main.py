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

# Enable CORS for local development and Render production deployment
cors_origins = [
    "https://geovision-ai-frontend-pragya.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

env_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS")
if env_origins:
    cors_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes under /api and also at top level for convenience
app.include_router(api_router, prefix="/api", tags=["API"])
app.include_router(api_router, tags=["Root API Endpoints"])

# Mount static reports directory if it exists
backend_reports = os.path.abspath(os.path.join(os.path.dirname(__file__), "reports"))
parent_reports = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "reports"))
reports_path = parent_reports if os.path.exists(parent_reports) else backend_reports
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
    # Support Render PORT environment variable and default to 8000
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    reload = os.environ.get("RELOAD", "false").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload)
