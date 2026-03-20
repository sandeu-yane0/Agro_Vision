from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    groq_api_key: str = ""
    anthropic_api_key: str = ""
    llm_provider: str = "groq"
    database_url: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    port: int = 8000
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"          # ← ignore les variables inconnues

@lru_cache()
def get_settings() -> Settings:
    return Settings()