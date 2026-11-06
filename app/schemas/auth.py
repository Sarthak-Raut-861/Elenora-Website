from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from app.models.user import UserRole


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None

class SendOtpRequest(BaseModel):
    phone: str
    email: EmailStr | None = None

class SendOtpResponse(BaseModel):
    message: str
    phone: str
    expires_in_seconds: int = 300
    dev_otp: str | None = None

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str

class VerifyOtpResponse(BaseModel):
    verified: bool
    message: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    phone: str | None = None
    is_active: bool
    created_at: datetime | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    
class AccessTokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
