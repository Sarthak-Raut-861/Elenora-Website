from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_user_optional
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.core.logger import booking_logger
from app.schemas.booking import (
    BookingResponse,
    BookingCreate,
    BlockedDateRangesResponse,
)
from app.services import booking_service
from app.models.user import UserRole

router = APIRouter(prefix="/bookings", tags=["bookings"])


# POST /bookings/ - create a new booking
@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_booking(
    request: Request,
    data: BookingCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Booking creation attempt - Asset: {data.requested_asset_id}, "
        f"User: {current_user.email}, "
        f"Pickup Date: {data.pickup_date}"
    )

    try:
        booking = await booking_service.create_booking(db, current_user, data)

        booking_logger.info(
            f"Booking created successfully - "
            f"BookingId: {booking.id}, "
            f"Asset: {data.requested_asset_id}, "
            f"User: {current_user.email}"
        )

        return booking

    except Exception as e:
        booking_logger.error(
            f"Booking creation failed - "
            f"Asset: {data.requested_asset_id}, "
            f"User: {current_user.email}, "
            f"Error: {str(e)}"
        )
        raise


# GET /bookings/ - get all bookings for current user
@router.get("/", response_model=list[BookingResponse])
@limiter.limit("30/minute")
async def get_user_bookings(
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Retrieving bookings for user: {current_user.email}"
    )

    bookings = await booking_service.get_user_bookings(db, current_user)

    booking_logger.info(
        f"Retrieved {len(bookings)} bookings for user: {current_user.email}"
    )

    return bookings


# GET /bookings/admin/all - admin get all bookings
@router.get("/admin/all", response_model=list[BookingResponse])
@limiter.limit("30/minute")
async def admin_get_all_bookings(
    request: Request,
    current_user=Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Admin retrieving all bookings - Admin: {current_user.email}"
    )

    bookings = await booking_service.get_all_bookings(db)

    booking_logger.info(
        f"Admin retrieved {len(bookings)} total bookings - "
        f"Admin: {current_user.email}"
    )

    return bookings


# POST /bookings/admin/refresh-statuses
@router.post("/admin/refresh-statuses")
@limiter.limit("20/minute")
async def refresh_booking_statuses(
    request: Request,
    current_user=Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Refreshing booking statuses - Admin: {current_user.email}"
    )

    result = await booking_service.refresh_booking_statuses(db)

    booking_logger.info(
        f"Booking statuses refreshed - "
        f"PickedUp: {len(result['picked_up'])}, "
        f"Overdue: {len(result['overdue'])}, "
        f"Admin: {current_user.email}"
    )

    return {
        "message": "Booking statuses refreshed",
        "picked_up_count": len(result["picked_up"]),
        "overdue_count": len(result["overdue"]),
        "picked_up_ids": result["picked_up"],
        "overdue_ids": result["overdue"],
    }


# PATCH /bookings/admin/{booking_id}/mark-picked-up
@router.patch("/admin/{booking_id}/mark-picked-up", response_model=BookingResponse)
@limiter.limit("30/minute")
async def mark_booking_picked_up(
    request: Request,
    booking_id: int,
    current_user=Depends(require_roles([UserRole.admin])),
    db: AsyncSession = Depends(get_db)
):
    """Admin marks booking as picked up by user"""
    booking_logger.info(
        f"Admin marking booking #{booking_id} as picked up - Admin: {current_user.email}"
    )
    
    booking = await booking_service.mark_picked_up(booking_id, db, admin_id=current_user.id)
    
    booking_logger.info(
        f"Booking #{booking_id} marked as picked up - Admin: {current_user.email}"
    )
    
    return booking


# GET /bookings/assets/{asset_id}/blocked-dates
@router.get(
    "/assets/{asset_id}/blocked-dates",
    response_model=BlockedDateRangesResponse
)
async def get_blocked_dates_for_asset(
    asset_id: int,
    current_user=Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    blocked_ranges = await booking_service.get_blocked_date_ranges_for_asset(
        db,
        asset_id
    )

    return {
        "asset_id": asset_id,
        "blocked_ranges": blocked_ranges
    }


# DELETE /bookings/{booking_id} - cancel booking
@router.delete("/{booking_id}", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Booking cancellation request - "
        f"BookingId: {booking_id}, "
        f"User: {current_user.email}"
    )

    try:
        booking = await booking_service.cancel_booking(
            db,
            current_user,
            booking_id
        )

        booking_logger.info(
            f"Booking cancelled successfully - "
            f"BookingId: {booking_id}, "
            f"User: {current_user.email}"
        )

        return booking

    except Exception as e:
        booking_logger.error(
            f"Booking cancellation failed - "
            f"BookingId: {booking_id}, "
            f"User: {current_user.email}, "
            f"Error: {str(e)}"
        )
        raise


# PATCH /bookings/{booking_id}/request-return
@router.patch("/{booking_id}/request-return", response_model=BookingResponse)
async def request_return(
    booking_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    booking_logger.info(
        f"Return request - "
        f"BookingId: {booking_id}, "
        f"User: {current_user.email}"
    )

    try:
        booking = await booking_service.request_return(
            db,
            current_user,
            booking_id
        )

        booking_logger.info(
            f"Return requested successfully - "
            f"BookingId: {booking_id}, "
            f"User: {current_user.email}"
        )

        return booking

    except Exception as e:
        booking_logger.error(
            f"Return request failed - "
            f"BookingId: {booking_id}, "
            f"User: {current_user.email}, "
            f"Error: {str(e)}"
        )
        raise