"use client"


import { AgentListing } from "@/components/agent-listing";
import { ChatInterface } from "@/components/chat-interface";
import { getAgents, MCPAgent } from "@/lib/api";
import { useState } from "react";

export default function Home() {
  const [agents, setAgents] = useState<MCPAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (err) {
      setError("Failed to load agents. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col min-h-screen ml-10 mr-10">
      <header className="border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold">Multi MCP Agent Platform</h1>
        </div>
      </header>

      <main className="flex flex-1 container mx-auto">
        <div className="flex flex-col md:flex-row w-full gap-4 py-4">
          <div className="w-full md:w-1/3 md:border-r md:pr-4 order-2 md:order-1">
            <AgentListing
              // isLoading={isLoading}
              // error={error}
              // fetchAgents={fetchAgents}
              // setError={setError}
              // setIsLoading={setIsLoading}
              // agents={agents}
              // setAgents={setAgents}
            />
          </div>
          <div className="w-full md:w-2/3 order-1 md:order-2 overflow-y-auto h-[calc(100vh-10rem)]">
            <ChatInterface agents={agents} setAgents={setAgents} />
          </div>
        </div>
      </main>
    </div>
  );
}
