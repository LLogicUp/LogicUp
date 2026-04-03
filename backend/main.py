from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os
import json
import logging
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv

load_dotenv()

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

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class HintRequest(BaseModel):
    problem: str = ""        # 문제 설명
    code: str                # 사용자 코드
    expected_output: str = "" # 정답 예시 출력
    error_log: str = ""      # 에러 메시지
    hint_level: int = 1      # 1: 오류 위치, 2: 관련 개념, 3: 의사코드


@app.get("/health")
def health_check():
    return {"status": "서버 정상 작동 중"}

@app.post("/hint")
def get_hint(request: HintRequest):
    level_instructions = {
        1: (
            "코드에서 오류가 발생한 위치의 줄과 오류 원인만 알려주세요. "
            "절대 수정 방법이나 정답 코드는 제시하지 마세요. "
            "형식: 줄 번호 + 틀린 부분 강조, 에러 타입 명시. "
            "C언어가 아닌 코드가 들어오면 'C언어 코드만 지원합니다. C언어로 다시 입력해주세요.' 를 출력하세요."
        ),
        2: (
            "오류와 관련된 개념을 설명해주세요. "
            "코드 예시나 정답은 제시하지 마세요. "
            "형식: 개념명, 설명, 예시"
        ),
        3: (
            "문제를 해결할 수 있는 의사코드(pseudocode)를 알고리즘 교재 스타일로 작성해주세요. "
            "형식: 첫 줄에 'Alg.: 알고리즘이름(입력)', "
            "대입은 ← 기호 사용, "
            "반복은 'for i ← 1 to n / do', "
            "조건은 'if 조건 then / else', "
            "들여쓰기로 계층 표현. "
            "실제 동작하는 코드는 절대 작성하지 마세요."
        ),
    }

    prompt = (
        f"[문제]\n{request.problem}\n\n"
        f"[정답 예시 출력]\n{request.expected_output}\n\n"
        f"[사용자 코드]\n{request.code}\n\n"
        f"[에러 로그]\n{request.error_log}\n\n"
        f"[힌트 단계 {request.hint_level}] {level_instructions[request.hint_level]}"
    )

    logger.info(f"힌트 요청 | level={request.hint_level} | code_length={len(request.code)} | error_log={request.error_log[:100]}")

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "당신은 프로그래밍 학습 보조 튜터입니다. "
                    "학생이 스스로 문제를 해결할 수 있도록 단계적 힌트만 제공합니다. "
                    "1. 완성 코드 제공 금지 "
                    "2. 함수 전체 코드 제시 금지 "
                    "3. 복사·붙여넣기 가능한 코드 조각 제공 금지 "
                    "4. 정답 코드와 동일한 구조의 코드 출력 금지 "
                    "5. 단계 건너뛰기 금지 "
                    "6. 이전 단계로 되돌리기 금지 "
                    "7. 오류가 나지 않는다면 오류가 없다고 알려주세요."
                    "8. 반드시 다음 JSON 형식으로만 응답하세요: "
                    '{{"explanation": "현재 단계에 맞는 상세 설명", "pseudocode": "3단계에서만 채우고 1·2단계에서는 반드시 빈 문자열"}}'
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    result = json.loads(response.choices[0].message.content)
    logger.info(f"힌트 응답 완료 | level={request.hint_level}")
    return {
        "explanation": result.get("explanation", ""),
        "pseudocode": result.get("pseudocode", ""),
    }


