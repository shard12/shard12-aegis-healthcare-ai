import json
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any

from app.config import settings

DEFAULT_DB = {
    "users": [],
    "histories": [],
    "reports": [],
    "smsAlerts": [],
    "medicineReminders": [],
    "chatThreads": [],
    "sosLogs": [],
}

DEFAULT_PROFILE = {
    "gender": "",
    "bloodGroup": "O+",
    "dob": "",
    "heightCm": "",
    "weightKg": "",
    "allergies": [],
    "medications": [],
    "conditions": [],
    "emergencyContacts": [],
    "insuranceProvider": "",
    "insuranceId": "",
    "medicalHistory": "",
    "notes": "",
}


def _path() -> Path:
    p = settings.db_path
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def read_db() -> dict[str, Any]:
    path = _path()
    if not path.exists():
        write_db(deepcopy(DEFAULT_DB))
        return deepcopy(DEFAULT_DB)
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return {**deepcopy(DEFAULT_DB), **data}


def write_db(db: dict[str, Any]) -> None:
    with _path().open("w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)


def find_user_by_email(email: str) -> dict | None:
    db = read_db()
    email_l = email.lower()
    return next((u for u in db["users"] if u.get("email", "").lower() == email_l), None)


def find_user_by_id(user_id: str) -> dict | None:
    db = read_db()
    return next((u for u in db["users"] if u.get("id") == user_id), None)


def create_user(payload: dict) -> dict:
    db = read_db()
    user = {
        "id": str(uuid.uuid4()),
        "email": payload["email"].lower(),
        "passwordHash": payload["passwordHash"],
        "name": payload.get("name") or "Operator",
        "avatarUrl": payload.get("avatarUrl") or "",
        "googleId": payload.get("googleId") or "",
        "profile": {**DEFAULT_PROFILE, **(payload.get("profile") or {})},
        "settings": {
            "language": "en",
            "darkMode": True,
            "largeText": False,
            "vibrations": True,
            "telegramChatId": "",
            "telegramGroupId": "",
            "alertEmail": payload["email"].lower(),
            "alertPhone": "",
        },
        "createdAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    db["users"].append(user)
    write_db(db)
    return user


def update_user(user_id: str, patch: dict) -> dict | None:
    db = read_db()
    for i, u in enumerate(db["users"]):
        if u.get("id") != user_id:
            continue
        cur = db["users"][i]
        merged = {**cur, **{k: v for k, v in patch.items() if k not in ("profile", "settings")}}
        if "profile" in patch:
            merged["profile"] = {**cur.get("profile", {}), **patch["profile"]}
        if "settings" in patch:
            merged["settings"] = {**cur.get("settings", {}), **patch["settings"]}
        db["users"][i] = merged
        write_db(db)
        return merged
    return None


def strip_user(user: dict | None) -> dict | None:
    if not user:
        return None
    out = {k: v for k, v in user.items() if k != "passwordHash"}
    return out
