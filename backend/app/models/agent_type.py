from sqlalchemy import Column, Integer, String, JSON
from app.db.base_class import Base

class AgentType(Base):
    __tablename__ = "agent_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # Unique name for the agent type (e.g., "slack")
    command = Column(String, nullable=False)  # The command used to run the agent (e.g., "npx")
    args = Column(JSON, nullable=False)  # An array of strings (command arguments)
    env_keys = Column(JSON, nullable=False)  # An array of strings (environment variable keys)

    def __init__(self, name: str, command: str, args: list, env_keys: list):
        self.name = name
        self.command = command
        self.args = args
        self.env_keys = env_keys

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "command": self.command,
            "args": self.args,
            "env_keys": self.env_keys
        }
