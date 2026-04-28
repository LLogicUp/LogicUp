"""allow null userid and password_hash for kakao users

Revision ID: allow_null_userid_password
Revises: add_kakao_id
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'allow_null_userid_password'
down_revision: Union[str, Sequence[str], None] = 'add_kakao_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('users', 'userid', existing_type=sa.String(length=20), nullable=True)
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'userid', existing_type=sa.String(length=20), nullable=False)
    op.alter_column('users', 'password_hash', existing_type=sa.String(length=255), nullable=False)
