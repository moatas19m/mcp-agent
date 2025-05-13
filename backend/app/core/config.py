from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "MCP Agent Manager"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./mcp_agents.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    # WebSocket
    WS_PING_INTERVAL: int = 20
    WS_PING_TIMEOUT: int = 20
    
    class Config:
        case_sensitive = True

settings = Settings() 