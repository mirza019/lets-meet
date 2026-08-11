"""add cancelled-plan revival details"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade():
    with op.batch_alter_table("proposals") as batch:
        batch.add_column(
            sa.Column(
                "revive_cancelled_plan",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.add_column(sa.Column("revive_plan_details", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("proposals") as batch:
        batch.drop_column("revive_plan_details")
        batch.drop_column("revive_cancelled_plan")
