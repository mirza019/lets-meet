"""Create a demo invitation and print private links. Run from backend/."""
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.schemas.api import InvitationCreate
from app.services.invitations import InvitationService

with SessionLocal() as db:
    _, guest, host = InvitationService(db, get_settings()).create(InvitationCreate(host_name="Alex", host_email="alex@example.com", guest_name="Jamie", guest_email="jamie@example.com", guest_nickname="Guest"))
    print("Guest:", guest)
    print("Host:", host)
