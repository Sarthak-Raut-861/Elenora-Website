from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str | None = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True