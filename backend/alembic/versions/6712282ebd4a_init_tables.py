"""compatibility placeholder for historical init_tables revision.

Revision ID: 6712282ebd4a
Revises: 28a79d0a9607
Create Date: 2026-04-13 22:14:49.954436

This revision originally existed on a divergent branch and is still
referenced by production databases. We keep the identifier so Alembic can
resolve historical version chains, but the migration itself is intentionally
no-op because the canonical schema evolution now flows through the main
branch revisions.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "6712282ebd4a"
down_revision: Union[str, Sequence[str], None] = "28a79d0a9607"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Preserve historical revision continuity without schema changes."""
    return None


def downgrade() -> None:
    """No-op downgrade for compatibility placeholder."""
    return None
