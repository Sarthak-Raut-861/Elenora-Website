import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App
    PROJECT_NAME = os.getenv("APP_NAME")

    # JWT
    ACCESS_TOKEN_SECRET_KEY = os.getenv("ACCESS_TOKEN_SECRET_KEY")
    REFRESH_TOKEN_SECRET_KEY = os.getenv("REFRESH_TOKEN_SECRET_KEY")
    JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
    )
    REFRESH_TOKEN_EXPIRE_DAYS = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)
    )

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Admin Credentials
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
    ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME")

settings = Settings()

if not settings.ACCESS_TOKEN_SECRET_KEY:
    raise ValueError("ACCESS_TOKEN_SECRET_KEY environment variable is not set.")

if not settings.REFRESH_TOKEN_SECRET_KEY:
    raise ValueError("REFRESH_TOKEN_SECRET_KEY environment variable is not set.")

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD or not settings.ADMIN_FULL_NAME:
    raise ValueError("Admin credentials are not set.")
