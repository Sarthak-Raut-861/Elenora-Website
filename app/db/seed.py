import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.asset import Asset, AssetStatus
from app.models.category import Category
from app.models.dry_cleaning import DryCleaner
from app.models.rental_plan import RentalPlan
from app.models.user import User, UserRole

ADMIN_EMAIL = settings.ADMIN_EMAIL or "admin@elanora-luxury.com"
ADMIN_PASSWORD = settings.ADMIN_PASSWORD or "AdminPassword123!"
ADMIN_FULL_NAME = settings.ADMIN_FULL_NAME or "Elenora Concierge"


async def seed():
    # Ensure all tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Admin user
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL.lower()))
        admin = result.scalars().first()

        if not admin:
            admin = User(
                full_name=ADMIN_FULL_NAME,
                email=ADMIN_EMAIL.lower(),
                password_hash=hash_password(ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print(f"[OK] Admin user created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        else:
            print("[INFO] Admin user already exists.")

        # 2. Dry cleaner user
        cleaner_email = "cleaner@elanora-luxury.com"
        cleaner_res = await db.execute(select(User).where(User.email == cleaner_email))
        if not cleaner_res.scalars().first():
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
            print(f"[OK] Dry cleaner user created: {cleaner_email} / CleanerPass123!")

        # 3. Default demo client
        client_email = "client@example.com"
        client_res = await db.execute(select(User).where(User.email == client_email))
        if not client_res.scalars().first():
            demo_client = User(
                full_name="Aarav Sharma",
                email=client_email,
                password_hash=hash_password("ClientPassword123!"),
                role=UserRole.user,
                phone="+91 98111 22334",
                is_active=True,
            )
            db.add(demo_client)
            await db.commit()
            print(f"[OK] Demo client created: {client_email} / ClientPassword123!")

        # 4. Categories
        default_categories = [
            "Haute Couture Lehengas",
            "Bridal Gowns",
            "Heritage Sherwanis",
            "Royal Banarasi Sarees",
            "Cocktail Tuxedos",
            "Artisanal Jewellery",
        ]
        cat_map = {}
        for cat_name in default_categories:
            cat_res = await db.execute(select(Category).where(Category.name == cat_name))
            cat = cat_res.scalars().first()
            if not cat:
                cat = Category(name=cat_name, created_at=datetime.now(timezone.utc))
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
                print(f"[OK] Category created: {cat_name}")
            cat_map[cat_name] = cat.id

        # 5. Rental Plans
        default_plans = [
            {
                "name": "Weekend Soirée (3 Days)",
                "duration_days": 3,
                "daily_rate": Decimal("2500.00"),
                "deposit_amount": Decimal("6000.00"),
                "daily_fine_rate": Decimal("800.00"),
                "damage_fee": Decimal("1500.00"),
            },
            {
                "name": "Festive Gala (5 Days)",
                "duration_days": 5,
                "daily_rate": Decimal("2200.00"),
                "deposit_amount": Decimal("8000.00"),
                "daily_fine_rate": Decimal("1000.00"),
                "damage_fee": Decimal("2000.00"),
            },
            {
                "name": "Grand Wedding Week (7 Days)",
                "duration_days": 7,
                "daily_rate": Decimal("1900.00"),
                "deposit_amount": Decimal("10000.00"),
                "daily_fine_rate": Decimal("1200.00"),
                "damage_fee": Decimal("2500.00"),
            },
        ]
        for p in default_plans:
            plan_res = await db.execute(select(RentalPlan).where(RentalPlan.name == p["name"]))
            if not plan_res.scalars().first():
                plan = RentalPlan(
                    name=p["name"],
                    duration_days=p["duration_days"],
                    daily_rate=p["daily_rate"],
                    deposit_amount=p["deposit_amount"],
                    daily_fine_rate=p["daily_fine_rate"],
                    damage_fee=p["damage_fee"],
                    is_active=True,
                )
                db.add(plan)
                await db.commit()
                print(f"[OK] Rental plan created: {p['name']}")

        # 6. Dry Cleaners
        default_cleaners = [
            {
                "name": "Atelier Royal Dry Care",
                "contact_person": "Ramesh Kulkarni",
                "phone": "+91 98450 11223",
                "email": "concierge@atelierroyalcare.com",
                "address": "4th Block, Koramangala, Bangalore",
                "specializations": "Silk,Zardozi,Velvet,Bridal Tulle",
                "turnaround_days": 2,
                "price_per_item": Decimal("1200.00"),
            },
            {
                "name": "Prestige Fabric Spa & Sterilization",
                "contact_person": "Meera Sen",
                "phone": "+91 98230 44556",
                "email": "service@prestigefabricspa.com",
                "address": "Indiranagar 100ft Road, Bangalore",
                "specializations": "Gold Brocade,Hand Embroidery,Ozone Wash",
                "turnaround_days": 3,
                "price_per_item": Decimal("1500.00"),
            },
        ]
        for dc in default_cleaners:
            cleaner_res = await db.execute(select(DryCleaner).where(DryCleaner.name == dc["name"]))
            if not cleaner_res.scalars().first():
                cleaner = DryCleaner(
                    name=dc["name"],
                    contact_person=dc["contact_person"],
                    phone=dc["phone"],
                    email=dc["email"],
                    address=dc["address"],
                    specializations=dc["specializations"],
                    turnaround_days=dc["turnaround_days"],
                    price_per_item=dc["price_per_item"],
                    is_active=True,
                )
                db.add(cleaner)
                await db.commit()
                print(f"[OK] Partner dry cleaner created: {dc['name']}")

        # 7. Luxury Assets
        sample_assets = [
            {
                "name": "The Crimson Empress Zardozi Lehenga",
                "asset_code": "CRIMSON-EMP-001",
                "description": "Handcrafted silk velvet lehenga with antique gold zardozi and semi-precious stone embellishments.",
                "image_url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Haute Couture Lehengas", 1),
                "status": AssetStatus.available,
            },
            {
                "name": "Moonlight Ivory Chantilly Bridal Gown",
                "asset_code": "MOONLIGHT-IVORY-001",
                "description": "Corseted French lace gown with hand-sewn pearl details and an ethereal cathedral-length tulle train.",
                "image_url": "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Bridal Gowns", 2),
                "status": AssetStatus.available,
            },
            {
                "name": "Royal Jodhpur Raw Silk Sherwani",
                "asset_code": "ROYAL-JODH-001",
                "description": "Regal ivory raw silk sherwani tailored with hand-carved enamel buttons and subtle zardozi collar embroidery.",
                "image_url": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Heritage Sherwanis", 3),
                "status": AssetStatus.available,
            },
            {
                "name": "Kashi Heritage Kadwa Banarasi Saree",
                "asset_code": "KASHI-BANARASI-001",
                "description": "Pure katan silk saree featuring intricate floral jaal woven with real gold and silver zari threads.",
                "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Royal Banarasi Sarees", 4),
                "status": AssetStatus.available,
            },
            {
                "name": "Midnight Velvet Peak Lapel Tuxedo",
                "asset_code": "MIDNIGHT-TUX-001",
                "description": "Italian midnight blue velvet evening jacket paired with tailored wool trousers and silk faille lapels.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Cocktail Tuxedos", 5),
                "status": AssetStatus.available,
            },
            {
                "name": "Kundan & Uncut Polki Choker Suite",
                "asset_code": "POLKI-CHOKER-001",
                "description": "22k gold finished handcrafted choker featuring natural emerald drops, south sea pearls, and polki motifs.",
                "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Artisanal Jewellery", 6),
                "status": AssetStatus.available,
            },
        ]
        for a in sample_assets:
            asset_res = await db.execute(select(Asset).where(Asset.asset_code == a["asset_code"]))
            if not asset_res.scalars().first():
                asset = Asset(
                    name=a["name"],
                    asset_code=a["asset_code"],
                    description=a["description"],
                    image_url=a["image_url"],
                    category_id=a["category_id"],
                    status=a["status"],
                    is_active=True,
                    is_in_dry_cleaning=False,
                )
                db.add(asset)
                await db.commit()
                print(f"[OK] Luxury Asset created: {a['name']} ({a['asset_code']})")

    print("\n==========================================")
    print("ELENORA DATABASE SEEDING COMPLETED")
    print("==========================================")


if __name__ == "__main__":
    asyncio.run(seed())
