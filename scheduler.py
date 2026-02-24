"""
Alert scheduler — run this as a daily cron job or APScheduler task.

Usage:
  python scheduler.py

Or add to main.py startup with APScheduler:
  from apscheduler.schedulers.asyncio import AsyncIOScheduler
  scheduler = AsyncIOScheduler()
  scheduler.add_job(run_alerts, 'cron', hour=9)  # 9am UTC daily
"""

import asyncio
import os
from datetime import date, datetime
from typing import Optional
import httpx
from sqlalchemy import select, and_
from database import SessionLocal, Purchase, Alert, User, UserPreferences, init_db

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "alerts@returnradar.app")
APP_URL = os.environ.get("APP_URL", "https://returnradar.app")


async def send_email_alert(to_email: str, subject: str, html_body: str):
    """Send via SendGrid."""
    if not SENDGRID_API_KEY:
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
        return True
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {SENDGRID_API_KEY}"},
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": FROM_EMAIL, "name": "ReturnRadar"},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_body}],
                },
                timeout=15,
            )
            return resp.status_code in (200, 202)
    except Exception as e:
        print(f"Email send error: {e}")
        return False


def build_alert_email(purchase: Purchase, days_left: int) -> tuple[str, str]:
    """Returns (subject, html_body)"""
    urgency = "⚠️ URGENT" if days_left <= 1 else "🔔"
    subject = f"{urgency} Return deadline: {purchase.merchant_name} — {days_left} day{'s' if days_left != 1 else ''} left"

    deadline_str = purchase.return_deadline.strftime("%B %d, %Y") if purchase.return_deadline else "Unknown"
    amount_str = f"${purchase.total_amount:,.2f}" if purchase.total_amount else "Unknown amount"
    items_str = purchase.items or "Your order"

    html = f"""
    <div style="font-family: monospace; max-width: 520px; margin: 0 auto; background: #080d14; color: #e2e8f0; padding: 32px; border-radius: 12px;">
      <div style="font-size: 22px; font-weight: 800; margin-bottom: 4px; color: #f1f5f9;">ReturnRadar</div>
      <div style="font-size: 11px; color: #475569; margin-bottom: 28px; text-transform: uppercase; letter-spacing: 0.1em;">Return Deadline Alert</div>

      <div style="background: #0c1420; border: 1px solid #1e2d40; border-radius: 10px; padding: 24px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 48px; font-weight: 800; color: {'#ef4444' if days_left <= 3 else '#f59e0b'}; line-height: 1;">{days_left}</div>
        <div style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em;">day{'s' if days_left != 1 else ''} left to return</div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">{purchase.merchant_name}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">{items_str}</div>
      </div>

      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #1e2d40;">
          <td style="padding: 8px 0; color: #475569;">Order</td>
          <td style="padding: 8px 0; text-align: right; color: #e2e8f0;">{purchase.order_id or 'N/A'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e2d40;">
          <td style="padding: 8px 0; color: #475569;">Amount</td>
          <td style="padding: 8px 0; text-align: right; color: #e2e8f0;">{amount_str}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">Return deadline</td>
          <td style="padding: 8px 0; text-align: right; color: {'#ef4444' if days_left <= 3 else '#fcd34d'}; font-weight: 600;">{deadline_str}</td>
        </tr>
      </table>

      <a href="{APP_URL}" style="display: block; background: linear-gradient(135deg, #22d3ee, #818cf8); color: #0c1420; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.05em;">
        VIEW IN RETURNRADAR →
      </a>

      <div style="margin-top: 20px; font-size: 11px; color: #334155; text-align: center;">
        You're receiving this because a return window is closing.<br>
        <a href="{APP_URL}/settings" style="color: #475569;">Manage preferences</a>
      </div>
    </div>
    """
    return subject, html


async def run_alerts():
    """Main daily alert job."""
    today = date.today()
    print(f"[Scheduler] Running alerts for {today}")
    sent_count = 0
    skipped_count = 0

    async with SessionLocal() as session:
        # Get all active purchases with upcoming deadlines
        result = await session.execute(
            select(Purchase).where(
                and_(
                    Purchase.status == "active",
                    Purchase.return_deadline.isnot(None),
                )
            )
        )
        purchases = result.scalars().all()

        for purchase in purchases:
            days_left = (purchase.return_deadline - today).days

            # Get user + preferences
            user_result = await session.execute(select(User).where(User.id == purchase.user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            pref_result = await session.execute(
                select(UserPreferences).where(UserPreferences.user_id == purchase.user_id)
            )
            prefs = pref_result.scalar_one_or_none()
            offsets = prefs.alert_offsets_days if prefs else [10, 3, 1]
            min_amount = prefs.min_purchase_amount if prefs else None

            # Amount threshold check
            if min_amount and purchase.total_amount and purchase.total_amount < min_amount:
                skipped_count += 1
                continue

            # Check if today matches any offset
            matched_offset = None
            for offset in offsets:
                if days_left == offset:
                    matched_offset = offset
                    break

            # Also handle expired (days_left == -1)
            alert_type = None
            if matched_offset is not None:
                alert_type = f"deadline_{matched_offset}d"
            elif days_left == -1:
                alert_type = "expired"

            if not alert_type:
                continue

            # Check if already sent
            existing_alert = await session.execute(
                select(Alert).where(
                    and_(
                        Alert.purchase_id == purchase.id,
                        Alert.alert_type == alert_type,
                    )
                )
            )
            if existing_alert.scalar_one_or_none():
                skipped_count += 1
                continue

            # Send it
            subject, html_body = build_alert_email(purchase, max(0, days_left))
            success = await send_email_alert(user.email, subject, html_body)

            alert = Alert(
                purchase_id=purchase.id,
                user_id=purchase.user_id,
                alert_type=alert_type,
                scheduled_for=today,
                sent_at=datetime.utcnow() if success else None,
                channel="email",
                status="sent" if success else "failed",
            )
            session.add(alert)
            sent_count += 1

        await session.commit()

    print(f"[Scheduler] Done. Sent: {sent_count}, Skipped: {skipped_count}")


if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(run_alerts())
