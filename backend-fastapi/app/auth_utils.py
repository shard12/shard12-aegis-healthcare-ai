from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.database import find_user_by_id, strip_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def sign_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    return jwt.encode(data, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


async def require_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        payload = verify_token(creds.credentials)
        user = find_user_by_id(payload.get("sub", ""))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return strip_user(user)  # type: ignore[return-value]
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e
