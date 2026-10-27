from fastapi import APIRouter, Depends, HTTPException, Request   
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.core.logger import allocation_logger
from app.db.session import get_db
from app.services.allocation_service import allocate_asset, reject_booking_request
from app.schemas.allocation import AllocationCreate, AllocationResponse
from app.schemas.booking import BookingResponse
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user
from app.models.allocations import Allocation

router = APIRouter(prefix="/admin", tags=["Admin Allocations"])


@router.get("/allocations", response_model=list[AllocationResponse])
@limiter.limit("30/minute")
async def list_allocations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin]))
):
    allocation_logger.info(f"Retrieving allocations list - Admin: {current_user.email}")
    result = await db.execute(select(Allocation).order_by(Allocation.allocated_at.desc()))
    allocations = result.scalars().all()
    allocation_logger.info(f"Retrieved {len(allocations)} allocations - Admin: {current_user.email}")
    return allocations

@router.post("/allocate/{booking_id}", response_model=AllocationResponse)
@limiter.limit("10/minute")
async def admin_allocate_asset(
    booking_id: int,
    request: Request,
    allocation_data: AllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin]))
):
    allocation_logger.info(f"Asset allocation initiated - BookingId: {booking_id}, AssetId: {allocation_data.asset_id}, Admin: {current_user.email}")
    try:
        allocation = await allocate_asset(
            db=db,
            booking_id=booking_id,
            asset_id=allocation_data.asset_id,
            allocated_by=current_user.id
        )
        allocation_logger.info(f"Asset allocated successfully - BookingId: {booking_id}, AssetId: {allocation_data.asset_id}, AllocationId: {allocation.id}, Admin: {current_user.email}")
        return allocation
    except Exception as e:
        allocation_logger.error(f"Asset allocation failed - BookingId: {booking_id}, AssetId: {allocation_data.asset_id}, Admin: {current_user.email}, Error: {str(e)}")
        raise


@router.patch("/bookings/{booking_id}/reject", response_model=BookingResponse)
async def admin_reject_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin]))
):
    allocation_logger.info(f"Booking rejection initiated - BookingId: {booking_id}, Admin: {current_user.email}")
    try:
        booking = await reject_booking_request(db=db, booking_id=booking_id)
        allocation_logger.info(f"Booking rejected successfully - BookingId: {booking_id}, Admin: {current_user.email}")
        return booking
    except Exception as e:
        allocation_logger.error(f"Booking rejection failed - BookingId: {booking_id}, Admin: {current_user.email}, Error: {str(e)}")
        raise
    