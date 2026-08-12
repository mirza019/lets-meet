"""initial schema"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


role = sa.Enum("guest", "host", name="role")


def upgrade():
    # Keep this migration self-contained. Importing the live ORM metadata here
    # makes a fresh database include tables and columns owned by later revisions.
    op.create_table(
        "invitations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("host_name", sa.String(100), nullable=False),
        sa.Column("host_email", sa.String(320), nullable=True),
        sa.Column("host_nickname", sa.String(100), nullable=True),
        sa.Column("guest_name", sa.String(100), nullable=False),
        sa.Column("guest_email", sa.String(320), nullable=False),
        sa.Column("guest_nickname", sa.String(100), nullable=True),
        sa.Column("personal_note", sa.Text(), nullable=True),
        sa.Column("host_token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("guest_token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("host_token_ciphertext", sa.Text(), nullable=False),
        sa.Column("guest_token_ciphertext", sa.Text(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("current_version", sa.Integer(), nullable=False),
        sa.Column("confirmed_version", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_invitations_host_token_hash", "invitations", ["host_token_hash"])
    op.create_index("ix_invitations_guest_token_hash", "invitations", ["guest_token_hash"])

    op.create_table(
        "restaurants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("cuisine", sa.String(100), nullable=True),
        sa.Column("price", sa.String(20), nullable=True),
        sa.Column("menu_url", sa.Text(), nullable=True),
        sa.Column("website_url", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "proposals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_by_role", role, nullable=False),
        sa.Column("meeting_date", sa.Date(), nullable=True),
        sa.Column("meeting_time", sa.Time(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("mood", sa.String(80), nullable=True),
        sa.Column("budget", sa.String(40), nullable=True),
        sa.Column("meal_type", sa.String(60), nullable=True),
        sa.Column("food_choice", sa.String(160), nullable=True),
        sa.Column("cooking_by_host", sa.Boolean(), nullable=False),
        sa.Column("custom_food_request", sa.Text(), nullable=True),
        sa.Column("bring_request", sa.String(160), nullable=True),
        sa.Column("custom_bring_request", sa.Text(), nullable=True),
        sa.Column("restaurant_id", sa.String(36), sa.ForeignKey("restaurants.id"), nullable=True),
        sa.Column("meetup_name", sa.String(200), nullable=True),
        sa.Column("meetup_address", sa.Text(), nullable=True),
        sa.Column("meetup_latitude", sa.Float(), nullable=True),
        sa.Column("meetup_longitude", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("invitation_id", "version"),
    )
    op.create_index("ix_proposals_invitation_id", "proposals", ["invitation_id"])

    op.create_table(
        "proposal_activities",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("proposal_id", sa.String(36), sa.ForeignKey("proposals.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("activity_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("location_name", sa.String(200), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("external_url", sa.Text(), nullable=True),
    )

    op.create_table(
        "acceptances",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("role", role, nullable=False),
        sa.Column("proposal_version", sa.Integer(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("invitation_id", "role", "proposal_version"),
    )
    op.create_index("ix_acceptances_invitation_id", "acceptances", ["invitation_id"])

    op.create_table(
        "email_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("idempotency_key", sa.String(160), nullable=False),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("invitation_id", "idempotency_key"),
    )

    op.create_table(
        "meet_memories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("created_by_role", role, nullable=False),
        sa.Column("reaction", sa.String(100), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("favorite_moment", sa.Text(), nullable=True),
        sa.Column("mood", sa.String(80), nullable=True),
        sa.Column("do_again", sa.Boolean(), nullable=True),
    )

    op.create_table(
        "ideas",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("created_by_role", role, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("visibility", sa.String(20), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
    )


def downgrade():
    for table in (
        "ideas",
        "meet_memories",
        "email_events",
        "acceptances",
        "proposal_activities",
        "proposals",
        "restaurants",
        "invitations",
    ):
        op.drop_table(table)
