import logging

from sqlalchemy.orm import Session
from app.models.mcp_agent import MCPAgent
from app.models.agent_file import AgentFile  # Import the new AgentFile model
from app.models.schemas import MCPAgentCreate, MCPAgentUpdate, MCPAgentBase, MCPAgentInDB
from typing import List, Optional
import subprocess
import os
import json
from pathlib import Path
from datetime import datetime


class MCPAgentService:
    def __init__(self, db: Session):
        self.db = db
        self.config_dir = Path("configs")
        self.config_dir.mkdir(exist_ok=True)

    def create_agents(self, agents: List[MCPAgentBase]):
        created_agents = []
        all_agents_config = {"mcpServers": {}}

        for agent in agents:
            try:
                # Check if agent with the same name already exists
                existing_agent = self.db.query(MCPAgent).filter(MCPAgent.name == agent.name).first()
                if existing_agent:
                    raise ValueError(f"Agent with name '{agent.name}' already exists")

                # Create new agent instance
                db_agent = MCPAgent(**agent.dict())
                self.db.add(db_agent)
                self.db.commit()
                self.db.refresh(db_agent)

                # Add agent configuration to the all_agents_config dict
                all_agents_config["mcpServers"][db_agent.name] = {
                    "command": db_agent.command,
                    "args": db_agent.args,
                    "env": db_agent.env
                }

                created_agents.append(db_agent)
            except Exception as e:
                self.db.rollback()
                raise ValueError(f"Failed to create agent: {str(e)}")

        # Generate filename based on the timestamp after all agents have been added
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        config_filename = f"mcp_agents_{timestamp}.json"
        config_file_path = self.config_dir / config_filename

        # Save all agents' config to the file
        self._save_all_agents_config(all_agents_config, config_file_path)

        # Save the new agent file entry in the database (but do it only once)
        agent_ids = [str(agent.id) for agent in created_agents]
        agent_file = AgentFile(name=config_filename, mcp_agents=",".join(agent_ids))
        self.db.add(agent_file)
        self.db.commit()
        self.db.refresh(agent_file)

        # Commit changes to the database to update `file_id` and `file_name`
        self.db.commit()

        # Return only the created agents, no agent file details
        return created_agents

    def _save_all_agents_config(self, all_agents_config: dict, config_file_path: Path) -> None:
        # Save the agent configurations into the file
        with open(config_file_path, "w") as file:
            json.dump(all_agents_config, file, indent=2)

    def get_agent(self, agent_id: int) -> Optional[MCPAgent]:
        return self.db.query(AgentFile).filter(AgentFile.id == agent_id).first()

    def get_agents(self, skip: int = 0, limit: int = 100) -> List[MCPAgentInDB]:
        # Fetch all MCP agents and include the associated agent file
        agents = self.db.query(MCPAgent).offset(skip).limit(limit).all()

        # Retrieve associated file names for each agent
        for agent in agents:
            agent_file = self.db.query(AgentFile).filter(AgentFile.mcp_agents.like(f"%{agent.id}%")).first()
            if agent_file:
                agent.file_name = agent_file.name
                agent.file_id = agent_file.id
            else:
                agent.file_name = None
                agent.file_id = 0# No associated file

        return agents

    def update_agent(self, agent_id: int, agent: MCPAgentUpdate) -> Optional[MCPAgent]:
        db_agent = self.get_agent(agent_id)
        if not db_agent:
            return None

        update_data = agent.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_agent, field, value)

        self.db.commit()
        self.db.refresh(db_agent)
        self._save_agent_config(db_agent)
        return db_agent

    def delete_agent_file(self, agent_file_id: int) -> bool:
        """
        Delete agents associated with a given agent_file_id and the agent file itself.

        - **agent_file_id**: The ID of the agent file to delete.

        Returns True if deletion was successful, or False if not found.
        """
        # Fetch the agent file from the database
        agent_file = self.db.query(AgentFile).filter(AgentFile.id == agent_file_id).first()
        if not agent_file:
            return False  # Return False if the agent file is not found

        # Extract the agent ids from the mcp_agents column (comma-separated values)
        agent_ids = [int(agent_id) for agent_id in agent_file.mcp_agents.split(',')]

        # Delete each agent associated with this agent file
        for agent_id in agent_ids:
            db_agent = self.db.query(MCPAgent).filter(MCPAgent.id == agent_id).first()
            if db_agent:
                # Delete the agent from the database
                self.db.delete(db_agent)
                self.db.commit()
                self._delete_agent_config(db_agent)

        # Delete the agent file configuration file from the filesystem
        config_file_path = self.config_dir / agent_file.name
        if config_file_path.exists():
            config_file_path.unlink()  # Delete the file

        # Delete the agent file entry from the database
        self.db.delete(agent_file)
        self.db.commit()

        return True

    def _save_agent_config(self, agent: MCPAgent) -> None:
        config = {
            "mcpServers": {
                agent.name: {
                    "command": agent.command,
                    "args": agent.args,
                    "env": agent.env
                }
            }
        }

        config_path = self.config_dir / f"{agent.name}_mcp.json"
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

    def _delete_agent_config(self, agent: MCPAgent) -> None:
        config_path = self.config_dir / f"{agent.name}_mcp.json"
        if config_path.exists():
            config_path.unlink()

    def start_agent(self, agent_id: int) -> bool:
        agent = self.get_agent(agent_id)
        if not agent or not agent.is_active:
            return False

        try:
            process = subprocess.Popen(
                [agent.command] + agent.args,
                env={**os.environ, **agent.env},
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            return True
        except Exception as e:
            print(f"Error starting agent {agent.name}: {e}")
            return False

    def get_agent_file_for_agent(self, agent_file_id: int) -> Optional[str]:
        """
        Retrieve the file name for a given agent file ID.

        This will return the name of the agent file corresponding to the provided `agent_file_id`.
        """
        # Query the AgentFile table using the primary key (agent_file_id)
        agent_file = self.db.query(AgentFile).filter(AgentFile.id == agent_file_id).first()

        # If an agent file is found, return the file name
        if agent_file:
            return agent_file.name

        # If no agent file is found, return None
        return None