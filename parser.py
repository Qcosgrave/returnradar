"""
Receipt parsing pipeline:
1. Classifier — is this a receipt?
2. Heuristic extractor — fast regex pass
3. Claude fallback — for anything heuristics miss
4. Policy resolver — compute deadline
"""

import re
import os
import json
import httpx
from datetime import date, timedelta
from email import message_from_string
from bs4 import BeautifulSoup
from typing import Optional
from database import SessionLocal, MerchantPolicy
from sqlalchemy import select


# ---------------------------------------------------------------------------
# Step 1: Classifier
# ---------------------------------------------------------------------------

RECEIPT_SUBJECT_KEYWORDS = [
    "receipt", "order confirmation", "order confirmed",
    "thanks for your purchase", "thank you for your order",
    "your order", "invoice", "order summary", "purchase confirmation",
    "you ordered", "order #", "payment confirmation",
]

RECEIPT_BODY_KEYWORDS = [
    "order number", "order #", "order total", "subtotal",
    "items ordered", "billing address", "you purchased",
    "your purchase", "payment method",
]

SHIPPING_SUBJECT_KEYWORDS = [
    "shipped", "out for delivery", "delivered", "on its way",
    "tracking", "arriving", "delivery update",
]


def classify_email(subject: str, body_text: str, from_domain: str) -> str:
    """Returns: 'receipt' | 'shipping' | 'other'"""
    subject_lower = subject.lower() if subject else ""
    body_lower = body_text.lower()[:3000] if body_text else ""

    for kw in SHIPPING_SUBJECT_KEYWORDS:
        if kw in subject_lower:
            return "shipping"

    for kw in RECEIPT_SUBJECT_KEYWORDS:
        if kw in subject_lower:
            return "receipt"

    body_hits = sum(1 for kw in RECEIPT_BODY_KEYWORDS if kw in body_lower)
    if body_hits >= 2:
        return "receipt"

    return "other"


# ---------------------------------------------------------------------------
# Step 2: Heuristic extractor
# ---------------------------------------------------------------------------

DATE_PATTERNS = [
    r"(?:order(?:ed)?|placed|date)[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4})",
    r"(?:order(?:ed)?|placed|date)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
    r"(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\b)",
]

TOTAL_PATTERNS = [
    r"(?:order total|total charged|total)[:\s]+\$?([\d,]+\.\d{2})",
    r"\$\s*([\d,]+\.\d{2})\s*(?:USD)?",
]

ORDER_ID_PATTERNS = [
    r"(?:order(?:\s+number|\s+#|#|id)[:\s#]+)([A-Z0-9\-]{5,30})",
    r"(?:#)([A-Z0-9\-]{6,30})",
]

RETURN_WINDOW_PATTERNS = [
    r"(\d+)[\-\s]day(?:s)?\s+(?:return|refund|exchange)",
    r"return(?:s)?\s+(?:within|up to|for)\s+(\d+)\s+days?",
    r"(\d+)\s+days?\s+(?:to\s+)?return",
]

CURRENCY_SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY"}


def html_to_text(html: str) -> str:
    try:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "head"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)
    except Exception:
        return html


def extract_heuristics(subject: str, body: str, from_address: str) -> dict:
    result = {
        "merchant_name": None,
        "merchant_domain": None,
        "order_date": None,
        "total_amount": None,
        "currency": "USD",
        "order_id": None,
        "return_window_days": None,
        "items": None,
        "confidence": 0.5,
    }

    # Merchant from from_address
    if from_address and "@" in from_address:
        domain = from_address.split("@")[-1].strip(">").lower()
        result["merchant_domain"] = domain
        result["merchant_name"] = domain.split(".")[0].capitalize()

    text = body[:6000]

    # Order date
    for pat in DATE_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            result["order_date"] = m.group(1).strip()
            break

    # Total
    for pat in TOTAL_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            amt = m.group(1).replace(",", "")
            try:
                result["total_amount"] = float(amt)
                result["confidence"] = min(result["confidence"] + 0.15, 1.0)
                break
            except ValueError:
                pass

    # Order ID
    for pat in ORDER_ID_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            result["order_id"] = m.group(1).strip()
            result["confidence"] = min(result["confidence"] + 0.1, 1.0)
            break

    # Return window
    for pat in RETURN_WINDOW_PATTERNS:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                result["return_window_days"] = int(m.group(1))
                result["policy_source"] = "email"
                result["confidence"] = min(result["confidence"] + 0.2, 1.0)
                break
            except ValueError:
                pass

    return result


# ---------------------------------------------------------------------------
# Step 3: Claude LLM fallback
# ---------------------------------------------------------------------------

CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"

EXTRACT_PROMPT = """You are a receipt parser. Extract purchase information from the email below.

Return ONLY valid JSON matching this exact schema:
{
  "merchant_name": string or null,
  "order_date": "YYYY-MM-DD" or null,
  "total_amount": number or null,
  "currency": "USD" or other 3-letter code or null,
  "order_id": string or null,
  "return_window_days": integer or null (ONLY if explicitly stated in the email — do NOT infer or guess),
  "items": string description of items or null,
  "confidence": float between 0.0 and 1.0
}

Rules:
- return_window_days must be null unless the email explicitly mentions a return period in days
- Do not invent or infer return_window_days from typical policies
- confidence reflects how certain you are about the extracted fields (0.5 = uncertain, 0.9 = high confidence)
- Return only the JSON object, no other text

Email:
"""


async def extract_with_claude(body_excerpt: str) -> Optional[dict]:
    if not CLAUDE_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 500,
                    "messages": [
                        {
                            "role": "user",
                            "content": EXTRACT_PROMPT + body_excerpt[:5000],
                        }
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["content"][0]["text"].strip()
            # Strip markdown fences if present
            content = re.sub(r"^```(?:json)?\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
            return json.loads(content)
    except Exception as e:
        print(f"Claude extraction error: {e}")
        return None


# ---------------------------------------------------------------------------
# Step 4: Policy resolver
# ---------------------------------------------------------------------------

def parse_date_string(s: str) -> Optional[date]:
    if not s:
        return None
    formats = ["%Y-%m-%d", "%B %d, %Y", "%B %d %Y", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y"]
    for fmt in formats:
        try:
            from datetime import datetime
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


async def resolve_policy(merchant_domain: str, return_window_days: Optional[int]) -> dict:
    """Returns {return_window_days, policy_source, confidence_boost}"""
    if return_window_days is not None:
        return {"return_window_days": return_window_days, "policy_source": "email", "confidence_boost": 0.1}

    # Check merchant table
    async with SessionLocal() as session:
        result = await session.execute(
            select(MerchantPolicy).where(MerchantPolicy.merchant_domain == merchant_domain)
        )
        policy = result.scalar_one_or_none()
        if policy:
            return {
                "return_window_days": policy.default_return_window_days,
                "policy_source": "merchant_table",
                "confidence_boost": 0.0,
            }

    # Generic fallback
    return {"return_window_days": 30, "policy_source": "fallback", "confidence_boost": -0.2}


def compute_deadline(order_date: Optional[date], delivery_date: Optional[date], window_days: int) -> Optional[date]:
    base = delivery_date or order_date
    if not base:
        return None
    return base + timedelta(days=window_days)


# ---------------------------------------------------------------------------
# Main pipeline entry point
# ---------------------------------------------------------------------------

async def process_email(
    user_id: int,
    email_id: int,
    subject: str,
    body_html: str,
    from_address: str,
    received_at,
) -> Optional[dict]:
    """
    Full pipeline. Returns a dict suitable for creating a Purchase, or None if not a receipt.
    """
    body_text = html_to_text(body_html)

    # 1. Classify
    from_domain = from_address.split("@")[-1].strip(">").lower() if "@" in from_address else ""
    classification = classify_email(subject, body_text, from_domain)

    if classification != "receipt":
        return None

    # 2. Heuristic extraction
    heuristics = extract_heuristics(subject, body_text, from_address)

    # 3. Claude fallback if confidence is low or missing key fields
    needs_claude = (
        heuristics["confidence"] < 0.7
        or not heuristics["order_date"]
        or not heuristics["total_amount"]
    )

    if needs_claude:
        claude_result = await extract_with_claude(body_text)
        if claude_result:
            # Merge: Claude fills gaps, but don't override what heuristics found confidently
            for field in ["merchant_name", "order_date", "total_amount", "currency",
                          "order_id", "return_window_days", "items"]:
                if not heuristics.get(field) and claude_result.get(field):
                    heuristics[field] = claude_result[field]
            if claude_result.get("confidence"):
                heuristics["confidence"] = max(heuristics["confidence"], claude_result["confidence"])

    # 4. Resolve policy + compute deadline
    merchant_domain = heuristics.get("merchant_domain") or from_domain
    policy = await resolve_policy(merchant_domain, heuristics.get("return_window_days"))
    heuristics["return_window_days"] = policy["return_window_days"]
    heuristics["policy_source"] = policy["policy_source"]
    heuristics["confidence"] = min(1.0, heuristics["confidence"] + policy["confidence_boost"])

    order_date = parse_date_string(str(heuristics["order_date"])) if heuristics["order_date"] else received_at.date() if received_at else None
    deadline = compute_deadline(order_date, None, heuristics["return_window_days"]) if heuristics["return_window_days"] else None

    return {
        "user_id": user_id,
        "merchant_name": heuristics["merchant_name"],
        "merchant_domain": merchant_domain,
        "order_id": heuristics.get("order_id"),
        "order_date": order_date,
        "total_amount": heuristics.get("total_amount"),
        "currency": heuristics.get("currency", "USD"),
        "return_window_days": heuristics["return_window_days"],
        "return_deadline": deadline,
        "policy_source": heuristics["policy_source"],
        "confidence": round(heuristics["confidence"], 2),
        "items": heuristics.get("items"),
        "source_email_id": email_id,
        "status": "active",
    }
