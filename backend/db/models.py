from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Enum
from sqlalchemy.sql import func
from db.database import Base
import enum

class RoleEnum(str, enum.Enum):
    user = "user"
    assistant = "assistant"

class Conversation(Base):
    __tablename__ = "conversations"

    id         = Column(String, primary_key=True, index=True)
    user_id    = Column(String, nullable=True)
    title      = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"

    id            = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, index=True)
    role          = Column(Enum(RoleEnum))
    content       = Column(Text)
    image_url     = Column(String, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

class MarketPriceDB(Base):
    __tablename__ = "market_prices"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    culture    = Column(String, index=True)
    emoji      = Column(String)
    prix_kg    = Column(Float)
    unite      = Column(String)
    marche     = Column(String)
    tendance   = Column(String)   # "up" | "down" | "stable"
    variation  = Column(Float, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
