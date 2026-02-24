from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped, relationship
from sqlalchemy import String, Integer, Float, Date, DateTime, ForeignKey, Enum, JSON, func, UniqueConstraint
from datetime import datetime, date
from typing import Optional
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./returnradar.db")
# For Postgres: "postgresql+asyncpg://user:pass@host/dbname"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    inbound_address: Mapped[str] = mapped_column(String(255), unique=True)  # e.g. u123@inbox.app.com
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    purchases: Mapped[list["Purchase"]] = relationship(back_populates="user")
    preferences: Mapped[Optional["UserPreferences"]] = relationship(back_populates="user", uselist=False)

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    min_purchase_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    alert_offsets_days: Mapped[list] = mapped_column(JSON, default=lambda: [10, 3, 1])
    timezone: Mapped[str] = mapped_column(String(50), default="UTC")
    user: Mapped["User"] = relationship(back_populates="preferences")

class Email(Base):
    __tablename__ = "emails"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    provider_message_id: Mapped[str] = mapped_column(String(255))
    from_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    from_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    received_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    body_excerpt: Mapped[Optional[str]] = mapped_column(String(8000), nullable=True)
    classification: Mapped[str] = mapped_column(String(50), default="unknown")  # receipt|shipping|other
    parsed_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|success|failed|skipped
    __table_args__ = (UniqueConstraint("user_id", "provider_message_id"),)

class Purchase(Base):
    __tablename__ = "purchases"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    merchant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    merchant_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    order_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    order_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    return_window_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    return_deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    policy_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # email|merchant_table|user_override
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active|returned|keep|ignore
    items: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    source_email_id: Mapped[Optional[int]] = mapped_column(ForeignKey("emails.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    user: Mapped["User"] = relationship(back_populates="purchases")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="purchase")

class MerchantPolicy(Base):
    __tablename__ = "merchant_policies"
    merchant_domain: Mapped[str] = mapped_column(String(255), primary_key=True)
    merchant_name: Mapped[str] = mapped_column(String(255))
    default_return_window_days: Mapped[int] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    alert_type: Mapped[str] = mapped_column(String(50))  # deadline_10d|deadline_3d|deadline_1d|expired
    scheduled_for: Mapped[date] = mapped_column(Date)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    channel: Mapped[str] = mapped_column(String(50), default="email")
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|sent|failed|skipped
    purchase: Mapped["Purchase"] = relationship(back_populates="alerts")
    __table_args__ = (UniqueConstraint("purchase_id", "alert_type"),)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_merchant_policies()

async def get_db():
    async with SessionLocal() as session:
        yield session

async def seed_merchant_policies():
    """Seed top merchant return policies."""
    from sqlalchemy import select
    policies = [
        ("amazon.com", "Amazon", 30, "Standard items. Electronics may differ."),
        ("apple.com", "Apple", 14, "14 days for most products"),
        ("bestbuy.com", "Best Buy", 15, "15 days standard, 30 for Elite members"),
        ("walmart.com", "Walmart", 90, "Most items 90 days"),
        ("target.com", "Target", 90, "Most items 90 days"),
        ("nike.com", "Nike", 60, "60 days"),
        ("adidas.com", "Adidas", 30, "30 days"),
        ("nordstrom.com", "Nordstrom", 365, "No set time limit (365 used as estimate)"),
        ("macys.com", "Macy's", 90, "90 days with receipt"),
        ("gap.com", "Gap", 45, "45 days"),
        ("zara.com", "Zara", 30, "30 days"),
        ("hm.com", "H&M", 30, "30 days"),
        ("uniqlo.com", "Uniqlo", 30, "30 days"),
        ("costco.com", "Costco", 90, "Electronics 90 days, most items anytime"),
        ("wayfair.com", "Wayfair", 30, "30 days"),
        ("etsy.com", "Etsy", 30, "Varies by seller, 30 day estimate"),
        ("newegg.com", "Newegg", 30, "30 days"),
        ("b&h.com", "B&H Photo", 30, "30 days"),
        ("chewy.com", "Chewy", 365, "Satisfaction guarantee"),
        ("zappos.com", "Zappos", 365, "365 days"),
        ("sephora.com", "Sephora", 60, "60 days"),
        ("ulta.com", "Ulta", 60, "60 days"),
        ("ikea.com", "IKEA", 365, "365 days unopened"),
        ("homedepot.com", "Home Depot", 90, "Most items 90 days"),
        ("lowes.com", "Lowe's", 90, "Most items 90 days"),
        ("kohls.com", "Kohl's", 180, "180 days"),
        ("jcrew.com", "J.Crew", 60, "60 days"),
        ("anthropologie.com", "Anthropologie", 60, "60 days"),
        ("rei.com", "REI", 365, "1 year for most items"),
        ("patagonia.com", "Patagonia", 365, "Ironclad guarantee"),
    ]
    async with SessionLocal() as session:
        for domain, name, days, notes in policies:
            result = await session.execute(select(MerchantPolicy).where(MerchantPolicy.merchant_domain == domain))
            if not result.scalar_one_or_none():
                session.add(MerchantPolicy(
                    merchant_domain=domain,
                    merchant_name=name,
                    default_return_window_days=days,
                    notes=notes
                ))
        await session.commit()
