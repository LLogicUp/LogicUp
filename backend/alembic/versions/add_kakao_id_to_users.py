"""add_kakao_id_to_users

Revision ID: add_kakao_id
Revises: 8da9a87a3543, c67db66c0119
Create Date: 2026-04-13 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_kakao_id'
down_revision: Union[str, Sequence[str], None] = ('8da9a87a3543', 'c67db66c0119')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('kakao_id', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_users_kakao_id'), 'users', ['kakao_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_kakao_id'), table_name='users')
    op.drop_column('users', 'kakao_id')
