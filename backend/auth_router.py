import os
import re
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from config import logger
from database import get_db
from db_models import User
from auth import hash_password, verify_password, create_token
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")

auth_router = APIRouter()


class RegisterRequest(BaseModel):
    userid: str
    password: str

    @field_validator("userid")
    @classmethod
    def userid_alphanumeric(cls, v):
        if not (2 <= len(v) <= 20):
            raise ValueError("아이디는 2~20자로 입력해주세요.")
        if not re.match(r"^[a-zA-Z0-9]+$", v):
            raise ValueError("아이디는 영어와 숫자만 사용할 수 있습니다.")
        return v

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v):
        if not (8 <= len(v) <= 16):
            raise ValueError("비밀번호는 8~16자로 입력해주세요.")
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

    token = create_token({"user_id": user.id, "userid": user.userid})

    logger.info(f"로그인 성공 | userid={request.userid}")
    return {"access_token": token}


class KakaoLoginRequest(BaseModel):
    code: str  # 프론트에서 받은 카카오 인가 코드


@auth_router.post("/auth/kakao")
def kakao_login(request: KakaoLoginRequest, db: Session = Depends(get_db)):
    logger.info("카카오 로그인 요청")

    # 1. 인가 코드로 카카오 액세스 토큰 요청
    token_data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": request.code,
    }
    if KAKAO_CLIENT_SECRET:
        token_data["client_secret"] = KAKAO_CLIENT_SECRET

    logger.info(f"카카오 토큰 요청 | client_id={KAKAO_REST_API_KEY} | redirect_uri={KAKAO_REDIRECT_URI} | code_len={len(request.code)}")
    token_res = requests.post("https://kauth.kakao.com/oauth/token", data=token_data)

    if token_res.status_code != 200:
        logger.warning(f"카카오 토큰 요청 실패 | status={token_res.status_code} | body={token_res.text}")
        raise HTTPException(status_code=401, detail=f"카카오 인증에 실패했습니다: {token_res.json().get('error_code', '')} {token_res.json().get('error_description', '')}")

    kakao_token = token_res.json().get("access_token")

    # 2. 액세스 토큰으로 카카오 사용자 정보 요청
    user_res = requests.get("https://kapi.kakao.com/v2/user/me", headers={
        "Authorization": f"Bearer {kakao_token}"
    })

    if user_res.status_code != 200:
        logger.warning(f"카카오 사용자 정보 요청 실패 | status={user_res.status_code}")
        raise HTTPException(status_code=401, detail="카카오 사용자 정보를 가져올 수 없습니다")

    kakao_id = str(user_res.json().get("id"))
    logger.info(f"카카오 사용자 확인 | kakao_id={kakao_id}")

    # 3. DB에서 카카오 유저 조회, 없으면 자동 회원가입
    user = db.query(User).filter(User.kakao_id == kakao_id).first()
    if not user:
        user = User(kakao_id=kakao_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"카카오 자동 회원가입 | kakao_id={kakao_id} | user_id={user.id}")

    # 4. JWT 토큰 발급
    token = create_token({"user_id": user.id, "kakao_id": kakao_id})

    logger.info(f"카카오 로그인 성공 | kakao_id={kakao_id} | user_id={user.id}")
    return {"access_token": token}
