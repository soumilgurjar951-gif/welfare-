"""Application settings loaded from environment (.env + pydantic-settings)."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central backend configuration."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Scheme Sync API"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"

    # MySQL 8 by default; SQLite allowed for local dev without MySQL.
    DATABASE_URL: str = "mysql+pymysql://root:password@127.0.0.1:3306/scheme_sync"

    SECRET_KEY: str = "change-me-to-a-long-random-secret-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3005,http://127.0.0.1:3005,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,http://localhost:8088,http://127.0.0.1:8088"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 10

    SEED_ADMIN_EMAIL: str = "admin@gov.in"
    SEED_ADMIN_PASSWORD: str = "Admin@123"
    SEED_ADMIN_PHONE: str = "9000000001"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_must_be_set(cls, v: str) -> str:
        if len(v) < 16:
            raise ValueError("SECRET_KEY must be at least 16 characters long")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
