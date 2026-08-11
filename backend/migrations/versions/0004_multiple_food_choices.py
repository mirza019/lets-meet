"""add multiple food choices and host cooking request"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"


def upgrade():
    with op.batch_alter_table("proposals") as batch:
        batch.add_column(sa.Column("food_choices", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("host_cooking_request", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("proposals") as batch:
        batch.drop_column("host_cooking_request")
        batch.drop_column("food_choices")
