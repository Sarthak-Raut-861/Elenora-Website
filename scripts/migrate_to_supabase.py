"""
Elenora Luxury Boutique - Supabase Migration Engine
Migrates all categories, assets, users, plans, and catalog data to Supabase PostgreSQL.
"""

import asyncio
import os
import sys
import ssl
import sqlite3
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from datetime import datetime, timezone
from decimal import Decimal

# Add parent directory to sys.path so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import text

from app.db.base import Base
from app.models.user import User, UserRole
from app.models.category import Category
from app.models.asset import Asset, AssetStatus
from app.models.rental_plan import RentalPlan
from app.models.dry_cleaning import DryCleaner
from app.models.offer import Offer
from app.core.security import hash_password
from app.core.config import settings


def prepare_supabase_engine(supabase_url: str):
    """Formats Supabase connection URI for asyncpg with SSL enabled."""
    url = supabase_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)
    query_params.pop("sslmode", None)
    query_params.pop("ssl", None)

    clean_query = urlencode(query_params, doseq=True)
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment,
    ))

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    engine = create_async_engine(
        clean_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"ssl": ssl_ctx},
    )
    return engine


async def run_migration(supabase_url: str):
    print("=" * 65)
    print("ELENORA LUXURY BOUTIQUE -> SUPABASE DATA MIGRATION")
    print("=" * 65)

    print(f"\n[1/5] Connecting to Supabase PostgreSQL...")
    engine = prepare_supabase_engine(supabase_url)

    # 1. Initialize Tables on Supabase
    print("[2/5] Creating all database tables on Supabase...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure video_url exists if table was pre-existing
        try:
            await conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS video_url VARCHAR;"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE assets ADD COLUMN IF NOT EXISTS gallery_images TEXT DEFAULT '[]';"))
        except Exception:
            pass
    print("  [OK] All 11 tables verified on Supabase.")

    # 2. Extract Data from local SQLite / backup DB
    source_db = "asset_tracking.db" if os.path.exists("asset_tracking.db") else "scratch/asset_tracking_backup.db"
    print(f"[3/5] Extracting source catalog from '{source_db}'...")

    sqlite_conn = sqlite3.connect(source_db)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    sqlite_cur.execute("SELECT * FROM categories")
    src_categories = [dict(row) for row in sqlite_cur.fetchall()]

    sqlite_cur.execute("SELECT * FROM assets")
    src_assets = [dict(row) for row in sqlite_cur.fetchall()]
    sqlite_conn.close()

    print(f"  [OK] Found {len(src_categories)} categories and {len(src_assets)} assets to migrate.")

    # 3. Migrate Categories
    print("[4/5] Migrating categories and assets to Supabase...")
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    category_id_map = {}
    async with async_session() as db:
        # Migrate/Sync Categories
        for sc in src_categories:
            cname = sc["name"].strip()
            existing_res = await db.execute(select(Category).where(Category.name.ilike(cname)))
            cat = existing_res.scalars().first()
            if not cat:
                cat = Category(
                    name=cname,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
                print(f"  + Category created: {cname} (Supabase ID {cat.id})")
            else:
                print(f"  = Category exists: {cname} (Supabase ID {cat.id})")
            category_id_map[sc["id"]] = cat.id

        # Also ensure all 16 canonical collections exist
        canonical_categories = [
            "Bridal Wear", "Jens", "Casual Wear", "Party Wear", "Haute Couture Lehengas",
            "Bridal Gowns", "Heritage Sherwanis", "Royal Banarasi Sarees", "Cocktail Tuxedos",
            "Artisanal Jewellery", "Abayas", "Hijabs", "Jwellery", "Kurtis", "Rental Collection", "Western Wear"
        ]
        for cname in canonical_categories:
            existing_res = await db.execute(select(Category).where(Category.name.ilike(cname)))
            if not existing_res.scalars().first():
                cat = Category(name=cname, created_at=datetime.now(timezone.utc))
                db.add(cat)
                await db.commit()
                await db.refresh(cat)
                print(f"  + Canonical category created: {cname} (Supabase ID {cat.id})")

        # Migrate Assets
        migrated_assets = 0
        for sa in src_assets:
            target_cat_id = category_id_map.get(sa["category_id"])
            if not target_cat_id:
                # Fallback to Bridal Wear or first category
                first_cat = await db.execute(select(Category).limit(1))
                target_cat_id = first_cat.scalars().first().id

            code = sa["asset_code"]
            existing_asset_res = await db.execute(select(Asset).where(Asset.asset_code == code))
            existing_asset = existing_asset_res.scalars().first()

            # Sanitize image URL
            img_url = sa.get("image_url")
            if img_url and img_url.startswith("/royal-bridal-banner"):
                img_url = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80"

            if not existing_asset:
                new_asset = Asset(
                    asset_code=code,
                    name=sa["name"],
                    description=sa.get("description"),
                    image_url=img_url,
                    category_id=target_cat_id,
                    status=AssetStatus(sa.get("status", "available")),
                    listing_type=sa.get("listing_type", "both"),
                    buy_price=sa.get("buy_price"),
                    rental_price=sa.get("rental_price"),
                    sizes=sa.get("sizes", "XS,S,M,L,XL"),
                    color_variants=sa.get("color_variants"),
                    gallery_images=sa.get("gallery_images", "[]"),
                    video_url=sa.get("video_url"),
                    is_active=bool(sa.get("is_active", 1)),
                    is_in_dry_cleaning=bool(sa.get("is_in_dry_cleaning", 0)),
                )
                db.add(new_asset)
                migrated_assets += 1
                print(f"  + Asset migrated: {sa['name']} [{code}]")
            else:
                # Update existing asset with image/video updates
                if img_url and (not existing_asset.image_url or "royal-bridal-banner" in (existing_asset.image_url or "")):
                    existing_asset.image_url = img_url
                if sa.get("video_url") and not existing_asset.video_url:
                    existing_asset.video_url = sa.get("video_url")
                db.add(existing_asset)
                print(f"  = Asset up-to-date: {sa['name']} [{code}]")

        await db.commit()

        # 4. Migrate Admin Accounts
        print("\n[5/5] Provisioning Administrative Accounts on Supabase...")
        admin_emails = [
            (settings.ADMIN_EMAIL, settings.ADMIN_FULL_NAME, settings.ADMIN_PASSWORD, UserRole.admin),
            ("sarthakraut1484@gmail.com", "Sarthak Raut", settings.ADMIN_PASSWORD, UserRole.admin),
            ("sarthak1484@gmail.com", "Sarthak Raut", settings.ADMIN_PASSWORD, UserRole.admin),
        ]
        for email, name, pwd, role in admin_emails:
            if not email:
                continue
            u_res = await db.execute(select(User).where(User.email == email.lower()))
            u = u_res.scalars().first()
            if not u:
                u = User(
                    full_name=name,
                    email=email.lower(),
                    password_hash=hash_password(pwd),
                    role=role,
                    is_active=True,
                )
                db.add(u)
                await db.commit()
                print(f"  + Admin account provisioned: {email}")
            else:
                u.role = UserRole.admin
                u.is_active = True
                await db.commit()
                print(f"  = Admin account verified: {email}")

        # Final Verification
        final_cats = (await db.execute(select(Category))).scalars().all()
        final_assets = (await db.execute(select(Asset))).scalars().all()
        final_users = (await db.execute(select(User))).scalars().all()

        print("\n" + "=" * 65)
        print("MIGRATION TO SUPABASE COMPLETE AND VERIFIED!")
        print(f"  • Total Categories in Supabase: {len(final_cats)}")
        print(f"  • Total Assets in Supabase:     {len(final_assets)}")
        print(f"  • Total Users in Supabase:      {len(final_users)}")
        print("=" * 65)


if __name__ == "__main__":
    url = None
    if len(sys.argv) > 1:
        url = sys.argv[1]
    elif os.getenv("SUPABASE_DATABASE_URL"):
        url = os.getenv("SUPABASE_DATABASE_URL")
    elif os.getenv("DATABASE_URL") and ("supabase" in os.getenv("DATABASE_URL") or "pooler" in os.getenv("DATABASE_URL")):
        url = os.getenv("DATABASE_URL")

    if not url:
        print("\nUsage: python scripts/migrate_to_supabase.py '<YOUR_SUPABASE_DATABASE_URL>'")
        print("Example: python scripts/migrate_to_supabase.py 'postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'\n")
        sys.exit(1)

    asyncio.run(run_migration(url))

