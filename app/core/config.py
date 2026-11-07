import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App
    PROJECT_NAME = os.getenv("APP_NAME", "Elenora-Website")

    # JWT
    ACCESS_TOKEN_SECRET_KEY = os.getenv(
        "ACCESS_TOKEN_SECRET_KEY", 
        "elenora_access_token_secret_key_super_secure_99182371"
    )
    REFRESH_TOKEN_SECRET_KEY = os.getenv(
        "REFRESH_TOKEN_SECRET_KEY", 
        "elenora_refresh_token_secret_key_super_secure_88273641"
    )
    JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")
    )

    # Database (PostgreSQL Production Default with Cloud Environment Detection)
    DATABASE_URL = (
        os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or os.getenv("POSTGRESQL_URL")
    )
    if not DATABASE_URL:
        if os.getenv("VERCEL"):
            DATABASE_URL = "sqlite+aiosqlite:////tmp/asset_tracking.db"
        else:
            # Fallback for local development if PostgreSQL is not active
            DATABASE_URL = os.getenv("DEFAULT_POSTGRES_URL", "sqlite+aiosqlite:///./asset_tracking.db")

    # Admin Credentials
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@elanora-luxury.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminPassword123!")
    ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "Elenora Concierge")

    # Supabase Cloud Storage
    SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xhbgchyuyigpmkobhtth.supabase.co")
    SUPABASE_KEY = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
    )
    SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "product-media")

settings = Settings()
