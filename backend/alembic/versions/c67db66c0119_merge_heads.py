"""compatibility placeholder for historical merge_heads revision.

Revision ID: c67db66c0119
Revises: 6712282ebd4a
Create Date: 2026-04-13 22:22:44.063475

Production databases were stamped with this revision id, but the original
branch merge file was lost from the repository. Keeping this identifier
restores Alembic continuity without replaying conflicting branch history.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "c67db66c0119"
down_revision: Union[str, Sequence[str], None] = "6712282ebd4a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op compatibility revision."""
    return None


def downgrade() -> None:
    """No-op downgrade for compatibility revision."""
    return None
