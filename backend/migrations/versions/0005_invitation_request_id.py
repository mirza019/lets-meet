"""add idempotent invitation request IDs"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"


def upgrade():
    with op.batch_alter_table("invitations") as batch:
        batch.add_column(sa.Column("client_request_id", sa.String(64), nullable=True))
        batch.create_index("ix_invitations_client_request_id", ["client_request_id"], unique=True)


def downgrade():
    with op.batch_alter_table("invitations") as batch:
        batch.drop_index("ix_invitations_client_request_id")
        batch.drop_column("client_request_id")
