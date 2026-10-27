from fastapi import Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.models.user import UserRole


def require_roles(allowed_roles: list[UserRole]):
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return dependency