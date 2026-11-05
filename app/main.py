import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logger import logger
from app.core.rate_limiter import setup_rate_limiter
from app.db.base import Base
from app.db.session import engine, AsyncSessionLocal

# Import all models to ensure metadata registration
import app.models

# Import routers
from app.api import (
    routers_allocation,
    routers_assets,
    routers_auth,
    routers_booking,
    routers_category,
    routers_contact,
    routers_dry_cleaning,
    routers_payment,
    routers_rental_plans,
    routers_return,
    routers_tracking,
    routers_users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload folder exists safely
    upload_dir = "/tmp/uploads" if os.getenv("VERCEL") else "uploads"
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except OSError:
        pass

    try:
        os.makedirs("/tmp/logs" if os.getenv("VERCEL") else "logs", exist_ok=True)
    except OSError:
        pass

    # Initialize tables if needed (especially for SQLite or initial setup)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed default administrative users if database is newly initialized
    try:
        from app.models.user import User, UserRole
        from app.core.security import hash_password
        from sqlalchemy.future import select

        async with AsyncSessionLocal() as db:
            # 1. Primary Admin User
            res_admin = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL.lower()))
            if not res_admin.scalars().first():
                admin_user = User(
                    full_name=settings.ADMIN_FULL_NAME,
                    email=settings.ADMIN_EMAIL.lower(),
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    role=UserRole.admin,
                    is_active=True,
                )
                db.add(admin_user)
                await db.commit()
                logger.info(f"Initialized default admin account: {settings.ADMIN_EMAIL}")

            # 2. Sarthak Admin Users & Typo Auto-Healing
            res_co = await db.execute(select(User).where(User.email == "sarthakraut1484@gmail.co"))
            user_co = res_co.scalars().first()

            for s_email in ["sarthakraut1484@gmail.com", "sarthak1484@gmail.com"]:
                res_s = await db.execute(select(User).where(User.email == s_email))
                user_s = res_s.scalars().first()
                if not user_s:
                    pwd = user_co.password_hash if (user_co and user_co.password_hash) else hash_password(settings.ADMIN_PASSWORD)
                    user_s = User(
                        full_name="Sarthak Raut",
                        email=s_email,
                        password_hash=pwd,
                        role=UserRole.admin,
                        is_active=True,
                    )
                    db.add(user_s)
                    await db.commit()
                    logger.info(f"Initialized admin account: {s_email}")
                else:
                    user_s.role = UserRole.admin
                    user_s.is_active = True
                    if user_co and user_co.password_hash:
                        user_s.password_hash = user_co.password_hash
                    await db.commit()
                    logger.info(f"Synchronized admin account privileges: {s_email}")

            # 3. Dry Cleaner User
            cleaner_email = "cleaner@elanora-luxury.com"
            res_cleaner = await db.execute(select(User).where(User.email == cleaner_email))
            if not res_cleaner.scalars().first():
                cleaner_user = User(
                    full_name="Fabric Master Santosh",
                    email=cleaner_email,
                    password_hash=hash_password("CleanerPass123!"),
                    role=UserRole.dry_cleaner,
                    phone="+91 98765 43210",
                    is_active=True,
                )
                db.add(cleaner_user)
                await db.commit()
                logger.info(f"Initialized dry cleaner account: {cleaner_email}")

            # 4. Auto-seed operational defaults (plans and dry cleaners) if empty
            try:
                from app.db.seed import seed_operational_defaults
                await seed_operational_defaults()
            except Exception as se:
                logger.warning(f"Operational defaults note: {se}")
    except Exception as e:
        logger.error(f"Note on startup user provisioning: {e}")

    logger.info("Elenora Luxury Rental Application initialized successfully.")
    yield
    # Shutdown
    await engine.dispose()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="Elenora - Luxury Rental & Asset Lifecycle Management API",
    description="Full-stack enterprise API for managing luxury dress rentals, asset tracking, payments, dry-cleaning logistics, and return auditing.",
    version="2.0.0",
    lifespan=lifespan,
)

# 1. CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Rate Limiting
setup_rate_limiter(app)

# 3. Exception Handlers
register_exception_handlers(app)

# 4. Static Files for Asset Media
upload_static_dir = "/tmp/uploads" if os.getenv("VERCEL") else "uploads"
try:
    os.makedirs(upload_static_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_static_dir), name="uploads")
except Exception:
    pass

# 5. Mount API Routers under /api prefix for unified deployment routing
api_router = APIRouter(prefix="/api")
api_router.include_router(routers_auth.router)
api_router.include_router(routers_users.router)
api_router.include_router(routers_category.router)
api_router.include_router(routers_rental_plans.router)
api_router.include_router(routers_assets.router)
api_router.include_router(routers_booking.router)
api_router.include_router(routers_allocation.router)
api_router.include_router(routers_return.router)
api_router.include_router(routers_payment.router)
api_router.include_router(routers_dry_cleaning.router)
api_router.include_router(routers_tracking.router)
api_router.include_router(routers_contact.router)

@api_router.get("/health", tags=["Health"])
async def api_health_check():
    return {"status": "healthy"}

app.include_router(api_router)

# Also mount routers at root for direct and test compatibility
app.include_router(routers_auth.router)
app.include_router(routers_users.router)
app.include_router(routers_category.router)
app.include_router(routers_rental_plans.router)
app.include_router(routers_assets.router)
app.include_router(routers_booking.router)
app.include_router(routers_allocation.router)
app.include_router(routers_return.router)
app.include_router(routers_payment.router)
app.include_router(routers_dry_cleaning.router)
app.include_router(routers_tracking.router)
app.include_router(routers_contact.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "app": "Elenora Luxury Rental & Asset Tracking API",
        "version": "2.0.0",
        "docs_url": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
