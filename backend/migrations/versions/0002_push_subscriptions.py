"""add web push subscriptions"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade():
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invitation_id", sa.String(36), sa.ForeignKey("invitations.id"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_push_subscriptions_invitation_id", "push_subscriptions", ["invitation_id"])


def downgrade():
    op.drop_index("ix_push_subscriptions_invitation_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
