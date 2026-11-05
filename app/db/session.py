import os
import shutil
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def build_engine():
    raw_url = settings.DATABASE_URL or "sqlite+aiosqlite:///./asset_tracking.db"
    connect_args = {}

    # If running on Vercel with SQLite fallback, copy to /tmp
    if "sqlite" in raw_url and os.getenv("VERCEL"):
        tmp_db_file = "/tmp/asset_tracking.db"
        if not os.path.exists(tmp_db_file) and os.path.exists("asset_tracking.db"):
            try:
                shutil.copyfile("asset_tracking.db", tmp_db_file)
            except Exception:
                pass
        raw_url = "sqlite+aiosqlite:////tmp/asset_tracking.db"

    # SQLite connection configuration
    if "sqlite" in raw_url:
        connect_args["check_same_thread"] = False
        return create_async_engine(
            raw_url,
            pool_pre_ping=True,
            connect_args=connect_args,
        )

    # ── POSTGRESQL PRODUCTION ADAPTER (asyncpg) ──
    # Normalize schemes
    db_url = raw_url.strip()
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

    parsed = urlparse(db_url)
    query_params = parse_qs(parsed.query)

    # Determine SSL requirements for cloud PostgreSQL (Render, Neon, Supabase, AWS RDS, etc.)
    is_cloud_postgres = any(
        host in parsed.netloc.lower()
        for host in ["render.com", "neon.tech", "supabase", "aws", "pooler", "ondigitalocean.com"]
    )

    needs_ssl = False
    if "sslmode" in query_params:
        ssl_val = query_params.pop("sslmode")[0].lower()
        if ssl_val in ("require", "verify-ca", "verify-full", "prefer"):
            needs_ssl = True
    elif is_cloud_postgres or "ssl" in query_params:
        needs_ssl = True

    if "ssl" in query_params:
        query_params.pop("ssl")

    if needs_ssl:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

    # Reconstruct sanitized database URL without asyncpg-incompatible query parameters
    clean_query = urlencode(query_params, doseq=True)
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment,
    ))

    # PostgreSQL Production Connection Pool Configuration
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        "connect_args": connect_args,
    }

    return create_async_engine(clean_url, **engine_kwargs)


engine = build_engine()

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
