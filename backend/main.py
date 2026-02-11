from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class HintRequest(BaseModel):
    code: str
    error_log: str = ""
    hint_level: int = 1  # 1: 오류 위치, 2: 관련 개념, 3: 의사코드

@app.get("/health")
def health_check():
    return {"status": "서버 정상 작동 중"}

@app.post("/hint")
def get_hint(request: HintRequest):
    level_instructions = {
        1: "코드에서 오류가 발생한 위치만 알려주세요. 절대 수정 방법이나 정답 코드는 제시하지 마세요.",
        2: "오류와 관련된 개념을 설명해주세요. 코드 예시나 정답은 제시하지 마세요.",
        3: "문제를 해결할 수 있는 의사코드(pseudocode)를 제공해주세요. 실제 코드는 작성하지 마세요.",
    }

    prompt = (
        f"[코드]\n{request.code}\n\n"
        f"[에러 로그]\n{request.error_log}\n\n"
        f"[힌트 단계 {request.hint_level}] {level_instructions[request.hint_level]}"
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "당신은 프로그래밍 학습 보조 튜터입니다. "
                    "학생이 스스로 문제를 해결할 수 있도록 단계적 힌트만 제공합니다. "
                    "절대 정답 코드를 직접 작성해주지 않습니다."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )
    return {"hint": response.choices[0].message.content, "hint_level": request.hint_level}
