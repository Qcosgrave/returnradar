from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, Purchase
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()

class PurchaseUpdate(BaseModel):
    status: Optional[str] = None
    return_window_days: Optional[int] = None
    policy_source: Optional[str] = "user_override"

@router.get("/{user_id}")
async def list_purchases(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Purchase)
        .where(Purchase.user_id == user_id)
        .order_by(Purchase.return_deadline.asc().nullslast())
    )
    purchases = result.scalars().all()
    return [p.__dict__ for p in purchases]

@router.patch("/{purchase_id}")
async def update_purchase(
    purchase_id: int,
    body: PurchaseUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    if body.status:
        purchase.status = body.status
    if body.return_window_days is not None:
        from datetime import timedelta
        purchase.return_window_days = body.return_window_days
        purchase.policy_source = "user_override"
        base = purchase.delivery_date or purchase.order_date
        if base:
            purchase.return_deadline = base + timedelta(days=body.return_window_days)

    await db.commit()
    return {"status": "ok", "id": purchase_id}

@router.delete("/{purchase_id}")
async def delete_purchase(purchase_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(purchase)
    await db.commit()
    return {"status": "deleted"}
