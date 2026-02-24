"""
Inbound email webhook — handles POST from Mailgun or SendGrid inbound parse.
Configure your Mailgun/SendGrid route to POST to: POST /api/emails/inbound
"""

from fastapi import APIRouter, Request, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, Email, Purchase, User
from parser import process_email, classify_email, html_to_text
from datetime import datetime
import hashlib

router = APIRouter()


def make_message_id(from_addr: str, subject: str, timestamp: str) -> str:
    """Generate a stable unique ID for deduplication when no message-id header."""
    raw = f"{from_addr}|{subject}|{timestamp}"
    return hashlib.sha256(raw.encode()).hexdigest()[:40]


@router.post("/inbound")
async def inbound_email(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles inbound email from Mailgun or SendGrid.
    Both services POST form data; field names differ slightly.
    """
    form = await request.form()

    # Normalize across Mailgun / SendGrid
    recipient = form.get("recipient") or form.get("to") or ""
    from_addr = form.get("sender") or form.get("from") or ""
    subject = form.get("subject") or ""
    body_html = form.get("body-html") or form.get("html") or ""
    body_text = form.get("body-plain") or form.get("text") or ""
    message_id = form.get("Message-Id") or form.get("headers", "")
    timestamp = form.get("timestamp") or str(datetime.utcnow().timestamp())

    if not message_id:
        message_id = make_message_id(from_addr, subject, timestamp)

    # Resolve user from recipient address (e.g. u123@inbox.returnradar.app)
    local_part = recipient.split("@")[0] if "@" in recipient else ""
    result = await db.execute(
        select(User).where(User.inbound_address.like(f"{local_part}@%"))
    )
    user = result.scalar_one_or_none()
    if not user:
        # Could be a catch-all; for now accept and try to match by full address
        result = await db.execute(select(User).where(User.inbound_address == recipient))
        user = result.scalar_one_or_none()

    if not user:
        return {"status": "ignored", "reason": "no user found for recipient"}

    # Dedup
    existing = await db.execute(
        select(Email).where(
            Email.user_id == user.id,
            Email.provider_message_id == message_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate"}

    # Classify
    body = body_html or body_text
    body_text_clean = html_to_text(body) if body_html else body_text
    from_domain = from_addr.split("@")[-1].strip(">").lower() if "@" in from_addr else ""
    classification = classify_email(subject, body_text_clean, from_domain)

    # Store email record
    email_record = Email(
        user_id=user.id,
        provider_message_id=message_id,
        from_domain=from_domain,
        from_address=from_addr,
        subject=subject,
        received_at=datetime.utcnow(),
        body_excerpt=body_text_clean[:6000],
        classification=classification,
        parsed_status="pending",
    )
    db.add(email_record)
    await db.flush()  # get email_record.id

    if classification != "receipt":
        email_record.parsed_status = "skipped"
        await db.commit()
        return {"status": "skipped", "classification": classification}

    # Parse
    purchase_data = await process_email(
        user_id=user.id,
        email_id=email_record.id,
        subject=subject,
        body_html=body,
        from_address=from_addr,
        received_at=email_record.received_at,
    )

    if not purchase_data:
        email_record.parsed_status = "failed"
        await db.commit()
        return {"status": "parse_failed"}

    # Dedup purchase by order_id + domain, or by hash
    if purchase_data.get("order_id") and purchase_data.get("merchant_domain"):
        dup = await db.execute(
            select(Purchase).where(
                Purchase.user_id == user.id,
                Purchase.order_id == purchase_data["order_id"],
                Purchase.merchant_domain == purchase_data["merchant_domain"],
            )
        )
        if dup.scalar_one_or_none():
            email_record.parsed_status = "skipped"
            await db.commit()
            return {"status": "duplicate_purchase"}

    purchase = Purchase(**purchase_data)
    db.add(purchase)
    email_record.parsed_status = "success"
    await db.commit()

    return {
        "status": "ok",
        "purchase_id": purchase.id,
        "merchant": purchase.merchant_name,
        "deadline": str(purchase.return_deadline),
        "confidence": purchase.confidence,
    }
