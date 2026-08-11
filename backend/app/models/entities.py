from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, time

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def uid() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    guest = "guest"
    host = "host"


class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    host_name: Mapped[str] = mapped_column(String(100))
    host_email: Mapped[str | None] = mapped_column(String(320))
    host_nickname: Mapped[str | None] = mapped_column(String(100))
    guest_name: Mapped[str] = mapped_column(String(100))
    guest_email: Mapped[str] = mapped_column(String(320))
    guest_nickname: Mapped[str | None] = mapped_column(String(100))
    personal_note: Mapped[str | None] = mapped_column(Text)
    host_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    guest_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    host_token_ciphertext: Mapped[str] = mapped_column(Text)
    guest_token_ciphertext: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="invited")
    current_version: Mapped[int] = mapped_column(Integer, default=0)
    confirmed_version: Mapped[int | None] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now().astimezone())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now().astimezone(), onupdate=lambda: datetime.now().astimezone()
    )
    proposals: Mapped[list["Proposal"]] = relationship(back_populates="invitation", cascade="all, delete-orphan")


class Restaurant(Base):
    __tablename__ = "restaurants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"))
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    cuisine: Mapped[str | None] = mapped_column(String(100))
    price: Mapped[str | None] = mapped_column(String(20))
    menu_url: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)


class Proposal(Base):
    __tablename__ = "proposals"
    __table_args__ = (UniqueConstraint("invitation_id", "version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    created_by_role: Mapped[Role] = mapped_column(Enum(Role))
    meeting_date: Mapped[date | None] = mapped_column(Date)
    meeting_time: Mapped[time | None] = mapped_column(Time)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    mood: Mapped[str | None] = mapped_column(String(80))
    budget: Mapped[str | None] = mapped_column(String(40))
    meal_type: Mapped[str | None] = mapped_column(String(60))
    food_choice: Mapped[str | None] = mapped_column(String(160))
    food_choices: Mapped[list[str] | None] = mapped_column(JSON)
    cooking_by_host: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_food_request: Mapped[str | None] = mapped_column(Text)
    host_cooking_request: Mapped[str | None] = mapped_column(Text)
    bring_request: Mapped[str | None] = mapped_column(String(160))
    custom_bring_request: Mapped[str | None] = mapped_column(Text)
    restaurant_id: Mapped[str | None] = mapped_column(ForeignKey("restaurants.id"))
    meetup_name: Mapped[str | None] = mapped_column(String(200))
    meetup_address: Mapped[str | None] = mapped_column(Text)
    meetup_latitude: Mapped[float | None] = mapped_column(Float)
    meetup_longitude: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    revive_cancelled_plan: Mapped[bool] = mapped_column(Boolean, default=False)
    revive_plan_details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now().astimezone())
    invitation: Mapped[Invitation] = relationship(back_populates="proposals")
    activities: Mapped[list["ProposalActivity"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan", order_by="ProposalActivity.position"
    )
    restaurant: Mapped[Restaurant | None] = relationship()


class ProposalActivity(Base):
    __tablename__ = "proposal_activities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    proposal_id: Mapped[str] = mapped_column(ForeignKey("proposals.id"))
    position: Mapped[int] = mapped_column(Integer)
    activity_type: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(200))
    location_name: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    start_time: Mapped[time | None] = mapped_column(Time)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    external_url: Mapped[str | None] = mapped_column(Text)
    proposal: Mapped[Proposal] = relationship(back_populates="activities")


class Acceptance(Base):
    __tablename__ = "acceptances"
    __table_args__ = (UniqueConstraint("invitation_id", "role", "proposal_version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"), index=True)
    role: Mapped[Role] = mapped_column(Enum(Role))
    proposal_version: Mapped[int] = mapped_column(Integer)
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now().astimezone())


class EmailEvent(Base):
    __tablename__ = "email_events"
    __table_args__ = (UniqueConstraint("invitation_id", "idempotency_key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"))
    event_type: Mapped[str] = mapped_column(String(80))
    idempotency_key: Mapped[str] = mapped_column(String(160))
    recipient: Mapped[str] = mapped_column(String(320))
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now().astimezone())


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"), index=True)
    role: Mapped[Role] = mapped_column(Enum(Role))
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(Text)
    auth: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now().astimezone())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MeetMemory(Base):
    __tablename__ = "meet_memories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"))
    created_by_role: Mapped[Role] = mapped_column(Enum(Role))
    reaction: Mapped[str] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(Text)
    favorite_moment: Mapped[str | None] = mapped_column(Text)
    mood: Mapped[str | None] = mapped_column(String(80))
    do_again: Mapped[bool | None] = mapped_column(Boolean)


class Idea(Base):
    __tablename__ = "ideas"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    invitation_id: Mapped[str] = mapped_column(ForeignKey("invitations.id"))
    created_by_role: Mapped[Role] = mapped_column(Enum(Role))
    title: Mapped[str] = mapped_column(String(200))
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
