import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

logger = logging.getLogger("logicup")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다")
    raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다.")

logger.info(f"DB 연결 | {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
