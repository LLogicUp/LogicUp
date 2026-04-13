"""add_index_external_problem_id

Revision ID: 8da9a87a3543
Revises: 28a79d0a9607
Create Date: 2026-04-13 21:41:34.186603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8da9a87a3543'
down_revision: Union[str, Sequence[str], None] = '28a79d0a9607'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_submissions_external_problem_id', 'submissions', ['external_problem_id'])
    op.create_index('ix_submissions_user_id_source', 'submissions', ['user_id', 'source'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_submissions_user_id_source', table_name='submissions')
    op.drop_index('ix_submissions_external_problem_id', table_name='submissions')
