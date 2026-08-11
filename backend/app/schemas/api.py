from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InvitationCreate(BaseModel):
    host_name: str = Field(min_length=1, max_length=100)
    host_email: EmailStr | None = None
    host_nickname: str | None = Field(None, max_length=100)
    guest_name: str = Field(min_length=1, max_length=100)
    guest_email: EmailStr
    guest_nickname: str | None = Field(None, max_length=100)
    personal_note: str | None = Field(None, max_length=1000)


class InvitationCreated(BaseModel):
    message: str
    guest_url: str
    host_url: str
    email_delivery: str


class ActivityInput(BaseModel):
    activity_type: str
    title: str
    location_name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_time: time | None = None
    duration_minutes: int | None = Field(None, ge=0, le=1440)
    notes: str | None = None
    external_url: str | None = None


class RestaurantInput(BaseModel):
    name: str
    address: str | None = None
    cuisine: str | None = None
    price: str | None = None
    menu_url: str | None = None
    website_url: str | None = None
    notes: str | None = None


class ProposalInput(BaseModel):
    meeting_date: date | None = None
    meeting_time: time | None = None
    duration_minutes: int | None = Field(None, ge=15, le=2880)
    mood: str | None = None
    budget: str | None = None
    meal_type: str | None = None
    food_choice: str | None = None
    food_choices: list[str] = []
    cooking_by_host: bool = False
    custom_food_request: str | None = None
    host_cooking_request: str | None = Field(None, max_length=1000)
    bring_request: str | None = None
    custom_bring_request: str | None = None
    meetup_name: str | None = None
    meetup_address: str | None = None
    meetup_latitude: float | None = Field(None, ge=-90, le=90)
    meetup_longitude: float | None = Field(None, ge=-180, le=180)
    notes: str | None = Field(None, max_length=3000)
    revive_cancelled_plan: bool = False
    revive_plan_details: str | None = Field(None, max_length=1500)
    restaurant: RestaurantInput | None = None
    activities: list[ActivityInput] = []


class ActivityOut(ActivityInput):
    id: str
    position: int
    model_config = ConfigDict(from_attributes=True)


class RestaurantOut(RestaurantInput):
    id: str
    model_config = ConfigDict(from_attributes=True)


class ProposalOut(BaseModel):
    id: str
    version: int
    created_by_role: str
    meeting_date: date | None
    meeting_time: time | None
    duration_minutes: int | None
    mood: str | None
    budget: str | None
    meal_type: str | None
    food_choice: str | None
    food_choices: list[str] | None
    cooking_by_host: bool
    custom_food_request: str | None
    host_cooking_request: str | None
    bring_request: str | None
    custom_bring_request: str | None
    meetup_name: str | None
    meetup_address: str | None
    meetup_latitude: float | None
    meetup_longitude: float | None
    notes: str | None
    revive_cancelled_plan: bool
    revive_plan_details: str | None
    created_at: datetime
    restaurant: RestaurantOut | None
    activities: list[ActivityOut]
    model_config = ConfigDict(from_attributes=True)


class InvitationOut(BaseModel):
    host_name: str
    host_nickname: str | None
    guest_name: str
    guest_nickname: str | None
    personal_note: str | None
    status: str
    current_version: int
    confirmed_version: int | None
    expires_at: datetime
    current_proposal: ProposalOut | None = None


class AcceptOut(BaseModel):
    status: str
    version: int
    confirmed: bool


class LateInput(BaseModel):
    minutes: int = Field(ge=1, le=240)


class MemoryInput(BaseModel):
    reaction: str
    note: str | None = None
    favorite_moment: str | None = None
    mood: str | None = None
    do_again: bool | None = None


class PushSubscriptionInput(BaseModel):
    endpoint: str = Field(min_length=10, max_length=4000)
    p256dh: str = Field(min_length=10, max_length=1000)
    auth: str = Field(min_length=5, max_length=500)


class PushConfigOut(BaseModel):
    enabled: bool
    public_key: str
