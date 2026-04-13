from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import router
from auth_router import auth_router
from database import engine, Base

# DB 테이블 자동 생성
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
