from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.dependencies import get_current_user
from app.core.logger import payment_logger
from app.core.rate_limiter import limiter
from app.db.session import get_db
from app.models.bookings import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.returns import Return
from app.models.tracking import TrackingEvent
from app.models.user import User, UserRole
from app.schemas.payment import PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


def _log_tracking_event(db: AsyncSession, booking_id: int, event_type: str, description: str, user_id: int | None = None):
    event = TrackingEvent(
        booking_id=booking_id,
        event_type=event_type,
        event_at=datetime.now(timezone.utc),
        description=description,
        created_by=user_id,
    )
    db.add(event)


@router.post("/deposit/{booking_id}", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
async def pay_deposit(
    booking_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payment_logger.info(f"Deposit payment attempt for booking #{booking_id} by {current_user.email}")

    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")

    if booking.status != BookingStatus.pending:
        raise HTTPException(status_code=400, detail=f"Cannot pay deposit for booking in status '{booking.status}'")

    payment = Payment(
        booking_id=booking_id,
        type=PaymentType.deposit,
        amount=booking.deposit_amount,
        status=PaymentStatus.paid,
        created_at=datetime.now(timezone.utc),
    )
    db.add(payment)

    booking.status = BookingStatus.booked

    _log_tracking_event(
        db,
        booking_id=booking_id,
        event_type="deposit_paid",
        description=f"Security deposit of ₹{booking.deposit_amount} received successfully",
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(payment)
    payment_logger.info(f"Deposit paid successfully for booking #{booking_id}")
    return payment


@router.post("/rent/{booking_id}", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
async def pay_rent(
    booking_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payment_logger.info(f"Rent payment attempt for booking #{booking_id} by {current_user.email}")

    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this booking")

    if booking.status != BookingStatus.allocated:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pay rent for booking in status '{booking.status}'. Garment must first be allocated by atelier."
        )

    payment = Payment(
        booking_id=booking_id,
        type=PaymentType.rent,
        amount=booking.rent_amount,
        status=PaymentStatus.paid,
        created_at=datetime.now(timezone.utc),
    )
    db.add(payment)

    # If pickup date has arrived, mark picked up, else rent_paid
    today = date.today()
    if booking.pickup_date <= today:
        booking.status = BookingStatus.picked_up
        # Also mark the allocated asset as picked_up
        from app.models.allocations import Allocation
        from app.models.asset import Asset, AssetStatus
        alloc_res = await db.execute(select(Allocation).where(Allocation.booking_id == booking_id))
        alloc = alloc_res.scalars().first()
        if alloc:
            asset_res = await db.execute(select(Asset).where(Asset.id == alloc.asset_id))
            asset = asset_res.scalars().first()
            if asset:
                asset.status = AssetStatus.picked_up
        _log_tracking_event(
            db,
            booking_id=booking_id,
            event_type="picked_up",
            description=f"Rental fee of ₹{booking.rent_amount} paid; piece picked up for rental period",
            user_id=current_user.id,
        )
    else:
        booking.status = BookingStatus.rent_paid
        _log_tracking_event(
            db,
            booking_id=booking_id,
            event_type="rent_paid",
            description=f"Rental fee of ₹{booking.rent_amount} paid successfully; ready for scheduled pickup",
            user_id=current_user.id,
        )

    await db.commit()
    await db.refresh(payment)
    payment_logger.info(f"Rent paid successfully for booking #{booking_id}")
    return payment


@router.get("/breakdown/{booking_id}")
@limiter.limit("30/minute")
async def get_payment_breakdown(
    booking_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role != UserRole.admin and booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view breakdown for this booking")

    # Fetch payments
    p_res = await db.execute(select(Payment).where(Payment.booking_id == booking_id))
    payments = p_res.scalars().all()

    deposit_paid = Decimal("0")
    rent_paid = Decimal("0")
    fine_paid = Decimal("0")
    deposit_refunded = Decimal("0")

    for p in payments:
        if p.status == PaymentStatus.paid:
            amt = Decimal(str(p.amount))
            if p.type == PaymentType.deposit:
                deposit_paid += amt
            elif p.type == PaymentType.rent:
                rent_paid += amt
            elif p.type == PaymentType.fine:
                fine_paid += amt
            elif p.type == PaymentType.deposit_refund:
                deposit_refunded += amt

    # Return info
    ret_res = await db.execute(select(Return).where(Return.booking_id == booking_id))
    return_record = ret_res.scalars().first()

    late_fine = Decimal(str(return_record.fine_amount)) if return_record else Decimal("0")
    damage_charges = Decimal(str(return_record.damage_amount)) if return_record else Decimal("0")

    total_paid = deposit_paid + rent_paid + fine_paid
    total_due = Decimal(str(booking.rent_amount)) + Decimal(str(booking.deposit_amount)) - (deposit_paid + rent_paid)
    if total_due < 0:
        total_due = Decimal("0")

    net_deposit_refund = deposit_refunded

    return {
        "booking_id": booking.id,
        "user_id": booking.user_id,
        "status": booking.status,
        "breakdown": {
            "planned_rent": float(booking.rent_amount),
            "planned_deposit": float(booking.deposit_amount),
            "actual_payments": {
                "deposit_paid": float(deposit_paid),
                "rent_paid": float(rent_paid),
                "deposit_refunded": float(deposit_refunded),
            },
            "charges": {
                "late_fine": float(late_fine),
                "damage_charges": float(damage_charges),
            },
            "totals": {
                "total_paid": float(total_paid),
                "total_due": float(total_due),
                "net_deposit_refund": float(net_deposit_refund),
            },
        },
    }

