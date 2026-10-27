from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.db.session import get_db
from app.models.rental_plan import RentalPlan
from app.models.user import User, UserRole
from app.schemas.rental_plan import RentalPlanCreate, RentalPlanUpdate, RentalPlanResponse

router = APIRouter(prefix="/rental-plans", tags=["rental-plans"])

# POST /rental-plans/ - create new rental plan (admin only)
@router.post("/", response_model=RentalPlanResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_rental_plan(
    request: Request,
    data: RentalPlanCreate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RentalPlan).where(RentalPlan.name == data.name))
    existing_plan = result.scalars().first()

    if existing_plan:
        raise HTTPException(status_code=400, detail="Rental plan with this name already exists")


    plan = RentalPlan(
        name=data.name,
        duration_days=data.duration_days,
        daily_rate=data.daily_rate,
        deposit_amount=data.deposit_amount,
        daily_fine_rate=data.daily_fine_rate,
        damage_fee=data.damage_fee

    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan

# GET /rental-plans/ - public endpoint, returns active plans to anyone
@router.get("/", response_model=list[RentalPlanResponse])
@limiter.limit("30/minute")
async def list_rental_plans(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RentalPlan).where(RentalPlan.is_active == True))
    plans = result.scalars().all()
    return plans

# GET /rental-plans/{id} - any logged in user
@router.get("/{plan_id}", response_model=RentalPlanResponse)
@limiter.limit("30/minute")
async def get_rental_plan(
    plan_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RentalPlan).where(RentalPlan.id == plan_id))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="Rental plan not found")
    return plan


# PATCH /rental-plans/{id} - admin edits a plan

@router.patch("/{plan_id}", response_model=RentalPlanResponse)
@limiter.limit("10/minute")
async def update_rental_plan(
    plan_id: int,
    request: Request,
    data: RentalPlanUpdate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RentalPlan).where(RentalPlan.id == plan_id))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="Rental plan not found")

    if data.name is not None:
        # check name uniqueness
        existing = await db.execute(
            select(RentalPlan).where(
                RentalPlan.name == data.name,
                RentalPlan.id != plan_id
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Plan with this name already exists")
        plan.name = data.name

    if data.duration_days is not None:
        plan.duration_days = data.duration_days
    if data.daily_rate is not None:
        plan.daily_rate = data.daily_rate
    if data.deposit_amount is not None:
        plan.deposit_amount = data.deposit_amount
    if data.daily_fine_rate is not None:
        plan.daily_fine_rate = data.daily_fine_rate
    if data.damage_fee is not None:
        plan.damage_fee = data.damage_fee
    if data.is_active is not None:
        plan.is_active = data.is_active

    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


# DELETE /rental-plans/{id} - admin soft deletes a plan

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rental_plan(
    plan_id: int,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RentalPlan).where(RentalPlan.id == plan_id))
    plan = result.scalars().first()

    if not plan:
        raise HTTPException(status_code=404, detail="Rental plan not found")

    plan.is_active = False
    db.add(plan)
    await db.commit()