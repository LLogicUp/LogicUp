"""merge heads

Revision ID: c67db66c0119
Revises: 28a79d0a9607, 6712282ebd4a
Create Date: 2026-04-13 22:22:44.063475

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c67db66c0119'
down_revision: Union[str, Sequence[str], None] = ('28a79d0a9607', '6712282ebd4a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
