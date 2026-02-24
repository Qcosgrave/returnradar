from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, User, UserPreferences, Alert
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class CreateUser(BaseModel):
    email: str

class UpdatePreferences(BaseModel):
    min_purchase_amount: Optional[float] = None
    alert_offsets_days: Optional[list[int]] = None
    timezone: Optional[str] = None

@router.post("/")
async def create_user(body: CreateUser, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate unique inbound address
    slug = body.email.split("@")[0].lower().replace(".", "")[:12]
    unique_id = str(uuid.uuid4())[:8]
    inbound = f"{slug}{unique_id}@inbox.returnradar.app"

    user = User(email=body.email, inbound_address=inbound)
    db.add(user)
    await db.flush()

    prefs = UserPreferences(user_id=user.id)
    db.add(prefs)
    await db.commit()

    return {"id": user.id, "email": user.email, "inbound_address": inbound}

@router.get("/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    return {"id": user.id, "email": user.email, "inbound_address": user.inbound_address}

@router.patch("/{user_id}/preferences")
async def update_preferences(user_id: int, body: UpdatePreferences, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserPreferences).where(UserPreferences.user_id == user_id))
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)

    if body.min_purchase_amount is not None:
        prefs.min_purchase_amount = body.min_purchase_amount
    if body.alert_offsets_days is not None:
        prefs.alert_offsets_days = body.alert_offsets_days
    if body.timezone is not None:
        prefs.timezone = body.timezone

    await db.commit()
    return {"status": "ok"}
