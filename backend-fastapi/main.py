"""
AEGIS AI — FastAPI backend (production migration path).
Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, triage

app = FastAPI(
    title="AEGIS AI Healthcare OS API",
    version="2.0.0",
    description="Production-grade healthcare triage, imaging, and emergency dispatch API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(triage.router)


@app.get("/health")
def health():
    return {"ok": True, "service": "aegis-fastapi"}


@app.get("/api/v2/status")
def status():
    return {
        "platform": "AEGIS AI Healthcare OS",
        "stack": "FastAPI + shared JSON store (PostgreSQL planned)",
        "features": ["auth", "profile", "triage", "vision", "pdf", "telegram", "hospitals"],
        "routes": {
            "auth": ["/api/v2/auth/register", "/api/v2/auth/login", "/api/v2/auth/me", "/api/v2/auth/profile"],
            "triage": ["/api/v2/ai/triage"],
        },
    }
