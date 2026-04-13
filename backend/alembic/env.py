import os
import sys
from logging.config import fileConfig
<<<<<<< HEAD

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from database import Base
import db_models  # noqa: F401 — ORM 모델 등록

config = context.config
=======
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import Base
import db_models

config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))
>>>>>>> back/로그인기능구현

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

<<<<<<< HEAD
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다.")
config.set_main_option("sqlalchemy.url", database_url)

=======
>>>>>>> back/로그인기능구현
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
<<<<<<< HEAD

=======
>>>>>>> back/로그인기능구현
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
<<<<<<< HEAD

=======
>>>>>>> back/로그인기능구현
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
<<<<<<< HEAD

=======
>>>>>>> back/로그인기능구현
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
