// API service for interacting with the MCP Agent Manager API

const API_BASE_URL = "http://localhost:8000/api/v1"

export interface MCPAgent {
  id: number
  name: string
  agent_type: string
  command: string
  args?: string[]
  env?: Record<string, string>
  is_active: boolean
  created_at: string
  updated_at: string
  file_name?: string
  file_id: number
}

export interface MCPAgentCreate {
  name: string
  agent_type: string
  command: string
  args?: string[]
  env?: Record<string, string>
  is_active?: boolean
  file_name?: string  // New property for grouping
}

export interface MCPAgentUpdate {
  name?: string
  agent_type?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  is_active?: boolean
  file_name?: string  // New property for grouping
}
// Get all agents
export async function getAgents(skip = 0, limit = 100): Promise<MCPAgent[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/?skip=${skip}&limit=${limit}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Failed to fetch agents:", error)
    return []
  }
}

// Get a single agent by ID
export async function getAgent(agentId: number): Promise<MCPAgent | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch agent ${agentId}:`, error)
    return null
  }
}

// Create multiple agents
export async function createAgents(agents: MCPAgentCreate[]): Promise<MCPAgent[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agents),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Failed to create agents:", error)
    return []
  }
}

// Create a single agent (legacy method)
export async function createAgent(agent: MCPAgentCreate): Promise<MCPAgent | null> {
  try {
    const agents = await createAgents([agent])
    return agents.length > 0 ? agents[0] : null
  } catch (error) {
    console.error("Failed to create agent:", error)
    return null
  }
}

// Update an existing agent
export async function updateAgent(agentId: number, agent: MCPAgentUpdate): Promise<MCPAgent | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(agent),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to update agent ${agentId}:`, error)
    return null
  }
}

// Delete an agent
export async function deleteAgent(agentId: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error(`Failed to delete agent ${agentId}:`, error)
    return false
  }
}

// Start an agent
export async function startAgent(agentId: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/start`, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error(`Failed to start agent ${agentId}:`, error)
    return false
  }
}
