import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-change-me")
    jwt_expire_days: int = 14
    db_path: Path = Path(__file__).resolve().parents[2] / "backend" / "data" / "aegis-db.json"
    node_api_url: str = os.getenv("NODE_API_URL", "http://127.0.0.1:8787")
    use_node_triage: bool = os.getenv("USE_NODE_TRIAGE", "").lower() in ("1", "true", "yes")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
