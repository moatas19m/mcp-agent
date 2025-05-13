from sqlalchemy import Column, Integer, String
from app.db.base_class import Base

class AgentFile(Base):
    __tablename__ = "agent_files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # File name with timestamp
    mcp_agents = Column(String, nullable=False)  # Comma-separated list of MCP agent IDs

    def __init__(self, name: str, mcp_agents: str):
        self.name = name
        self.mcp_agents = mcp_agents

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "mcp_agents": self.mcp_agents
        }
