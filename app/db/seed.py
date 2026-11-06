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


async def seed_operational_defaults():
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

        # 3. Rental Plans
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

        # 4. Dry Cleaners
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

async def seed(sample_catalog: bool = False):
    await seed_operational_defaults()
    if not sample_catalog:
        print("[INFO] Operational defaults seeded. Skipping sample catalog as requested.")
        return

    async with AsyncSessionLocal() as db:
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
                "image_url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Haute Couture Lehengas", 1),
                "status": AssetStatus.available,
                "buy_price": 38000.0,
                "rental_price": 2899.0,
                "listing_type": "both",
                "sizes": "XS,S,M,L,XL",
            },
            {
                "name": "Moonlight Ivory Chantilly Bridal Gown",
                "asset_code": "MOONLIGHT-IVORY-001",
                "description": "Corseted French lace gown with hand-sewn pearl details and an ethereal cathedral-length tulle train.",
                "image_url": "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Bridal Gowns", 2),
                "status": AssetStatus.available,
                "buy_price": 52000.0,
                "rental_price": 4199.0,
                "listing_type": "both",
                "sizes": "XS,S,M,L",
            },
            {
                "name": "Royal Jodhpur Raw Silk Sherwani",
                "asset_code": "ROYAL-JODH-001",
                "description": "Regal ivory raw silk sherwani tailored with hand-carved enamel buttons and subtle zardozi collar embroidery.",
                "image_url": "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Heritage Sherwanis", 3),
                "status": AssetStatus.available,
                "buy_price": 42000.0,
                "rental_price": 3299.0,
                "listing_type": "both",
                "sizes": "38,40,42,44",
            },
            {
                "name": "Kashi Heritage Kadwa Banarasi Saree",
                "asset_code": "KASHI-BANARASI-001",
                "description": "Pure katan silk saree featuring intricate floral jaal woven with real gold and silver zari threads.",
                "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Royal Banarasi Sarees", 4),
                "status": AssetStatus.available,
                "buy_price": 34000.0,
                "rental_price": 2699.0,
                "listing_type": "both",
                "sizes": "Free Size (Includes Unstitched Blouse)",
            },
            {
                "name": "Midnight Velvet Peak Lapel Tuxedo",
                "asset_code": "MIDNIGHT-TUX-001",
                "description": "Italian midnight blue velvet evening jacket paired with tailored wool trousers and silk faille lapels.",
                "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Cocktail Tuxedos", 5),
                "status": AssetStatus.available,
                "buy_price": 36000.0,
                "rental_price": 2999.0,
                "listing_type": "both",
                "sizes": "38,40,42,44",
            },
            {
                "name": "Kundan & Uncut Polki Choker Suite",
                "asset_code": "POLKI-CHOKER-001",
                "description": "22k gold finished handcrafted choker featuring natural emerald drops, south sea pearls, and polki motifs.",
                "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
                "category_id": cat_map.get("Artisanal Jewellery", 6),
                "status": AssetStatus.available,
                "buy_price": 28000.0,
                "rental_price": 2199.0,
                "listing_type": "both",
                "sizes": "One Size Adjustable",
            },
        ]
        for a in sample_assets:
            asset_res = await db.execute(select(Asset).where(Asset.asset_code == a["asset_code"]))
            existing_asset = asset_res.scalars().first()
            if not existing_asset:
                asset = Asset(
                    name=a["name"],
                    asset_code=a["asset_code"],
                    description=a["description"],
                    image_url=a["image_url"],
                    category_id=a["category_id"],
                    status=a["status"],
                    buy_price=a["buy_price"],
                    rental_price=a["rental_price"],
                    listing_type=a["listing_type"],
                    sizes=a["sizes"],
                    is_active=True,
                    is_in_dry_cleaning=False,
                )
                db.add(asset)
                await db.commit()
                print(f"[OK] Luxury Asset created: {a['name']} ({a['asset_code']})")
            else:
                # Update seeded asset if missing prices or has legacy mismatched photo
                updated = False
                if existing_asset.buy_price is None or existing_asset.buy_price <= 0:
                    existing_asset.buy_price = a["buy_price"]
                    updated = True
                if existing_asset.rental_price is None or existing_asset.rental_price <= 0:
                    existing_asset.rental_price = a["rental_price"]
                    updated = True
                if not existing_asset.sizes:
                    existing_asset.sizes = a["sizes"]
                    updated = True
                # If old mismatched images were present on seeded records, update to authentic
                if "583391733956-3750e0ff4e8b" in (existing_asset.image_url or "") and a["asset_code"] == "CRIMSON-EMP-001":
                    existing_asset.image_url = a["image_url"]
                    updated = True
                elif "597983073493-88cd35cf93b0" in (existing_asset.image_url or "") and a["asset_code"] == "ROYAL-JODH-001":
                    existing_asset.image_url = a["image_url"]
                    updated = True
                if updated:
                    await db.commit()
                    print(f"[OK] Standardized pricing and imagery for {a['asset_code']}")

    print("\n==========================================")
    print("ELENORA DATABASE SEEDING COMPLETED")
    print("==========================================")


async def seed_core_catalog_if_empty():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Category))
        cats = res.scalars().all()
        cat_map = {c.name.lower().strip(): c.id for c in cats}

        default_categories = [
            "Bridal Wear",
            "Jens",
            "Casual Wear",
            "Party Wear",
            "Haute Couture Lehengas",
            "Bridal Gowns",
            "Heritage Sherwanis",
            "Royal Banarasi Sarees",
            "Cocktail Tuxedos",
            "Artisanal Jewellery",
            "Abayas",
            "Hijabs",
            "Jwellery",
            "Kurtis",
            "Rental Collection",
            "Western Wear",
        ]
        
        for cname in default_categories:
            key = cname.lower().strip()
            if key not in cat_map:
                cat = Category(name=cname, created_at=datetime.now(timezone.utc))
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
                cat_map[key] = cat.id

        # Auto-heal any broken image URLs from previous runs
        broken_res = await db.execute(select(Asset).where(Asset.asset_code == "BRL-PALACE-101"))
        palace_asset = broken_res.scalars().first()
        if palace_asset and (not palace_asset.image_url or palace_asset.image_url.startswith("/royal-bridal-banner")):
            palace_asset.image_url = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"
            await db.commit()

        res_assets = await db.execute(select(Asset))
        assets_list = res_assets.scalars().all()
        if len(assets_list) == 0:
            bridal_id = cat_map.get("bridal wear") or cat_map.get("haute couture lehengas") or 1
            jens_id = cat_map.get("jens") or cat_map.get("heritage sherwanis") or 2
            gowns_id = cat_map.get("bridal gowns") or bridal_id
            sarees_id = cat_map.get("royal banarasi sarees") or 1
            jewel_id = cat_map.get("artisanal jewellery") or 1

            core_assets = [
                {
                    "name": "The Crimson Empress Zardozi Lehenga",
                    "asset_code": "CRIMSON-EMP-001",
                    "description": "Handcrafted silk velvet lehenga with antique gold zardozi and semi-precious stone embellishments.",
                    "image_url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
                    "category_id": bridal_id,
                    "buy_price": 52000.0,
                    "rental_price": 3899.0,
                    "sizes": "XS,S,M,L,XL",
                },
                {
                    "name": "Burgundy Velvet Royal Palace Bridal Lehenga",
                    "asset_code": "BRL-PALACE-101",
                    "description": "Imperial burgundy micro-velvet bridal lehenga adorned with intricate zardozi, dabka, and pearl hand-embroidery.",
                    "image_url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
                    "category_id": bridal_id,
                    "buy_price": 58000.0,
                    "rental_price": 4499.0,
                    "sizes": "S,M,L,XL",
                },
                {
                    "name": "Noor Ivory & Molten Gold Embroidered Bridal Ensemble",
                    "asset_code": "BRL-NOOR-103",
                    "description": "Ethereal ivory organza and raw silk bridal lehenga glistening with molten gold gota patti and Swarovski crystals.",
                    "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
                    "category_id": bridal_id,
                    "buy_price": 46500.0,
                    "rental_price": 3499.0,
                    "sizes": "S,M,L",
                },
                {
                    "name": "Heritage Royal Rose Hand-Embroidered Bridal Set",
                    "asset_code": "BRL-ROSE-104",
                    "description": "Rose-pink handloom silk bridal outfit woven with signature rose motifs and antique metallic threadwork.",
                    "image_url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
                    "category_id": bridal_id,
                    "buy_price": 49000.0,
                    "rental_price": 3699.0,
                    "sizes": "XS,S,M",
                },
                {
                    "name": "Royal Jodhpur Raw Silk Sherwani",
                    "asset_code": "ROYAL-JODH-001",
                    "description": "Regal ivory raw silk sherwani tailored with hand-carved enamel buttons and subtle zardozi collar embroidery.",
                    "image_url": "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80",
                    "category_id": jens_id,
                    "buy_price": 42000.0,
                    "rental_price": 3299.0,
                    "sizes": "38,40,42,44",
                },
                {
                    "name": "Imperial Velvet Wedding Sherwani & Stole",
                    "asset_code": "JENS-VELVET-SHERWANI",
                    "description": "Royal midnight navy velvet sherwani accented with antique dabka zardozi motifs and a pure raw silk stole.",
                    "image_url": "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80",
                    "category_id": jens_id,
                    "buy_price": 48000.0,
                    "rental_price": 3599.0,
                    "sizes": "38,40,42,44",
                },
                {
                    "name": "Midnight Velvet Peak Lapel Tuxedo",
                    "asset_code": "MIDNIGHT-TUX-001",
                    "description": "Italian midnight blue velvet evening jacket paired with tailored wool trousers and silk faille lapels.",
                    "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
                    "category_id": jens_id,
                    "buy_price": 36000.0,
                    "rental_price": 2999.0,
                    "sizes": "38,40,42,44",
                },
                {
                    "name": "Moonlight Ivory Chantilly Bridal Gown",
                    "asset_code": "MOONLIGHT-IVORY-001",
                    "description": "Corseted French lace gown with hand-sewn pearl details and an ethereal cathedral-length tulle train.",
                    "image_url": "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80",
                    "category_id": gowns_id,
                    "buy_price": 52000.0,
                    "rental_price": 4199.0,
                    "sizes": "XS,S,M,L",
                },
                {
                    "name": "Kashi Heritage Kadwa Banarasi Saree",
                    "asset_code": "KASHI-BANARASI-001",
                    "description": "Pure katan silk saree featuring intricate floral jaal woven with real gold and silver zari threads.",
                    "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
                    "category_id": sarees_id,
                    "buy_price": 34000.0,
                    "rental_price": 2699.0,
                    "sizes": "Free Size (Includes Unstitched Blouse)",
                },
                {
                    "name": "Kundan & Uncut Polki Choker Suite",
                    "asset_code": "POLKI-CHOKER-001",
                    "description": "22k gold finished handcrafted choker featuring natural emerald drops, south sea pearls, and polki motifs.",
                    "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
                    "category_id": jewel_id,
                    "buy_price": 28000.0,
                    "rental_price": 2199.0,
                    "sizes": "One Size Adjustable",
                },
            ]

            for a in core_assets:
                asset = Asset(
                    name=a["name"],
                    asset_code=a["asset_code"],
                    description=a["description"],
                    image_url=a["image_url"],
                    category_id=a["category_id"],
                    status=AssetStatus.available,
                    buy_price=a["buy_price"],
                    rental_price=a["rental_price"],
                    listing_type="both",
                    sizes=a["sizes"],
                    is_active=True,
                    is_in_dry_cleaning=False,
                )
                db.add(asset)
            await db.commit()
            print("[OK] Core catalog seeded automatically.")


if __name__ == "__main__":
    asyncio.run(seed())
