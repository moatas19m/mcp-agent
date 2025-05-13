from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base
from datetime import datetime

class MCPAgent(Base):
    __tablename__ = "mcp_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    agent_type = Column(String, nullable=False)  # e.g., "slack", "browser", etc.
    command = Column(String, nullable=False)
    args = Column(JSON, nullable=False)
    env = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.created_at:
            self.created_at = datetime.utcnow()
        if not self.updated_at:
            self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "agent_type": self.agent_type,
            "command": self.command,
            "args": self.args,
            "env": self.env,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else datetime.utcnow().isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else datetime.utcnow().isoformat()
        } 