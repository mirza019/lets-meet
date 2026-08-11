from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.email.service import EmailService
from app.models import Acceptance, EmailEvent, Invitation, MeetMemory, Proposal, ProposalActivity, Restaurant, Role
from app.schemas.api import InvitationCreate, MemoryInput, ProposalInput
from app.security.tokens import create_token, decrypt_token, encrypt_token, hash_token
from app.services.push import PushService


class InvitationService:
    def __init__(self, db: Session, settings: Settings):
        self.db, self.settings = db, settings
        self.email = EmailService(settings)
        self.push = PushService(db, settings)

    def create(self, data: InvitationCreate):
        guest_token, host_token = create_token(), create_token()
        invitation = Invitation(
            **data.model_dump(),
            guest_token_hash=hash_token(guest_token),
            host_token_hash=hash_token(host_token),
            guest_token_ciphertext=encrypt_token(guest_token, self.settings.app_secret),
            host_token_ciphertext=encrypt_token(host_token, self.settings.app_secret),
            expires_at=datetime.now(timezone.utc) + timedelta(days=self.settings.token_expiry_days),
        )
        self.db.add(invitation)
        self.db.commit()
        guest_url = f"{self.settings.frontend_base_url}/invite/{guest_token}"
        host_url = f"{self.settings.frontend_base_url}/respond/{host_token}"
        self._send_once(
            invitation,
            "invitation_sent",
            "invitation",
            data.guest_email,
            lambda: self.email.invitation(data.guest_email, data.guest_name, data.host_name, guest_url, data.personal_note),
        )
        return invitation, guest_url, host_url

    def authorize(self, token: str, role: Role, with_proposals: bool = False) -> Invitation:
        field = Invitation.guest_token_hash if role == Role.guest else Invitation.host_token_hash
        query = select(Invitation).where(field == hash_token(token))
        if with_proposals:
            query = query.options(
                selectinload(Invitation.proposals).selectinload(Proposal.activities),
                selectinload(Invitation.proposals).selectinload(Proposal.restaurant),
            )
        invitation = self.db.scalar(query)
        if not invitation:
            raise HTTPException(404, "This link doesn't seem to belong to any active appointment.")
        expires = invitation.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(410, "Looks like this invitation got lost in time. 🥲")
        return invitation

    def current(self, invitation: Invitation) -> Proposal | None:
        return next((p for p in invitation.proposals if p.version == invitation.current_version), None)

    def propose(self, invitation: Invitation, role: Role, data: ProposalInput, token: str) -> Proposal:
        if invitation.status == "declined":
            raise HTTPException(409, "This invitation was declined.")
        version = invitation.current_version + 1
        restaurant = None
        if data.restaurant:
            restaurant = Restaurant(invitation_id=invitation.id, **data.restaurant.model_dump())
            self.db.add(restaurant)
            self.db.flush()
        values = data.model_dump(exclude={"activities", "restaurant"})
        proposal = Proposal(
            invitation_id=invitation.id,
            version=version,
            created_by_role=role,
            restaurant_id=restaurant.id if restaurant else None,
            **values,
        )
        proposal.activities = [ProposalActivity(position=i, **activity.model_dump()) for i, activity in enumerate(data.activities)]
        invitation.current_version = version
        invitation.status = "pending_host" if role == Role.guest else "pending_guest"
        self.db.add(proposal)
        self.db.flush()
        self.db.add(Acceptance(invitation_id=invitation.id, role=role, proposal_version=version))
        self.db.commit()
        self.db.refresh(proposal)
        if role == Role.guest and invitation.host_email:
            host_token = decrypt_token(invitation.host_token_ciphertext, self.settings.app_secret)
            url = f"{self.settings.frontend_base_url}/respond/{host_token}"
            self._send_once(
                invitation,
                "proposal_submitted",
                f"proposal:{version}",
                invitation.host_email,
                lambda: self.email.proposal(invitation.host_email or "", invitation.host_name, invitation.guest_name, url, version > 1),
            )
        if role == Role.guest:
            host_token = decrypt_token(invitation.host_token_ciphertext, self.settings.app_secret)
            guest_display = invitation.guest_nickname or invitation.guest_name
            self.push.notify(
                invitation,
                Role.host,
                "👀 New appointment proposal",
                f"{guest_display} sent a plan for your approval.",
                f"{self.settings.frontend_base_url}/respond/{host_token}",
            )
        elif role == Role.host:
            guest_token = decrypt_token(invitation.guest_token_ciphertext, self.settings.app_secret)
            url = f"{self.settings.frontend_base_url}/invite/{guest_token}"
            self._send_once(
                invitation,
                "counterproposal_sent",
                f"proposal:{version}",
                invitation.guest_email,
                lambda: self.email.proposal(invitation.guest_email, invitation.guest_name, invitation.host_name, url, True),
            )
            host_display = invitation.host_nickname or invitation.host_name
            self.push.notify(
                invitation,
                Role.guest,
                "Plan update received ✨",
                f"{host_display} adjusted the plan. Bold move—take a look.",
                url,
            )
        return proposal

    def accept(self, invitation: Invitation, role: Role, token: str):
        if invitation.current_version < 1:
            raise HTTPException(409, "There is no proposal to accept yet.")
        version = invitation.current_version
        existing = self.db.scalar(
            select(Acceptance).where(
                Acceptance.invitation_id == invitation.id, Acceptance.role == role, Acceptance.proposal_version == version
            )
        )
        if not existing:
            self.db.add(Acceptance(invitation_id=invitation.id, role=role, proposal_version=version))
            self.db.flush()
        roles = set(
            self.db.scalars(
                select(Acceptance.role).where(Acceptance.invitation_id == invitation.id, Acceptance.proposal_version == version)
            ).all()
        )
        confirmed = roles == {Role.guest, Role.host}
        if confirmed:
            invitation.status, invitation.confirmed_version = "confirmed", version
            invitation.confirmed_at = datetime.now(timezone.utc)
        else:
            invitation.status = "pending_host" if role == Role.guest else "pending_guest"
        self.db.commit()
        if confirmed:
            proposal = self.db.scalar(
                select(Proposal)
                .where(Proposal.invitation_id == invitation.id, Proposal.version == version)
                .options(selectinload(Proposal.activities), selectinload(Proposal.restaurant))
            )
            if proposal is None:
                raise HTTPException(409, "The confirmed plan could not be loaded.")
            plan_record = self._plan_record(proposal, invitation.host_name)
            host_token = decrypt_token(invitation.host_token_ciphertext, self.settings.app_secret)
            guest_token = decrypt_token(invitation.guest_token_ciphertext, self.settings.app_secret)
            host_display = invitation.host_nickname or invitation.host_name
            guest_display = invitation.guest_nickname or invitation.guest_name
            if invitation.host_email:
                self._send_once(
                    invitation,
                    "confirmation_sent",
                    f"confirm:{version}:host",
                    invitation.host_email,
                    lambda: self.email.confirmation(
                        invitation.host_email or "",
                        invitation.host_name,
                        invitation.guest_name,
                        f"{self.settings.frontend_base_url}/respond/{host_token}/confirmed",
                        plan_record,
                    ),
                )
            self._send_once(
                invitation,
                "confirmation_sent",
                f"confirm:{version}:guest",
                invitation.guest_email,
                lambda: self.email.confirmation(
                    invitation.guest_email,
                    invitation.guest_name,
                    invitation.host_name,
                    f"{self.settings.frontend_base_url}/invite/{guest_token}/confirmed",
                    plan_record,
                ),
            )
            self.push.notify(
                invitation,
                Role.host,
                "💫 Appointment confirmed",
                f"{host_display} × {guest_display}: the meetup is locked in.",
                f"{self.settings.frontend_base_url}/respond/{host_token}/confirmed",
            )
            self.push.notify(
                invitation,
                Role.guest,
                "💫 Appointment confirmed",
                f"{guest_display} × {host_display}: the meetup is locked in.",
                f"{self.settings.frontend_base_url}/invite/{guest_token}/confirmed",
            )
        else:
            other_role = Role.host if role == Role.guest else Role.guest
            accepted_by = (
                invitation.guest_nickname or invitation.guest_name
                if role == Role.guest
                else invitation.host_nickname or invitation.host_name
            )
            other_token = decrypt_token(
                invitation.host_token_ciphertext if other_role == Role.host else invitation.guest_token_ciphertext,
                self.settings.app_secret,
            )
            path = "respond" if other_role == Role.host else "invite"
            self.push.notify(
                invitation,
                other_role,
                "Plan update 👀",
                f"{accepted_by} accepted the plan.",
                f"{self.settings.frontend_base_url}/{path}/{other_token}",
            )
        return confirmed

    @staticmethod
    def _plan_record(proposal: Proposal, host_name: str) -> str:
        meeting_time = proposal.meeting_time.strftime("%H:%M") if proposal.meeting_time else "TBD"
        lines = [
            f"Date: {proposal.meeting_date or 'TBD'}",
            f"Time: {meeting_time}",
            f"Duration: {f'{proposal.duration_minutes} minutes' if proposal.duration_minutes else 'Open-ended'}",
        ]
        if proposal.meal_type:
            food_choices = proposal.food_choices or ([proposal.food_choice] if proposal.food_choice else [])
            food = ", ".join(
                f"Other: {proposal.custom_food_request}" if choice == "Other" and proposal.custom_food_request else choice
                for choice in food_choices
            ) or (proposal.restaurant.name if proposal.restaurant else None)
            lines.append(f"Food: {proposal.meal_type}{f' — {food}' if food else ''}")
            if proposal.cooking_by_host:
                request = f" — {proposal.host_cooking_request}" if proposal.host_cooking_request else ""
                lines.append(f"Premium add-on: {host_name} cooks for you{request}")
        if proposal.meetup_name or proposal.meetup_address:
            location = " — ".join(value for value in [proposal.meetup_name, proposal.meetup_address] if value)
            lines.append(f"Location: {location}")
        if proposal.activities:
            lines.append("Activities: " + " → ".join(activity.title for activity in proposal.activities))
        if proposal.bring_request:
            lines.append(f"Bring: {proposal.custom_bring_request or proposal.bring_request}")
        if proposal.mood:
            lines.append(f"Mood: {proposal.mood}")
        if proposal.revive_cancelled_plan:
            lines.append(f"Revived plan: {proposal.revive_plan_details or 'Details to be decided'}")
        if proposal.notes:
            lines.append(f"Notes: {proposal.notes}")
        return "\n".join(lines)

    def decline(self, invitation: Invitation):
        invitation.status = "declined"
        self.db.commit()

    def memory(self, invitation: Invitation, role: Role, data: MemoryInput):
        item = MeetMemory(invitation_id=invitation.id, created_by_role=role, **data.model_dump())
        self.db.add(item)
        self.db.commit()
        return item

    def _send_once(self, invitation: Invitation, event: str, key: str, recipient: str, send) -> None:
        if self.db.scalar(select(EmailEvent).where(EmailEvent.invitation_id == invitation.id, EmailEvent.idempotency_key == key)):
            return
        send()
        self.db.add(EmailEvent(invitation_id=invitation.id, event_type=event, idempotency_key=key, recipient=recipient))
        self.db.commit()
