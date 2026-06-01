"""phone_e164 on users + phone_otps for SMS verification

Revision ID: 002
Revises: 001
Create Date: 2026-05-14

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_e164", sa.String(length=20), nullable=True))
    op.create_index("ix_users_phone_e164", "users", ["phone_e164"], unique=True)
    op.create_table(
        "phone_otps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("phone_e164", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("wrong_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("sender_ip", sa.String(length=45), nullable=True),
    )
    op.create_index("ix_phone_otps_user_phone_active", "phone_otps", ["user_id", "phone_e164"])
    op.create_index("ix_phone_otps_phone_created", "phone_otps", ["phone_e164", "created_at"])
    op.create_index("ix_phone_otps_ip_created", "phone_otps", ["sender_ip", "created_at"])


def downgrade() -> None:
    op.drop_table("phone_otps")
    op.drop_index("ix_users_phone_e164", table_name="users")
    op.drop_column("users", "phone_e164")
