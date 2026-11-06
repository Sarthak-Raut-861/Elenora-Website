import os
import sys
import sqlite3
import pytest
import pytest_asyncio

sys.path.insert(0, os.path.abspath("."))

from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    from app.db.base import Base
    from app.db.session import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="session", autouse=True)
def clean_db_session():
    # Setup / Teardown: ensure tests leave the user database 100% clean
    yield
    try:
        db_path = os.path.join(os.path.abspath("."), "asset_tracking.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("DELETE FROM returns")
            c.execute("DELETE FROM dry_cleaning_requests")
            c.execute("DELETE FROM tracking_events")
            c.execute("DELETE FROM allocations")
            c.execute("DELETE FROM payments")
            c.execute("DELETE FROM bookings")
            c.execute("DELETE FROM assets")
            c.execute("DELETE FROM categories")
            c.execute("DELETE FROM users WHERE email = 'test.client@example.com'")
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"Teardown cleanup exception: {e}")
