import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import router
from auth_router import auth_router
from quiz_router import quiz_router
from oj_router import oj_router


def get_cors_allow_origins() -> list[str]:
    value = os.getenv("CORS_ALLOW_ORIGINS")
    if not value:
        return ["http://localhost:3000"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allow_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(quiz_router)
app.include_router(oj_router)
