import os
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} 환경변수가 설정되지 않았습니다.")
    return value


DATABASE_URL = require_env("DATABASE_URL")
JWT_SECRET_KEY = require_env("JWT_SECRET_KEY")
GROQ_API_KEY = require_env("GROQ_API_KEY")
KAKAO_REST_API_KEY = require_env("KAKAO_REST_API_KEY")
KAKAO_REDIRECT_URI = require_env("KAKAO_REDIRECT_URI")
KAKAO_CLIENT_SECRET = os.getenv("KAKAO_CLIENT_SECRET")

# 로그 설정
logger = logging.getLogger("logicup")
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_handler.setFormatter(logging.Formatter(
    "%(asctime)s | %(levelname)-8s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
))
logger.addHandler(console_handler)

# Groq 클라이언트
groq_client = Groq(api_key=GROQ_API_KEY)

LLM_MODEL = "openai/gpt-oss-120b"
