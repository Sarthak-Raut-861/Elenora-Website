from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user
from app.core.logger import logger
from app.core.rate_limiter import limiter
from app.core.rbac import require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.allocations import Allocation
from app.models.bookings import Booking
from app.models.dry_cleaning import DryCleaningRequest
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.returns import Return
from app.models.token import RefreshToken
from app.models.tracking import TrackingEvent
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

MASTER_SUPER_ADMIN_EMAILS = {"admin@elanora-luxury.com", "sarthakraut1484@gmail.com"}
ROOT_ADMIN_EMAIL = "admin@elanora-luxury.com"


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

    # Guard 1: Prevent admin from accidentally demoting own account
    if user_id == current_user.id and data.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own administrator privileges."
        )

    # Guard 2: Root system concierge cannot be demoted
    if user.email.lower() == ROOT_ADMIN_EMAIL and data.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The root System Concierge (admin@elanora-luxury.com) is permanently protected and cannot be demoted."
        )

    # Guard 3: Non-master administrator cannot modify a Master Super Admin
    is_target_master = user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    is_current_master = current_user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    if is_target_master and not is_current_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Master Super Administrator can alter high-priority administrator privileges."
        )

    user.role = data.role
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    logger.info(f"User {user.email} (ID {user_id}) role updated to {data.role} by {current_user.email}")
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

    if user.email.lower() == ROOT_ADMIN_EMAIL and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The root System Concierge (admin@elanora-luxury.com) cannot be deactivated."
        )

    is_target_master = user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    is_current_master = current_user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    if is_target_master and not is_current_master and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Master Super Administrator can deactivate high-priority administrator accounts."
        )

    user.is_active = data.is_active
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    logger.info(f"User {user.email} (ID {user_id}) active status set to {data.is_active} by {current_user.email}")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account while logged in."
        )

    if user.email.lower() == ROOT_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The root System Concierge (admin@elanora-luxury.com) is permanently protected and cannot be deleted."
        )

    is_target_master = user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    is_current_master = current_user.email.lower() in MASTER_SUPER_ADMIN_EMAILS
    if is_target_master and not is_current_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Master Super Administrator can delete high-priority administrator accounts."
        )

    # Clean up associated records before deletion to prevent foreign key errors:
    # 1. Delete user refresh tokens
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))

    # 2. Get user bookings and safely clean them up
    b_res = await db.execute(select(Booking.id).where(Booking.user_id == user_id))
    user_booking_ids = b_res.scalars().all()
    if user_booking_ids:
        await db.execute(update(DryCleaningRequest).where(DryCleaningRequest.booking_id.in_(user_booking_ids)).values(booking_id=None))
        await db.execute(delete(TrackingEvent).where(TrackingEvent.booking_id.in_(user_booking_ids)))
        await db.execute(delete(Payment).where(Payment.booking_id.in_(user_booking_ids)))
        await db.execute(delete(Return).where(Return.booking_id.in_(user_booking_ids)))
        await db.execute(delete(Allocation).where(Allocation.booking_id.in_(user_booking_ids)))
        await db.execute(delete(Booking).where(Booking.id.in_(user_booking_ids)))

    # 3. Reassign staff/admin operations performed by this user to current_user
    await db.execute(update(Allocation).where(Allocation.allocated_by == user_id).values(allocated_by=current_user.id))
    await db.execute(update(Return).where(Return.processed_by == user_id).values(processed_by=current_user.id))
    await db.execute(update(TrackingEvent).where(TrackingEvent.created_by == user_id).values(created_by=None))

    deleted_email = user.email
    await db.delete(user)
    await db.commit()
    logger.info(f"User {deleted_email} (ID {user_id}) permanently deleted by {current_user.email}")
    return {"message": f"User {deleted_email} permanently deleted successfully.", "id": user_id}


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

