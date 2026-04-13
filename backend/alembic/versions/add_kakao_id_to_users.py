"""add_kakao_id_to_users

Revision ID: add_kakao_id
Revises: 8da9a87a3543
Create Date: 2026-04-13 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = 'add_kakao_id'
down_revision: Union[str, Sequence[str], None] = '8da9a87a3543'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('users')}
    indexes = {idx['name'] for idx in inspector.get_indexes('users')}

    if 'kakao_id' not in columns:
        op.add_column('users', sa.Column('kakao_id', sa.String(length=50), nullable=True))

    if op.f('ix_users_kakao_id') not in indexes:
        op.create_index(op.f('ix_users_kakao_id'), 'users', ['kakao_id'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = {col['name'] for col in inspector.get_columns('users')}
    indexes = {idx['name'] for idx in inspector.get_indexes('users')}

    if op.f('ix_users_kakao_id') in indexes:
        op.drop_index(op.f('ix_users_kakao_id'), table_name='users')
    if 'kakao_id' in columns:
        op.drop_column('users', 'kakao_id')
