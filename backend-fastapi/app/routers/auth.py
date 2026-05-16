from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.auth_utils import hash_password, require_user, sign_token, verify_password
from app.database import create_user, find_user_by_email, strip_user, update_user

router = APIRouter(prefix="/api/v2/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProfilePatch(BaseModel):
    name: str | None = None
    profile: dict | None = None


@router.post("/register")
def register(body: RegisterBody):
    if find_user_by_email(body.email):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = create_user(
        {"email": body.email, "passwordHash": hash_password(body.password), "name": body.name or "Operator"}
    )
    token = sign_token({"sub": user["id"], "email": user["email"]})
    return {"token": token, "user": strip_user(user)}


@router.post("/login")
def login(body: LoginBody):
    user = find_user_by_email(body.email)
    if not user or not verify_password(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = sign_token({"sub": user["id"], "email": user["email"]})
    return {"token": token, "user": strip_user(user)}


@router.get("/me")
def me(user: dict = Depends(require_user)):
    return {"user": user}


@router.patch("/profile")
def patch_profile(body: ProfilePatch, user: dict = Depends(require_user)):
    patch: dict = {}
    if body.name:
        patch["name"] = body.name.strip()
    if body.profile:
        patch["profile"] = body.profile
    updated = update_user(user["id"], patch)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": strip_user(updated)}
