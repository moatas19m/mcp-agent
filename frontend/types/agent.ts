export interface McpServer {
  command: string
  args: string[]
  env: Record<string, string>
}

export interface Agent {
  id: string
  mcpServers: {
    [key: string]: McpServer
  }
}
