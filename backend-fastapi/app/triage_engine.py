import re

from app.triage_safeguards import apply_triage_safeguards, RED_FLAG


def rule_based_triage(message: str, language: str = "en") -> dict:
    text = message.strip()
    red = bool(RED_FLAG.search(text))
    risk = "LOW"
    emergency = False
    if red:
        risk = "HIGH"
        emergency = True
    elif re.search(r"\b(severe|worsening|high fever|blood)\b", text, re.I):
        risk = "MEDIUM"

    envelope = {
        "intent": "symptom_triage",
        "risk_level": risk,
        "severity": risk,
        "emergency_category": "General" if not red else "Acute",
        "medical_summary": f"Preliminary assessment of: {text[:200]}",
        "possible_concerns": ["Requires clinical evaluation"] if risk != "LOW" else ["Self-limiting pattern possible"],
        "probable_conditions": [],
        "recommendations": ["Monitor symptoms", "Seek care if worsening"],
        "immediate_actions": ["Rest and hydrate"] if risk == "LOW" else ["Call local emergency number if severe"],
        "suggested_response": "Stay calm. If symptoms worsen, seek urgent care.",
        "recommended_action": "Contact a clinician or emergency services based on severity.",
        "rag_context_used": "",
        "emergency_triggered": emergency,
        "telegram_alert": "pending" if emergency else "skipped",
        "confidence_score": 0.65,
        "why_this_risk": "Rule-based v2 triage (FastAPI). Configure USE_NODE_TRIAGE=true for full multi-agent pipeline.",
    }
    return apply_triage_safeguards(text, envelope)
