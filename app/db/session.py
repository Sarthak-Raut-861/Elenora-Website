import os
import shutil
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL or "sqlite+aiosqlite:///./asset_tracking.db"

# If on Vercel and using SQLite, copy db to /tmp if needed
if "sqlite" in db_url and os.getenv("VERCEL"):
    tmp_db_file = "/tmp/asset_tracking.db"
    if not os.path.exists(tmp_db_file) and os.path.exists("asset_tracking.db"):
        try:
            shutil.copyfile("asset_tracking.db", tmp_db_file)
        except Exception:
            pass
    db_url = "sqlite+aiosqlite:////tmp/asset_tracking.db"

# Adapt Postgres URLs for asyncpg
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
elif "sslmode=require" in db_url or "neon.tech" in db_url or "supabase" in db_url:
    db_url = db_url.replace("?sslmode=require", "").replace("&sslmode=require", "")
    connect_args["ssl"] = "require"

engine = create_async_engine(
    db_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
