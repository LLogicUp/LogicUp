import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

logger = logging.getLogger("logicup")

# Always load backend/.env before resolving DATABASE_URL so local runs
# behave consistently even when the shell has no exported env vars.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL 환경변수가 설정되지 않았습니다")
    raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다.")

logger.info(f"DB 연결 | {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,        # 5분마다 커넥션 갱신 (Neon 슬립 주기와 맞춤)
    pool_timeout=30,         # 커넥션 획득 대기 최대 30초
    connect_args={"connect_timeout": 10},  # DB 연결 자체 타임아웃 10초
)
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
