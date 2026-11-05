from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, Request
from app.core.logger import logger
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/contact", tags=["Contact Inquiries"])


class ContactInquiry(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    message: str


@router.post("/", status_code=200)
@limiter.limit("5/minute")
async def submit_contact_inquiry(request: Request, data: ContactInquiry):
    logger.info(f"Concierge Contact Inquiry received from: {data.name} ({data.email}), phone: {data.phone}")
    logger.info(f"Message: {data.message}")
    return {
        "status": "success",
        "message": "Thank you for contacting Elenora Atelier. Our concierge will be in touch shortly."
    }

