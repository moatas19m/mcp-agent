from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import List, Dict
from app.db.session import get_db
from app.services.mcp_agent_service import MCPAgentService
from app.models.schemas import MCPAgentCreate, MCPAgentUpdate, MCPAgentInDB, ChatMessage, MCPAgentBase
from app.core.config import settings
import json
import os
import logging
from dotenv import load_dotenv
from mcp_use import MCPAgent, MCPClient
from langchain_groq import ChatGroq
from app.core.logging_config import setup_logging
from app.models.agent_file import AgentFile

# Setup logging
loggers = setup_logging()
logger = loggers['mcp_agents']


router = APIRouter(
    prefix="",
    tags=["agents"],
    responses={
        404: {"description": "Agent not found"},
        400: {"description": "Bad request"},
        500: {"description": "Internal server error"}
    }
)

# Global registries for active agents and connections
active_agents: Dict[int, MCPAgent] = {}
active_connections: Dict[int, List[WebSocket]] = {}


@router.post("/",
             response_model=List[MCPAgentBase],
             status_code=status.HTTP_201_CREATED,
             summary="Create new MCP agents",
             description="Create multiple MCP agents with the specified configuration. The agents will be stored in the database and their configuration files will be generated automatically.",
             response_description="The list of created agents"
             )
def create_agents(agents: List[MCPAgentBase], db: Session = Depends(get_db)):
    """
    Create multiple MCP agents with the following information:

    - **name**: Unique name for the agent
    - **agent_type**: Type of the agent (e.g., slack, browser)
    - **command**: Command to run the agent
    - **args**: Command line arguments
    - **env**: Environment variables
    - **is_active**: Whether the agent is active

    Returns the created agents with their IDs and timestamps.
    """
    try:
        logger.debug(f"Creating new agents with data: {agents}")
        service = MCPAgentService(db)
        created_agents = service.create_agents(agents)  # Only returns created agents
        return [agent.to_dict() for agent in created_agents]  # Return only agent details
    except Exception as e:
        logger.error(f"Error creating agents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create agents: {str(e)}"
        )

@router.get("/",
            response_model=List[MCPAgentInDB],
            summary="List all MCP agents",
            description="Retrieve a list of all MCP agents with optional pagination.",
            response_description="List of MCP agents with file name"
            )
def get_agents(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    """
    Retrieve a list of all MCP agents with their configuration file names.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (for pagination)

    Returns a list of MCP agents.
    """
    service = MCPAgentService(db)
    agents = service.get_agents(skip=skip, limit=limit)
    return agents

@router.get("/{agent_id}", 
    response_model=MCPAgentInDB,
    summary="Get agent details",
    description="Retrieve detailed information about a specific MCP agent by its ID.",
    response_description="MCP agent details"
)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """
    Retrieve detailed information about a specific MCP agent.
    
    - **agent_id**: The ID of the agent to retrieve
    
    Returns the agent details if found, or a 404 error if not found.
    """
    service = MCPAgentService(db)
    agent = service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", 
    response_model=MCPAgentInDB,
    summary="Update agent",
    description="Update an existing MCP agent's configuration. Only the provided fields will be updated.",
    response_description="Updated MCP agent"
)
def update_agent(agent_id: int, agent: MCPAgentUpdate, db: Session = Depends(get_db)):
    """
    Update an existing MCP agent's configuration.
    
    - **agent_id**: The ID of the agent to update
    - **agent**: The updated agent configuration (only provided fields will be updated)
    
    Returns the updated agent if found, or a 404 error if not found.
    """
    service = MCPAgentService(db)
    updated_agent = service.update_agent(agent_id, agent)
    if not updated_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return updated_agent

@router.delete("/{agent_file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete agent file and associated agents",
    description="Delete an MCP agent file and all agents associated with it, along with their configuration files.",
    response_description="No content"
)
def delete_agent_file(agent_file_id: int, db: Session = Depends(get_db)):
    """
    Delete an MCP agent file and all agents associated with it.

    - **agent_file_id**: The ID of the agent file to delete

    Returns 204 No Content if successful, or a 404 error if the agent file is not found.
    """
    service = MCPAgentService(db)
    if not service.delete_agent_file(agent_file_id):
        raise HTTPException(status_code=404, detail="Agent file not found")
    return {"message": "Agent file and associated agents deleted successfully"}



@router.post("/{agent_file_id}/start",
             status_code=status.HTTP_200_OK,
             summary="Start agent",
             description="Start an MCP agent process using its configuration file.",
             response_description="Success message"
             )
async def start_agent(agent_file_id: int, db: Session = Depends(get_db)):
    """
    Start an MCP agent process using the configuration file.

    - **agent_id**: The ID of the agent to start

    Returns a success message if the agent starts successfully, or a 400 error if the start fails.
    """
    try:
        logger.debug(f"Starting agent {agent_file_id}")
        service = MCPAgentService(db)
        agent = service.get_agent(agent_file_id)
        if not agent:
            logger.error(f"Agent {agent_file_id} not found in database")
            raise HTTPException(status_code=404, detail="Agent not found")

        # Check if agent is already running
        if agent_file_id in active_agents:
            logger.debug(f"Agent {agent_file_id} is already running")
            return {"message": "Agent is already running"}

        # Get the associated agent file based on agent_id
        agent_file = service.get_agent_file_for_agent(agent_file_id)
        if not agent_file:
            raise HTTPException(
                status_code=404,
                detail="Agent file not found"
            )

        # Load environment variables
        load_dotenv()
        os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
        logger.debug("Environment variables loaded")

        # Get agent config file path based on the file name in the agent file
        config_file = os.path.join("configs", agent_file)
        logger.debug(f"Looking for config file at: {config_file}")

        if not os.path.exists(config_file):
            logger.error(f"Config file not found: {config_file}")
            raise HTTPException(
                status_code=400,
                detail=f"Config file not found: {config_file}. Please ensure the config file exists in the configs directory."
            )

        # Initialize MCP client and agent
        logger.debug("Initializing MCP client and agent")
        client = MCPClient.from_config_file(config_file)
        llm = ChatGroq(model="qwen-qwq-32b")

        mcp_agent = MCPAgent(
            client=client,
            llm=llm,
            max_steps=75,
            memory_enabled=True,
        )

        # Store the agent instance in the global registry
        active_agents[agent_file_id] = mcp_agent
        logger.debug(f"Agent {agent_file_id} started and stored in active_agents")
        logger.debug(f"Current active agents: {list(active_agents.keys())}")

        return {"message": "Agent started successfully"}

    except Exception as e:
        logger.error(f"Error starting agent: {str(e)}", exc_info=True)
        # Clean up if agent was partially started
        if agent_file_id in active_agents:
            del active_agents[agent_file_id]
        raise HTTPException(status_code=400, detail=f"Failed to start agent: {str(e)}")


@router.websocket("/ws/{agent_file_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    agent_file_id: int,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time chat with an MCP agent.
    
    - **agent_id**: The ID of the agent to chat with
    
    Establishes a WebSocket connection for real-time chat. Messages sent to this endpoint
    will be processed by the MCP agent and responses will be sent back.
    """
    try:
        logger.debug(f"WebSocket connection attempt for agent {agent_file_id}")
        logger.debug(f"Current active agents: {list(active_agents.keys())}")
        logger.debug(f"WebSocket headers: {websocket.headers}")
        logger.debug(f"WebSocket client: {websocket.client}")
        logger.debug(f"WebSocket path: {websocket.url.path}")
        logger.debug(f"WebSocket query params: {websocket.query_params}")
        
        # Verify agent exists in database first
        service = MCPAgentService(db)
        agent = service.get_agent(agent_file_id)
        if not agent:
            logger.error(f"Agent file with id {agent_file_id} not found in database")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Agent not found in database")
            return

        # Check if agent is running
        if agent_file_id not in active_agents:
            logger.error(f"Agent {agent_file_id} not found in active_agents")
            # Try to start the agent
            try:
                logger.debug(f"Attempting to start agent {agent_file_id}")
                await start_agent(agent_file_id, db)
                logger.debug(f"Successfully started agent {agent_file_id}")
            except Exception as e:
                logger.error(f"Failed to start agent {agent_file_id}: {str(e)}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Failed to start agent. Please try again.")
                return

        # Double check if agent is now running
        if agent_file_id not in active_agents:
            logger.error(f"Agent {agent_file_id} still not found in active_agents after start attempt")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Agent failed to start. Please try again.")
            return
        
        # Accept the connection
        logger.debug(f"Accepting WebSocket connection for agent {agent_file_id}")
        await websocket.accept()
        logger.debug(f"WebSocket connection accepted for agent {agent_file_id}")
        
        # Add to active connections
        if agent_file_id not in active_connections:
            active_connections[agent_file_id] = []
        active_connections[agent_file_id].append(websocket)
        logger.debug(f"Added WebSocket connection to active_connections for agent {agent_file_id}")
        
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                logger.info(f"Received message from agent {agent_file_id}: {data}")
                
                # Process message with MCP agent
                try:
                    logger.info(f"Processing message with MCP agent {agent_file_id}")
                    response = await active_agents[agent_file_id].run(data)
                    logger.info(f"Got response from agent {agent_file_id}: {response}")
                    
                    # Create message object
                    message = ChatMessage(
                        agent_id=agent_file_id,
                        message=response
                    )
                    
                    # Send response back to the client
                    await websocket.send_json(message.model_dump(mode="json"))
                    logger.info(f"Sent response to client for agent {agent_file_id}")
                    
                except Exception as e:
                    logger.error(f"Error processing message for agent {agent_file_id}: {str(e)}", exc_info=True)
                    error_message = ChatMessage(
                        agent_id=agent_file_id,
                        message=f"Error processing message: {str(e)}"
                    )
                    await websocket.send_json(error_message.model_dump(mode="json"))
                
        except WebSocketDisconnect:
            logger.debug(f"WebSocket disconnected for agent {agent_file_id}")
            # Remove connection on disconnect
            if agent_file_id in active_connections:
                active_connections[agent_file_id].remove(websocket)
                if not active_connections[agent_file_id]:
                    del active_connections[agent_file_id]
                logger.debug(f"Removed WebSocket connection for agent {agent_file_id}")
                    
    except Exception as e:
        logger.error(f"WebSocket error for agent {agent_file_id}: {str(e)}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(e))
        except:
            pass

AGENT_TYPES_FILE_PATH = os.path.join("configs", "agent-types.json")
print(AGENT_TYPES_FILE_PATH)

@router.get("/types/{agent_id}",
            summary="Get MCP agent type configuration",
            description="Retrieve the command, args, and env_keys for a specific agent type by its ID.",
            response_description="Agent type configuration (command, args, env_keys)"
            )
async def get_agent_type_configuration(agent_id: int):
    """
    Retrieve the configuration (command, args, and env_keys) for a specific agent type based on its ID.

    - **agent_id**: The ID of the agent type (slack, github, etc.)
    """
    try:
        # Read the agent_types.json file
        with open(AGENT_TYPES_FILE_PATH, "r") as file:
            agent_types = json.load(file)

        # Find the agent by ID
        agent_type = next((agent for agent in agent_types if agent["id"] == agent_id), None)

        if agent_type is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent type with ID {agent_id} not found"
            )

        # Return the agent's configuration
        return {
            "command": agent_type["command"],
            "args": agent_type["args"],
            "env_keys": agent_type["env_keys"]
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent types configuration file not found at path {AGENT_TYPES_FILE_PATH}"
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error decoding agent types configuration file"
        )