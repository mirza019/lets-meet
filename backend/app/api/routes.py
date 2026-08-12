import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal, get_db
from app.models import Invitation, Role
from app.schemas.api import (
    AcceptOut,
    InvitationCreate,
    InvitationCreated,
    InvitationOut,
    LateInput,
    MemoryInput,
    ProposalInput,
    ProposalOut,
    PushConfigOut,
    PushSubscriptionInput,
)
from app.services.invitations import InvitationService
from app.services.push import PushService

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
hits: dict[str, deque[datetime]] = defaultdict(deque)
hit_lock = Lock()


def service(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
    return InvitationService(db, settings)


def limited(request: Request, settings: Settings = Depends(get_settings)):
    key = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)
    with hit_lock:
        while hits[key] and hits[key][0] < now - timedelta(minutes=1):
            hits[key].popleft()
        if len(hits[key]) >= settings.rate_limit_per_minute:
            raise HTTPException(429, "Easy there — try again in a minute. 🙂")
        hits[key].append(now)


@router.get("/push/config", response_model=PushConfigOut)
def push_config(settings: Settings = Depends(get_settings)):
    return PushConfigOut(
        enabled=bool(settings.vapid_public_key and settings.vapid_private_key),
        public_key=settings.vapid_public_key,
    )


@router.post("/invitations/{role}/{token}/push-subscriptions", status_code=201)
def subscribe_push(
    role: Role,
    token: str,
    data: PushSubscriptionInput,
    svc: InvitationService = Depends(service),
):
    invitation = svc.authorize(token, role)
    subscription = PushService(svc.db, svc.settings).subscribe(invitation, role, data.endpoint, data.p256dh, data.auth)
    return {"id": subscription.id, "enabled": True}


@router.delete("/invitations/{role}/{token}/push-subscriptions", status_code=204)
def unsubscribe_push(
    role: Role,
    token: str,
    data: PushSubscriptionInput,
    svc: InvitationService = Depends(service),
):
    invitation = svc.authorize(token, role)
    PushService(svc.db, svc.settings).unsubscribe(invitation, role, data.endpoint)


def deliver_initial_email(invitation_id: str, data: InvitationCreate, guest_url: str, settings: Settings) -> None:
    """Deliver after the HTTP response so a slow mail server cannot break meetup creation."""
    with SessionLocal() as db:
        invitation = db.get(Invitation, invitation_id)
        if invitation is None:
            logger.error("Invitation disappeared before email delivery id=%s", invitation_id)
            return
        InvitationService(db, settings).send_initial_invitation(invitation, data, guest_url)


@router.post("/invitations", response_model=InvitationCreated, status_code=201, dependencies=[Depends(limited)])
def create_invitation(
    data: InvitationCreate,
    background_tasks: BackgroundTasks,
    svc: InvitationService = Depends(service),
):
    invitation, guest_url, host_url, previous_delivery = svc.create(data, send_email=False)
    delivery = "console" if svc.email.delivery_mode == "console" else "queued"
    if delivery == "queued":
        if previous_delivery is None:
            background_tasks.add_task(deliver_initial_email, invitation.id, data, guest_url, svc.settings)
    else:
        # Console mode is instant and useful in local development/test output.
        delivery = "console" if svc.send_initial_invitation(invitation, data, guest_url) else "failed"
    return InvitationCreated(
        message=(
            f"Invitation queued for {invitation.guest_name} 💌"
            if delivery == "queued"
            else "Invitation created. Copy and share the private guest link."
        ),
        guest_url=guest_url,
        host_url=host_url,
        email_delivery=delivery,
    )


def invitation_view(token: str, role: Role, svc: InvitationService):
    invitation = svc.authorize(token, role, with_proposals=True)
    return InvitationOut(
        **{
            k: getattr(invitation, k)
            for k in (
                "host_name",
                "host_nickname",
                "guest_name",
                "guest_nickname",
                "personal_note",
                "status",
                "current_version",
                "confirmed_version",
                "expires_at",
            )
        },
        current_proposal=svc.current(invitation),
    )


@router.get("/invitations/guest/{token}", response_model=InvitationOut)
def get_guest(token: str, svc: InvitationService = Depends(service)):
    return invitation_view(token, Role.guest, svc)


@router.get("/invitations/host/{token}", response_model=InvitationOut)
def get_host(token: str, svc: InvitationService = Depends(service)):
    return invitation_view(token, Role.host, svc)


@router.post("/invitations/guest/{token}/decline", status_code=204)
def decline(token: str, svc: InvitationService = Depends(service)):
    svc.decline(svc.authorize(token, Role.guest))


def submit(token: str, role: Role, data: ProposalInput, svc: InvitationService):
    return svc.propose(svc.authorize(token, role), role, data, token)


@router.post("/invitations/guest/{token}/proposals", response_model=ProposalOut, status_code=201, dependencies=[Depends(limited)])
def guest_proposal(token: str, data: ProposalInput, svc: InvitationService = Depends(service)):
    return submit(token, Role.guest, data, svc)


@router.post("/invitations/host/{token}/proposals", response_model=ProposalOut, status_code=201, dependencies=[Depends(limited)])
def host_proposal(token: str, data: ProposalInput, svc: InvitationService = Depends(service)):
    return submit(token, Role.host, data, svc)


@router.get("/invitations/guest/{token}/current-proposal", response_model=ProposalOut)
def guest_current(token: str, svc: InvitationService = Depends(service)):
    item = svc.current(svc.authorize(token, Role.guest, True))
    if not item:
        raise HTTPException(404, "No proposal yet.")
    return item


@router.get("/invitations/host/{token}/current-proposal", response_model=ProposalOut)
def host_current(token: str, svc: InvitationService = Depends(service)):
    item = svc.current(svc.authorize(token, Role.host, True))
    if not item:
        raise HTTPException(404, "No proposal yet.")
    return item


@router.post("/invitations/{role}/{token}/accept", response_model=AcceptOut)
def accept(role: Role, token: str, svc: InvitationService = Depends(service)):
    invitation = svc.authorize(token, role)
    confirmed = svc.accept(invitation, role, token)
    return AcceptOut(status="confirmed" if confirmed else invitation.status, version=invitation.current_version, confirmed=confirmed)


@router.get("/invitations/{role}/{token}/history", response_model=list[ProposalOut])
def history(role: Role, token: str, svc: InvitationService = Depends(service)):
    invitation = svc.authorize(token, role, True)
    return sorted(invitation.proposals, key=lambda p: p.version)


@router.post("/invitations/{role}/{token}/running-late")
def running_late(role: Role, token: str, data: LateInput, svc: InvitationService = Depends(service)):
    invitation = svc.authorize(token, role)
    if invitation.status != "confirmed":
        raise HTTPException(409, "Confirm the plan first.")
    return {"message": f"Running {data.minutes} minutes late — status saved.", "minutes": data.minutes}


@router.post("/invitations/{role}/{token}/memory", status_code=201)
def memory(role: Role, token: str, data: MemoryInput, svc: InvitationService = Depends(service)):
    return {"id": svc.memory(svc.authorize(token, role), role, data).id}
