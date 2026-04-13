import os
import logging
from logging.handlers import TimedRotatingFileHandler
from groq import Groq
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# 로그 설정
os.makedirs("logs", exist_ok=True)
logger = logging.getLogger("logicup")
logger.setLevel(logging.INFO)

file_handler = TimedRotatingFileHandler(
    "logs/api.log", when="midnight", backupCount=1, encoding="utf-8"
)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
))
logger.addHandler(file_handler)

# Groq 클라이언트
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
