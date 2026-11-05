from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user
from app.core.logger import logger
from app.core.rate_limiter import limiter
from app.core.rbac import require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.bookings import Booking
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse
from app.schemas.user import (
    UserActivate,
    UserBookingHistoryItem,
    UserCreateAdmin,
    UserHistoryResponse,
    UserHistorySummary,
    UserHistoryUser,
    UserPaymentHistoryItem,
    UserRoleUpdate,
    UserUpdate,
    UserUpdateAdmin,
)

router = APIRouter(prefix="/users", tags=["Users"])

SUPER_ADMIN_EMAILS = {"admin@elanora-luxury.com"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()
    if data.phone is not None:
        current_user.phone = data.phone.strip()

    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/", response_model=list[UserResponse])
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    role: UserRole | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    query = select(User).order_by(User.id.desc())
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    res = await db.execute(query)
    return res.scalars().all()


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdateAdmin,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.phone is not None:
        user.phone = data.phone.strip()

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserResponse)
async def set_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == current_user.id and data.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own administrator privileges."
        )

    if user.email.lower() in SUPER_ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Protected Super Administrator: privilege role cannot be altered or removed."
        )

    user.role = data.role
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/activate", response_model=UserResponse)
async def set_user_active(
    user_id: int,
    data: UserActivate,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == current_user.id and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrator account."
        )

    if user.email.lower() in SUPER_ADMIN_EMAILS and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Protected Super Administrator: Super Admin account cannot be deactivated."
        )

    user.is_active = data.is_active
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    data: UserCreateAdmin,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role=data.role,
        phone=data.phone.strip() if data.phone else None,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/dry-cleaner", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_dry_cleaner_user(
    data: UserCreateAdmin,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role=UserRole.dry_cleaner,
        phone=data.phone,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}/history", response_model=UserHistoryResponse)
@limiter.limit("30/minute")
async def get_user_history(
    request: Request,
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.staff])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch user bookings
    b_res = await db.execute(select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc()))
    bookings = b_res.scalars().all()

    # Extract aadhaar/pan from latest booking if present
    aadhaar_number = None
    pan_number = None
    for b in bookings:
        if b.aadhaar_number:
            aadhaar_number = b.aadhaar_number
        if b.pan_number:
            pan_number = b.pan_number
        if aadhaar_number and pan_number:
            break

    booking_ids = [b.id for b in bookings]

    # Fetch payments for user bookings
    payments = []
    if booking_ids:
        p_res = await db.execute(select(Payment).where(Payment.booking_id.in_(booking_ids)).order_by(Payment.created_at.desc()))
        payments = p_res.scalars().all()

    # Calculate summaries
    total_deposit_paid = Decimal("0")
    total_rent_paid = Decimal("0")
    total_fine_paid = Decimal("0")
    total_deposit_refunded = Decimal("0")

    for p in payments:
        if p.status == PaymentStatus.paid:
            amt = Decimal(str(p.amount))
            if p.type == PaymentType.deposit:
                total_deposit_paid += amt
            elif p.type == PaymentType.rent:
                total_rent_paid += amt
            elif p.type == PaymentType.fine:
                total_fine_paid += amt
            elif p.type == PaymentType.deposit_refund:
                total_deposit_refunded += amt

    active_bookings = sum(1 for b in bookings if b.status not in ["cancelled", "returned"])

    summary = UserHistorySummary(
        total_bookings=len(bookings),
        active_bookings=active_bookings,
        total_deposit_paid=total_deposit_paid,
        total_rent_paid=total_rent_paid,
        total_fine_paid=total_fine_paid,
        total_deposit_refunded=total_deposit_refunded,
    )

    return UserHistoryResponse(
        user=UserHistoryUser(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            phone=user.phone,
        ),
        aadhaar_number=aadhaar_number,
        pan_number=pan_number,
        summary=summary,
        bookings=bookings,
        payments=payments,
    )

