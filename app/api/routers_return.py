from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.return_service import process_return
from app.schemas.returns import ReturnCreate, ReturnResponse
from app.core.rbac import require_roles
from app.core.rate_limiter import limiter
from app.core.logger import return_logger
from app.models.user import UserRole, User

router = APIRouter(prefix="/admin", tags=["Admin Returns"])


@router.post("/returns/{booking_id}", response_model=ReturnResponse)
@limiter.limit("10/minute")
async def process_return_api(
    booking_id: int,
    request: Request,
    data: ReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin]))
):
    return_logger.info(f"Asset return processing - BookingId: {booking_id}, Admin: {current_user.email}, Damage: {data.damage_amount}, DryClean: {data.send_for_dry_cleaning}")
    
    try:
        return_record = await process_return(
            db=db,
            booking_id=booking_id,
            admin_id=current_user.id,
            returned_at=data.returned_at,
            damage_amount=data.damage_amount,
            damage_notes=data.damage_notes,
            send_for_dry_cleaning=data.send_for_dry_cleaning,
        )
        return_logger.info(f"Asset return processed successfully - BookingId: {booking_id}, ReturnId: {return_record.id}, Admin: {current_user.email}")
        return return_record
    except Exception as e:
        return_logger.error(f"Asset return processing failed - BookingId: {booking_id}, Admin: {current_user.email}, Error: {str(e)}")
        raise