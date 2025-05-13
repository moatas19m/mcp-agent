"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  Trash2Icon,
  EditIcon,
  PlayIcon,
  AlertCircleIcon,
} from "lucide-react";
import { AddAgentModal } from "@/components/add-agent-modal";
import { getAgents, deleteAgent, type MCPAgent } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function AgentListing() {
  const [agents, setAgents] = useState<MCPAgent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<MCPAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAgents, setRunningAgents] = useState<Set<number>>(new Set());
  const { toast } = useToast();

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

  useEffect(() => {
    fetchAgents();
  }, []);

  const groupedAgents = useMemo(() => {
    const groups: Record<string, MCPAgent[]> = {};

    agents.forEach((agent) => {
      const key = agent.file_name || "Ungrouped";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(agent);
    });

    return groups;
  }, [agents]);

  const handleAddAgents = async (newAgents: MCPAgent[]) => {
    // Add the agents to state first for immediate feedback
    setAgents((prevAgents) => [...prevAgents, ...newAgents]);
    setIsModalOpen(false);
    
    // Then refresh the complete list to ensure consistency
    await fetchAgents();
  };

  const handleEditAgent = (agent: MCPAgent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleUpdateAgent = async (updatedAgents: MCPAgent[]) => {
    if (updatedAgents.length > 0) {
      const updatedAgent = updatedAgents[0];
      setAgents((prevAgents) =>
        prevAgents.map((agent) =>
          agent.id === updatedAgent.id ? updatedAgent : agent
        )
      );
    }
    setIsModalOpen(false);
    setEditingAgent(null);
    
    // Refresh the agent list after updating
    await fetchAgents();
  };

  const handleDeleteAgent = async (id: number) => {
    const success = await deleteAgent(id);
    if (success) {
      // Instead of manually updating state, refresh all agents
      await fetchAgents();
      
      toast({
        title: "Agent deleted",
        description: "The agent has been successfully deleted.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add a new function to delete an entire group of agents
  const handleDeleteGroup = async (groupAgents: MCPAgent[]) => {
    try {
      let successCount = 0;
      
      for (const agent of groupAgents) {
        const success = await deleteAgent(agent.file_id);
        if (success) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        // Refresh the agents list after deletion
        await fetchAgents();
        
        toast({
          title: "Group deleted",
          description: `Successfully deleted ${successCount} of ${groupAgents.length} agents.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete any agents in the group.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the group.",
        variant: "destructive",
      });
    }
  };

  const isAgentRunning = (agent: MCPAgent) => {
    return runningAgents.has(agent.file_id);
  };
  
  const isGroupRunning = (groupAgents: MCPAgent[]) => {
    return groupAgents.some((agent) => runningAgents.has(agent.file_id));
  };

  const handleStartAgent = async (id: number, fileId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/agents/${fileId}/start`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Add to running agents using file_id instead of agent.id
        setRunningAgents((prev) => new Set(prev).add(fileId));
        toast({
          title: "Agent started",
          description: "The agent has been successfully started.",
        });
      } else if (data.message === "Agent is already running") {
        // Agent is already running
        setRunningAgents((prev) => new Set(prev).add(fileId));
        toast({
          title: "Agent is already running",
          description: "This agent is already running.",
        });
      } else {
        throw new Error(data.message || "Failed to start agent");
      }
    } catch (error) {
      console.error("Error starting agent:", error);
      toast({
        title: "Error",
        description: "Failed to start the agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">MCP Servers</h2>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add MCP Server Agents
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading agents...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive flex flex-col items-center">
            <AlertCircleIcon className="h-8 w-8 mb-2" />
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchAgents}
            >
              Retry
            </Button>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No agents added yet. Click the button above to add your first agent.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAgents).map(([filename, groupAgents]) => (
              <div key={filename} className="border rounded-md overflow-hidden">
                <div className="bg-muted px-3 py-2 font-medium flex justify-between items-center">
                  <div>
                  {filename === "Ungrouped"
                    ? filename
                    : (() => {
                        // Get the clean name (remove .json if present)
                        const cleanName = filename.endsWith(".json")
                          ? filename.slice(0, -5)
                          : filename;

                        // Extract the last 4 digits if they exist
                        const lastDigits = cleanName.match(/\d{4}$/);
                        const suffix = lastDigits ? lastDigits[0] : "";

                        return `Grouped Agent ${suffix}`;
                      })()}
                  </div>
                  {filename !== "Ungrouped" && groupAgents.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteGroup(groupAgents)}
                      title="Delete all agents in this group"
                      disabled={groupAgents.some(agent => runningAgents.has(agent.file_id))}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <ul className="divide-y">
                  {groupAgents.map((agent, index) => (
                    <li key={agent.id ? `agent-${agent.id}` : `ungrouped-agent-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-medium">{agent.name}</h3>
                            {!agent.is_active && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                Inactive
                              </span>
                            )}
                            {isAgentRunning(agent) && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                Running
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Type: {agent.agent_type} | Command: {agent.command}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={
                              isAgentRunning(agent) ? "outline" : "ghost"
                            }
                            size="icon"
                            onClick={() => handleStartAgent(agent.id, agent.file_id)}
                            title={
                              isAgentRunning(agent)
                                ? "Agent is running"
                                : "Start Agent"
                            }
                            disabled={
                              !agent.is_active ||
                              (isGroupRunning(groupAgents) &&
                               !isAgentRunning(agent))
                            }
                          >
                            <PlayIcon
                              className={`h-4 w-4 ${
                                isAgentRunning(agent)
                                  ? "text-green-500"
                                  : ""
                              }`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAgent(agent)}
                            title="Edit Agent"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          {/* <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAgent(agent.file_id)}
                            title="Delete Agent"
                            disabled={runningAgents.has(agent.file_id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddAgentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSubmit={editingAgent ? handleUpdateAgent : handleAddAgents}
        initialData={editingAgent}
      />
    </div>
  );
}
