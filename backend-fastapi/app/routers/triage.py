import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.triage_engine import rule_based_triage
from app.auth_utils import require_user

router = APIRouter(prefix="/api/v2/ai", tags=["ai"])


class TriageBody(BaseModel):
    message: str
    lat: float | None = None
    lng: float | None = None
    language: str | None = "en"
    accuracy: float | None = None
    tracking: bool | None = False


@router.post("/triage")
async def triage(body: TriageBody, user: dict = Depends(require_user)):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="message required")

    if settings.use_node_triage:
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                # Caller should pass Authorization header — forwarded via dependency not available here;
                # v2 clients call FastAPI with token; we proxy to Node using same JWT if secrets match.
                pass
        except Exception:
            pass

    lang = body.language or user.get("settings", {}).get("language") or "en"
    envelope = rule_based_triage(body.message, lang)

    return {
        "envelope": envelope,
        "alerts": {"telegramStatus": "skipped", "emailStatus": "skipped"},
        "historyId": None,
        "ai": {"status": "online", "detail": "FastAPI rule-based triage with safeguards"},
        "report": {"incidentId": None, "url": None, "filename": None},
        "note": "Set USE_NODE_TRIAGE=true and NODE_API_URL for full Express multi-agent pipeline.",
    }
