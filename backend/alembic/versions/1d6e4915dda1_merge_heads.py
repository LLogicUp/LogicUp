"""merge_heads

Revision ID: 1d6e4915dda1
Revises: 4f20a03cba06, allow_null_userid_password
Create Date: 2026-04-28 11:44:36.795297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d6e4915dda1'
down_revision: Union[str, Sequence[str], None] = ('4f20a03cba06', 'allow_null_userid_password')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
