from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, Alert

router = APIRouter()

@router.get("/{user_id}")
async def list_alerts(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert).where(Alert.user_id == user_id).order_by(Alert.scheduled_for.desc())
    )
    alerts = result.scalars().all()
    return [a.__dict__ for a in alerts]
