import json
import logging
from datetime import datetime, timezone

from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import Invitation, PushSubscription, Role

logger = logging.getLogger(__name__)


class PushService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self.settings.vapid_public_key and self.settings.vapid_private_key)

    def subscribe(self, invitation: Invitation, role: Role, endpoint: str, p256dh: str, auth: str) -> PushSubscription:
        subscription = self.db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint))
        if subscription:
            subscription.invitation_id = invitation.id
            subscription.role = role
            subscription.p256dh = p256dh
            subscription.auth = auth
        else:
            subscription = PushSubscription(
                invitation_id=invitation.id,
                role=role,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
            )
            self.db.add(subscription)
        self.db.commit()
        return subscription

    def unsubscribe(self, invitation: Invitation, role: Role, endpoint: str) -> None:
        self.db.execute(
            delete(PushSubscription).where(
                PushSubscription.invitation_id == invitation.id,
                PushSubscription.role == role,
                PushSubscription.endpoint == endpoint,
            )
        )
        self.db.commit()

    def notify(self, invitation: Invitation, role: Role, title: str, body: str, url: str) -> int:
        if not self.enabled:
            return 0
        subscriptions = self.db.scalars(
            select(PushSubscription).where(
                PushSubscription.invitation_id == invitation.id,
                PushSubscription.role == role,
            )
        ).all()
        sent = 0
        payload = json.dumps({"title": title, "body": body, "url": url, "tag": f"lets-meet-{invitation.id}"})
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": subscription.endpoint,
                        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                    },
                    data=payload,
                    vapid_private_key=self.settings.vapid_private_key,
                    vapid_claims={"sub": self.settings.vapid_subject},
                    ttl=3600,
                    timeout=10,
                )
                subscription.last_used_at = datetime.now(timezone.utc)
                sent += 1
            except WebPushException as exc:
                status = exc.response.status_code if exc.response is not None else None
                if status in {404, 410}:
                    self.db.delete(subscription)
                logger.warning("Push delivery failed status=%s", status)
        self.db.commit()
        return sent
