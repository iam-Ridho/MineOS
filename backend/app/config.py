from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # LLM API KEY
    gemini_api_key: str
    groq_api_key: str
    openrouter_api_key: str
    
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    
    # Redis
    redis_url: str = "redis://localhost:6379"

    # Firebase FCM
    firebase_credentials_path: str = "firebase-credentials.json"
    
    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    jwt_secret: str
    cors_origins: List[str] = ["https://localhost:3000"]

    # LangGraph
    agent_timeout_seconds: int = 10
    agent_cycle_seconds: int = 5

    class Config: 
        env_file = ".env"
        case_sensitive = False   

settings = Settings()    