from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Acceptance, Invitation, PushSubscription
from app.security.tokens import hash_token


def test_invitation_survives_email_delivery_failure(client, monkeypatch):
    from app.email.service import ConsoleEmailProvider

    def fail(*args, **kwargs):
        raise RuntimeError("temporary SMTP outage")

    monkeypatch.setattr(ConsoleEmailProvider, "send", fail)
    response = client.post(
        "/api/invitations",
        json={
            "host_name": "Alex",
            "host_email": "alex@example.com",
            "guest_name": "Jamie",
            "guest_email": "jamie@example.com",
        },
    )
    assert response.status_code == 201
    assert response.json()["email_delivery"] == "failed"
    guest_token = response.json()["guest_url"].rsplit("/", 1)[-1]
    assert client.get(f"/api/invitations/guest/{guest_token}").status_code == 200


def test_retried_creation_returns_same_links_and_sends_once(client, monkeypatch):
    from app.email.service import ConsoleEmailProvider

    deliveries = 0

    def count(*args, **kwargs):
        nonlocal deliveries
        deliveries += 1

    monkeypatch.setattr(ConsoleEmailProvider, "send", count)
    payload = {
        "client_request_id": "browser-request-123",
        "host_name": "Alex",
        "host_email": "alex@example.com",
        "guest_name": "Jamie",
        "guest_email": "jamie@example.com",
    }
    first = client.post("/api/invitations", json=payload)
    second = client.post("/api/invitations", json=payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["guest_url"] == second.json()["guest_url"]
    assert first.json()["host_url"] == second.json()["host_url"]
    assert deliveries == 1
    with SessionLocal() as db:
        assert len(db.scalars(select(Invitation)).all()) == 1


def test_retried_queued_creation_schedules_email_once(client, monkeypatch):
    from app.email.service import EmailService

    deliveries = 0

    def count(*args, **kwargs):
        nonlocal deliveries
        deliveries += 1

    def configure_queued(self, settings):
        self.settings = settings
        self.delivery_mode = "sent"

    monkeypatch.setattr(EmailService, "__init__", configure_queued)
    monkeypatch.setattr(EmailService, "invitation", count)
    payload = {
        "client_request_id": "queued-browser-request-123",
        "host_name": "Alex",
        "host_email": "alex@example.com",
        "guest_name": "Jamie",
        "guest_email": "jamie@example.com",
    }
    first = client.post("/api/invitations", json=payload)
    second = client.post("/api/invitations", json=payload)
    assert first.status_code == second.status_code == 201
    assert first.json()["email_delivery"] == second.json()["email_delivery"] == "queued"
    assert first.json()["guest_url"] == second.json()["guest_url"]
    assert deliveries == 1


def test_invitation_hides_tokens_and_roles_are_separate(client, invite):
    guest, host = invite
    assert client.get(f"/api/invitations/guest/{guest}").status_code == 200
    assert client.get(f"/api/invitations/host/{guest}").status_code == 404
    assert client.get(f"/api/invitations/guest/{host}").status_code == 404
    with SessionLocal() as db:
        item = db.scalar(select(Invitation))
        assert item.guest_token_hash == hash_token(guest)
        assert guest not in item.guest_token_hash


def test_proposal_versions_and_dual_acceptance(client, invite, plan):
    guest, host = invite
    one = client.post(f"/api/invitations/guest/{guest}/proposals", json=plan)
    assert one.status_code == 201 and one.json()["version"] == 1
    assert one.json()["food_choices"] == ["Biriyani", "Pizza", "Other"]
    assert one.json()["host_cooking_request"] == "Make the spicy noodles"
    assert one.json()["revive_cancelled_plan"] is True
    assert one.json()["revive_plan_details"] == "The picnic that rain rudely cancelled."
    host_accept = client.post(f"/api/invitations/host/{host}/accept").json()
    assert host_accept["confirmed"] is True
    changed = {**plan, "meeting_time": "20:00"}
    two = client.post(f"/api/invitations/host/{host}/proposals", json=changed)
    assert two.status_code == 201 and two.json()["version"] == 2
    state = client.get(f"/api/invitations/host/{host}").json()
    assert state["status"] == "pending_guest"
    assert state["confirmed_version"] == 1
    assert client.post(f"/api/invitations/guest/{guest}/accept").json()["confirmed"] is True


def test_different_versions_never_confirm(client, invite, plan):
    guest, host = invite
    client.post(f"/api/invitations/guest/{guest}/proposals", json=plan)
    client.post(f"/api/invitations/host/{host}/proposals", json={**plan, "meeting_time": "20:00"})
    with SessionLocal() as db:
        assert len(db.scalars(select(Acceptance).where(Acceptance.proposal_version == 1)).all()) == 1
    state = client.get(f"/api/invitations/guest/{guest}").json()
    assert state["status"] == "pending_guest"


def test_decline_and_expiry(client, invite):
    guest, _ = invite
    assert client.post(f"/api/invitations/guest/{guest}/decline").status_code == 204
    assert client.get(f"/api/invitations/guest/{guest}").json()["status"] == "declined"
    with SessionLocal() as db:
        item = db.scalar(select(Invitation))
        item.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        db.commit()
    assert client.get(f"/api/invitations/guest/{guest}").status_code == 410


def test_push_subscription_is_bound_to_private_role(client, invite):
    guest, _ = invite
    payload = {
        "endpoint": "https://push.example.test/subscription/123",
        "p256dh": "a-valid-looking-browser-public-key",
        "auth": "auth-secret",
    }
    response = client.post(f"/api/invitations/guest/{guest}/push-subscriptions", json=payload)
    assert response.status_code == 201
    assert client.post(f"/api/invitations/host/{guest}/push-subscriptions", json=payload).status_code == 404
    with SessionLocal() as db:
        subscription = db.scalar(select(PushSubscription))
        assert subscription is not None
        assert subscription.role.value == "guest"
        assert subscription.endpoint == payload["endpoint"]
