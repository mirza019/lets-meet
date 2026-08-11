import os

os.environ.update(
    DATABASE_URL="sqlite:///./test_lets_meet.db", EMAIL_PROVIDER="console", RATE_LIMIT_PER_MINUTE="1000", APP_SECRET="test-secret"
)
import pytest
from fastapi.testclient import TestClient

from app.db.session import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def invite(client):
    response = client.post(
        "/api/invitations",
        json={
            "host_name": "Alex",
            "host_email": "alex@example.com",
            "guest_name": "Jamie",
            "guest_email": "jamie@example.com",
            "guest_nickname": "Guest",
        },
    )
    assert response.status_code == 201
    data = response.json()
    return data["guest_url"].rsplit("/", 1)[-1], data["host_url"].rsplit("/", 1)[-1]


@pytest.fixture
def plan():
    return {
        "meeting_date": "2027-03-20",
        "meeting_time": "19:00",
        "duration_minutes": 180,
        "meal_type": "Dinner",
        "food_choice": "Biriyani",
        "food_choices": ["Biriyani", "Pizza", "Other"],
        "custom_food_request": "Spicy noodles",
        "cooking_by_host": True,
        "host_cooking_request": "Make the spicy noodles",
        "meetup_name": "Erlangen Hbf",
        "revive_cancelled_plan": True,
        "revive_plan_details": "The picnic that rain rudely cancelled.",
        "activities": [{"activity_type": "walk", "title": "Night Walk"}],
    }
