from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


DEV_SECRET_KEY = "dev-only-insecure-secret-key-change-me"


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables or a local .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Use "mongomock://" to run against an in-memory database (requires requirements-dev.txt).
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db_name: str = "easyhand"

    secret_key: str = DEV_SECRET_KEY
    access_token_expire_minutes: int = 60 * 24 * 7

    # Comma-separated list of allowed origins, or "*".
    cors_origins: str = "*"

    # Comma-separated emails of people who can moderate reports, hide listings and ban accounts.
    admin_emails: str = ""

    # Set to false to turn off per-IP rate limits on login/sign-up (e.g. for load testing).
    rate_limit_enabled: bool = True

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_upload_folder: str = "easyhand"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    def is_admin(self, email: str) -> bool:
        return email.lower() in self.admin_email_set

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
