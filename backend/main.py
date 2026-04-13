from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import router
from auth_router import auth_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
