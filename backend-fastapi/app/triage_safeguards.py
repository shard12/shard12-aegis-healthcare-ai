import re

RED_FLAG = re.compile(
    r"\b(chest pain|crushing|can't breathe|cannot breathe|not breathing|stroke|face droop|"
    r"slurred speech|unconscious|unresponsive|seizure|suicide|overdose|severe bleeding|"
    r"major trauma|anaphylaxis|throat closing)\b",
    re.I,
)
MILD_ONLY = re.compile(
    r"\b(cough|runny nose|sneeze|mild headache|sore throat|common cold|hay fever)\b",
    re.I,
)
CHEST_REQUIRED = re.compile(r"\b(chest|heart|angina|myocardial)\b", re.I)


def apply_triage_safeguards(user_text: str, envelope: dict) -> dict:
    out = dict(envelope)
    text = str(user_text or "")
    risk = str(out.get("risk_level", "MEDIUM")).upper()
    concerns = [str(c).lower() for c in (out.get("possible_concerns") or []) + (out.get("probable_conditions") or [])]
    mentions_chest = any(CHEST_REQUIRED.search(c) for c in concerns) or bool(CHEST_REQUIRED.search(text))
    user_mild = bool(MILD_ONLY.search(text)) and not RED_FLAG.search(text)
    red = bool(RED_FLAG.search(text))

    if user_mild and not red:
        if risk in ("CRITICAL", "HIGH"):
            out["risk_level"] = "LOW"
            out["severity"] = "LOW"
            out["emergency_triggered"] = False
        elif risk == "MEDIUM":
            out["risk_level"] = "LOW"
            out["severity"] = "LOW"
        out["why_this_risk"] = (out.get("why_this_risk") or "") + " Safeguard: mild symptoms without red flags."

    if red and out.get("risk_level") in ("LOW", "MEDIUM"):
        out["risk_level"] = "HIGH"
        out["severity"] = "HIGH"
        out["emergency_triggered"] = True
        out["why_this_risk"] = (out.get("why_this_risk") or "") + " Safeguard: red-flag language detected."

    return out
