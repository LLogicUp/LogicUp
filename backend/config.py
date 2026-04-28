import os
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

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
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
