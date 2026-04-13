from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True) #고유번호 key
    userid = Column(String(20), unique=True, nullable=False, index=True) #user 아이디
    password_hash = Column(String(255), nullable=False) #user password 해싱
    created_at = Column(DateTime, server_default=func.now())
