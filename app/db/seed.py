import asyncio
from app.db.session import AsyncSessionLocal
from app.core.config import settings
from app.models.user import User, UserRole
from app.core.security import hash_password
from sqlalchemy.future import select

ADMIN_EMAIL = settings.ADMIN_EMAIL
ADMIN_PASSWORD = settings.ADMIN_PASSWORD
ADMIN_FULL_NAME = settings.ADMIN_FULL_NAME

async def seed():
    async with AsyncSessionLocal() as db:
        # Check if admin user already exists
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing_admin = result.scalars().first()

        if existing_admin:
            print("Admin user already exists. Skipping seeding.")
            return
        
        # Create admin user
        admin = User(
            full_name=ADMIN_FULL_NAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True
        )

        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        print("Admin user created successfully.")

if __name__ == "__main__":
    asyncio.run(seed())