from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user_optional
from app.core.logger import logger
from app.core.rate_limiter import limiter
from app.core.rbac import require_roles
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User, UserRole
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryResponse])
@limiter.limit("60/minute")
async def list_categories(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Category).order_by(Category.id.asc()))
    return result.scalars().all()


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_category(
    request: Request,
    data: CategoryCreate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    name_clean = data.name.strip()
    existing = await db.execute(select(Category).where(Category.name.ilike(name_clean)))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Category with this name already exists")

    category = Category(name=name_clean, created_at=datetime.now(timezone.utc))
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
@limiter.limit("20/minute")
async def update_category(
    category_id: int,
    request: Request,
    data: CategoryUpdate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if data.name:
        name_clean = data.name.strip()
        existing = await db.execute(
            select(Category).where(Category.name.ilike(name_clean), Category.id != category_id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Another category already has this name")
        category.name = name_clean

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    from app.models.asset import Asset

    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if assets are using this category
    asset_check = await db.execute(select(Asset).where(Asset.category_id == category_id))
    if asset_check.scalars().first():
        raise HTTPException(status_code=400, detail="Cannot delete category containing assets. Reassign or delete assets first.")

    await db.delete(category)
    await db.commit()

