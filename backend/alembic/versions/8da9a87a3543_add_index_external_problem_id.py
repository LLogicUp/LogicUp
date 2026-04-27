"""add_index_external_problem_id

Revision ID: 8da9a87a3543
Revises: c67db66c0119
Create Date: 2026-04-13 21:41:34.186603

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = '8da9a87a3543'
down_revision: Union[str, Sequence[str], None] = 'c67db66c0119'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    indexes = {idx['name'] for idx in inspector.get_indexes('submissions')}

    if 'ix_submissions_external_problem_id' not in indexes:
        op.create_index('ix_submissions_external_problem_id', 'submissions', ['external_problem_id'])
    if 'ix_submissions_user_id_source' not in indexes:
        op.create_index('ix_submissions_user_id_source', 'submissions', ['user_id', 'source'])


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    indexes = {idx['name'] for idx in inspector.get_indexes('submissions')}

    if 'ix_submissions_user_id_source' in indexes:
        op.drop_index('ix_submissions_user_id_source', table_name='submissions')
    if 'ix_submissions_external_problem_id' in indexes:
        op.drop_index('ix_submissions_external_problem_id', table_name='submissions')
