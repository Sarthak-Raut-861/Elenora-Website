import asyncio

from app.db.session import engine
from app.db.base import Base
import app.models  # noqa: F401

async def init_db():
    # Create all tables in the database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_db())