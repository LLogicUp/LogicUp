from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
import re
from sqlalchemy.orm import Session
from config import logger
from database import get_db
from db_models import User
from auth import hash_password, verify_password, create_token

auth_router = APIRouter()


class RegisterRequest(BaseModel):
    userid: str = Field(min_length=2, max_length=20)
    password: str = Field(min_length=8, max_length=16)

    @field_validator("userid") #아이디 생성 규칙
    @classmethod
    def userid_alphanumeric(cls, v):
        if not re.match(r"^[a-zA-Z0-9]+$", v):
            raise ValueError("아이디는 영어와 숫자만 사용할 수 있습니다.")
        return v

    @field_validator("password") #비밀번호 생성 규칙
    @classmethod
    def password_complexity(cls, v):
        if not re.match(r"^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{}|;:\'\",./<>?~`]+$", v):
            raise ValueError("비밀번호는 영어, 숫자, 특수문자만 사용할 수 있습니다.")
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("비밀번호에 영어가 최소 1자 포함되어야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자가 최소 1자 포함되어야 합니다.")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:\'\",./<>?~`]", v):
            raise ValueError("비밀번호에 특수문자가 최소 1자 포함되어야 합니다.")
        return v
    


class LoginRequest(BaseModel):
    userid: str
    password: str


@auth_router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    logger.info(f"회원가입 요청 | userid={request.userid}")
    existing = db.query(User).filter(User.userid == request.userid).first()
    if existing:
        logger.warning(f"회원가입 실패 | 중복 userid={request.userid}")
        raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다")

    user = User(
        userid=request.userid,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()

    logger.info(f"회원가입 완료 | userid={request.userid}")
    return {"message": "가입 완료"}


@auth_router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"로그인 요청 | userid={request.userid}")
    user = db.query(User).filter(User.userid == request.userid).first()
    if not user or not verify_password(request.password, user.password_hash):
        logger.warning(f"로그인 실패 | userid={request.userid}")
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다")

    token = create_token({"user_id": user.id})

    logger.info(f"로그인 성공 | userid={request.userid}")
    return {"access_token": token}
