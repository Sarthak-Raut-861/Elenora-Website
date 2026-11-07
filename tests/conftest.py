import os
import sys

# Ensure unit tests run in isolated SQLite memory, not production Supabase
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

import sqlite3
import pytest
import pytest_asyncio

sys.path.insert(0, os.path.abspath("."))

from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    from app.db.base import Base
    from app.db.session import engine, AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.core.security import hash_password
    from sqlalchemy.future import select

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from app.models.rental_plan import RentalPlan
        res = await db.execute(select(User).where(User.email == "admin@elanora-luxury.com"))
        if not res.scalars().first():
            admin_user = User(
                full_name="Elenora Concierge",
                email="admin@elanora-luxury.com",
                password_hash=hash_password("AdminPassword123!"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin_user)

        plan_res = await db.execute(select(RentalPlan))
        if not plan_res.scalars().first():
            db.add(RentalPlan(name="Weekend Soiree", duration_days=3, daily_rate=2500, deposit_amount=5000, daily_fine_rate=500, damage_fee=0))
            db.add(RentalPlan(name="Grand Celebration", duration_days=7, daily_rate=2000, deposit_amount=5000, daily_fine_rate=500, damage_fee=0))

        await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="session", autouse=True)
def clean_db_session():
    # Setup / Teardown: ensure tests only clean up test-created records
    yield
    try:
        db_path = os.path.join(os.path.abspath("."), "asset_tracking.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("DELETE FROM assets WHERE asset_code LIKE 'TEST-%' OR name LIKE 'Test%'")
            c.execute("DELETE FROM categories WHERE name LIKE 'Test%'")
            c.execute("DELETE FROM offers WHERE title LIKE 'Test%'")
            c.execute("DELETE FROM users WHERE email IN ('test.client@example.com', 'test.admin@example.com')")
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"Teardown cleanup exception: {e}")
