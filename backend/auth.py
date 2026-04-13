import os
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from config import logger

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()


def hash_password(password: str) -> str:
    logger.info("비밀번호 해시 생성")
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        result = bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
        logger.info(f"비밀번호 검증 | 결과={result}")
        return result
    except ValueError:
        logger.warning("비밀번호 검증 실패 | 해시 형식 오류")
        return False


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    logger.info(f"JWT 토큰 생성 | user_id={data.get('user_id')} | 만료={expire}")
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            logger.warning("토큰 검증 실패 | user_id 없음")
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
        logger.info(f"토큰 검증 성공 | user_id={user_id}")
        return user_id
    except JWTError:
        logger.warning("토큰 검증 실패 | 만료 또는 위조된 토큰")
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
