import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logger import logger
from app.core.rate_limiter import setup_rate_limiter
from app.db.base import Base
from app.db.session import engine

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
    # Startup: ensure upload folder exists and tables are initialized
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("logs", exist_ok=True)

    # Initialize tables if needed (especially for SQLite or initial setup)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Rate Limiting
setup_rate_limiter(app)

# 3. Exception Handlers
register_exception_handlers(app)

# 4. Static Files for Asset Media
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from fastapi import APIRouter

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

