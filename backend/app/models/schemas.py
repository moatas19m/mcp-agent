from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class MCPAgentBase(BaseModel):
    name: str = Field(
        ...,
        description="Name of the agent",
        example="slack-agent-1"
    )
    agent_type: str = Field(
        ...,
        description="Type of the agent",
        example="slack"
    )
    command: str = Field(
        ...,
        description="Command to run the agent",
        example="python"
    )
    args: list[str] = Field(
        default_factory=list,
        description="Command line arguments",
        example=["app.py"]
    )
    env: Dict[str, str] = Field(
        default_factory=dict,
        description="Environment variables",
        example={"API_KEY": "your-api-key"}
    )
    is_active: bool = Field(
        default=True,
        description="Whether the agent is active",
        example=True
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "slack-agent-1",
                "agent_type": "slack",
                "command": "python",
                "args": ["app.py"],
                "env": {"API_KEY": "your-api-key"},
                "is_active": True
            }
        }

class MCPAgentCreate(MCPAgentBase):
    pass

class MCPAgentUpdate(BaseModel):
    name: Optional[str] = Field(
        None,
        description="Name of the agent",
        example="slack-agent-1"
    )
    agent_type: Optional[str] = Field(
        None,
        description="Type of the agent",
        example="slack"
    )
    command: Optional[str] = Field(
        None,
        description="Command to run the agent",
        example="python"
    )
    args: Optional[list[str]] = Field(
        None,
        description="Command line arguments",
        example=["app.py"]
    )
    env: Optional[Dict[str, str]] = Field(
        None,
        description="Environment variables",
        example={"API_KEY": "your-api-key"}
    )
    is_active: Optional[bool] = Field(
        None,
        description="Whether the agent is active",
        example=True
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "slack-agent-1",
                "is_active": False
            }
        }

class MCPAgentInDB(MCPAgentBase):
    id: int = Field(
        ...,
        description="Unique identifier for the agent",
        example=1
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the agent was created"
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the agent was last updated"
    )
    file_name: Optional[str] = Field(
        None,
        description="The name of the configuration file associated with the agent",
        example="mcp_agents_20230512_210100.json"
    )
    file_id: int = Field(
        ...,
        description="Config file identifier",
        example=1
    )

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else datetime.utcnow().isoformat()
        }
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "slack-agent-1",
                "agent_type": "slack",
                "command": "python",
                "args": ["app.py"],
                "env": {"API_KEY": "your-api-key"},
                "is_active": True,
                "created_at": "2024-02-20T10:00:00Z",
                "updated_at": "2024-02-20T10:10:00Z",
                "file_name": "mcp_agents_20230512_210100.json"
            }
        }

class ChatMessage(BaseModel):
    agent_id: int = Field(
        ...,
        description="ID of the agent",
        example=1
    )
    message: str = Field(
        ...,
        description="Message content",
        example="Hello, how can I help you?"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of the message"
    )

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

        json_schema_extra = {
            "example": {
                "agent_id": 1,
                "message": "Hello, how can I help you?",
                "timestamp": "2024-02-20T10:00:00Z"
            }
        }

class CreateAgentsResponse(BaseModel):
    agents: List[MCPAgentInDB]  # List of created agents
    config_file: dict  # The config file information with name and mcp_agents

    class Config:
        json_schema_extra = {
            "example": {
                "agents": [
                    {
                        "id": 1,
                        "name": "slack-agent-1",
                        "agent_type": "slack",
                        "command": "python",
                        "args": ["app.py"],
                        "env": {"API_KEY": "your-api-key"},
                        "is_active": True,
                        "created_at": "2024-02-20T10:00:00Z",
                        "updated_at": "2024-02-20T10:10:00Z"
                    }
                ],
                "config_file": {
                    "id": 1,
                    "name": "mcp_agents_20230512_210100.json",
                    "mcp_agents": "1,2"
                }
            }
        }
