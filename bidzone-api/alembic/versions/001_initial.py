"""initial schema (MySQL 8)

Revision ID: 001
Revises:
Create Date: 2026-05-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="bidder"),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("seller_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("trust_score", sa.Numeric(5, 4), nullable=False, server_default="0.5000"),
        sa.Column("unpaid_win_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_sales_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_table(
        "auctions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seller_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("starting_price_cents", sa.BigInteger(), nullable=False),
        sa.Column("current_high_cents", sa.BigInteger(), nullable=False),
        sa.Column("bid_increment_cents", sa.BigInteger(), nullable=False, server_default="100"),
        sa.Column("reserve_cents", sa.BigInteger(), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("anti_sniping_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("settlement_status", sa.String(32), nullable=False, server_default="none"),
        sa.Column("checkout_winner_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("checkout_deadline_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checkout_round", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payment_window_minutes", sa.Integer(), nullable=False, server_default="2880"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_auctions_seller_id", "auctions", ["seller_id"])
    op.create_index("ix_auctions_status_ends_at", "auctions", ["status", "ends_at"])
    op.create_index("ix_auctions_settlement_status", "auctions", ["settlement_status"])
    op.create_table(
        "bids",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("auction_id", sa.Uuid(), sa.ForeignKey("auctions.id"), nullable=False),
        sa.Column("bidder_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("idempotency_key", sa.String(80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("auction_id", "bidder_id", "idempotency_key", name="uq_bid_idempotency"),
    )
    op.create_index("ix_bids_auction_created", "bids", ["auction_id", "created_at"])
    op.create_table(
        "auction_participants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("auction_id", sa.Uuid(), sa.ForeignKey("auctions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("auction_id", "user_id", name="uq_participant_auction_user"),
    )
    op.create_index("ix_participant_auction", "auction_participants", ["auction_id"])
    op.create_table(
        "ratings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("rater_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ratee_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("auction_id", sa.Uuid(), sa.ForeignKey("auctions.id"), nullable=True),
        sa.Column("stars", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_ratings_ratee", "ratings", ["ratee_id"])


def downgrade() -> None:
    op.drop_table("ratings")
    op.drop_table("auction_participants")
    op.drop_table("bids")
    op.drop_table("auctions")
    op.drop_table("users")
