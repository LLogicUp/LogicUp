"""add_user_id_to_submissions

Revision ID: 28a79d0a9607
Revises: 406187fdc69b
Create Date: 2026-04-13 20:58:30.872825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '28a79d0a9607'
down_revision: Union[str, Sequence[str], None] = '406187fdc69b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('submissions')]

    if 'user_id' not in columns:
        op.add_column(
            'submissions',
            sa.Column('user_id', sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            'fk_submissions_user_id',
            'submissions', 'users',
            ['user_id'], ['id'],
            ondelete='CASCADE',
        )
        op.create_index('ix_submissions_user_id', 'submissions', ['user_id'])
        # 기존 데이터 백필 후 NOT NULL 제약 추가
        # (기존 rows가 없거나 모두 백필된 경우에만 안전)
        op.execute("DELETE FROM submissions WHERE user_id IS NULL")
        op.alter_column('submissions', 'user_id', nullable=False)


def downgrade() -> None:
    bind = op.get_bind()
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('submissions')]

    if 'user_id' in columns:
        op.drop_index('ix_submissions_user_id', table_name='submissions')
        op.drop_constraint('fk_submissions_user_id', 'submissions', type_='foreignkey')
        op.drop_column('submissions', 'user_id')
