"""add_title_language_to_submissions

Revision ID: e3f7a9b2c1d4
Revises: dce6ba8425ae
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3f7a9b2c1d4'
down_revision: Union[str, Sequence[str], None] = 'dce6ba8425ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('submissions', sa.Column('title', sa.String(length=200), nullable=False, server_default=''))
    op.add_column('submissions', sa.Column('language', sa.String(length=20), nullable=False, server_default=''))
    op.drop_column('hint_categories', 'language')


def downgrade() -> None:
    op.add_column('hint_categories', sa.Column('language', sa.String(length=20), nullable=True))
    op.drop_column('submissions', 'language')
    op.drop_column('submissions', 'title')
