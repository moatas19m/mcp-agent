"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  SendIcon,
  BotIcon,
  UserIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { MentionInput } from "@/components/mention-input";
import type { Message } from "@/types/chat";
import { getAgents, type MCPAgent } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  agents: MCPAgent[];
  setAgents: React.Dispatch<React.SetStateAction<MCPAgent[]>>;
}

export function ChatInterface({ agents, setAgents }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "system",
      content:
        "Welcome to the Agent Platform! You can mention agents using @ symbol (e.g., @slack-agent-1).",
    },
  ]);
  const [input, setInput] = useState("");
  const [activeAgent, setActiveAgent] = useState<MCPAgent | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const getAgentGroupName = (agent: MCPAgent) => {
    if (!agent.file_name) return null;
    
    // Get the clean name (remove .json if present)
    const cleanName = agent.file_name.endsWith(".json") 
      ? agent.file_name.slice(0, -5) 
      : agent.file_name;
    
    // Extract the last 4 digits if they exist
    const lastDigits = cleanName.match(/\d{4}$/);
    const suffix = lastDigits ? lastDigits[0] : "";
    
    return `Grouped Agent ${suffix}`;
  };
  
  // Modify MentionInput to include group formatting function
  const formatMentionLabel = (agent: MCPAgent) => {
    const groupName = getAgentGroupName(agent);
    return groupName 
      ? `${agent.name} (${groupName})`
      : agent.name;
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch agents for processing mentions
    const fetchAgents = async () => {
      try {
        const data = await getAgents();
        setAgents(data);
      } catch (err) {
        console.error("Failed to load agents for chat:", err);
      }
    };

    fetchAgents();

    // Clean up WebSocket connection on unmount
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectWebSocket = (agentId: number) => {
    if (wsConnection) {
      disconnectWebSocket();
    }

    setConnectionStatus("connecting");

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//localhost:8000/api/v1/agents/ws/${agentId}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
      setConnectionStatus("connected");
      setWsConnection(ws);

      // Find the agent to get its name and group info
      const connectedAgent = agents.find(a => a.id === agentId);
      const groupName = connectedAgent ? getAgentGroupName(connectedAgent) : null;
      const agentDisplayName = connectedAgent ? connectedAgent.name : `agent ${agentId}`;
      const displayText = groupName 
        ? `${agentDisplayName} (${groupName})`
        : agentDisplayName;

      // Add connection message
      const connectionMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: `Connected to ${displayText}`,
      };
      setMessages((prev) => [...prev, connectionMessage]);

      toast({
        title: "Connected",
        description: `Successfully connected to ${displayText}`,
      });
    };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const receivedMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: data.message || event.data,
          };
          setMessages((prev) => [...prev, receivedMessage]);
        } catch (e) {
          // If not JSON, just display the raw message
          const receivedMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: event.data,
          };
          setMessages((prev) => [...prev, receivedMessage]);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the agent",
          variant: "destructive",
        });
      };

      ws.onclose = (event) => {
        setConnectionStatus("disconnected");
        setWsConnection(null);

        // Add disconnection message
        const disconnectionMessage: Message = {
          id: Date.now().toString(),
          role: "system",
          content: `Disconnected from agent: ${
            event.reason || "Connection closed"
          }`,
        };
        setMessages((prev) => [...prev, disconnectionMessage]);
      };
    } catch (error) {
      console.error("Connection Error:", error);
      setConnectionStatus("disconnected");
      toast({
        title: "Connection Error",
        description: "Failed to establish WebSocket connection",
        variant: "destructive",
      });
    }
  };

  const disconnectWebSocket = () => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setConnectionStatus("disconnected");
      setActiveAgent(null);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages([...messages, userMessage]);

    // If connected to WebSocket, send message through it
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(input);
    } else {
      // Process message for agent mentions if not connected to WebSocket
      const mentionedAgentNames = input.match(/@(\w+(-\w+)*)/g);

      if (mentionedAgentNames && mentionedAgentNames.length > 0) {
        // Extract agent names without the @ symbol
        const agentNames = mentionedAgentNames.map((name) => name.substring(1));

        // Find the first mentioned agent
        const mentionedAgent = agents.find((agent) =>
          agentNames.includes(agent.name)
        );

        if (mentionedAgent && !activeAgent) {
          // Connect to the first mentioned agent
          setActiveAgent(mentionedAgent);
          connectWebSocket(mentionedAgent.file_id);

          // Add system message about connection attempt
          const systemMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "system",
            content: `Connecting to agent: ${mentionedAgent.name}...`,
          };

          setMessages((prev) => [...prev, systemMessage]);
          return;
        }
      }

      // If not connected or no agent mentioned, simulate response
      setTimeout(() => {
        let responseContent = "I received your message.";

        if (mentionedAgentNames && mentionedAgentNames.length > 0) {
          // Extract agent names without the @ symbol
          const agentNames = mentionedAgentNames.map((name) =>
            name.substring(1)
          );

          // Find the actual agents that were mentioned
          const mentionedAgents = agents.filter((agent) =>
            agentNames.includes(agent.name)
          );

          if (mentionedAgents.length > 0) {
            const agentsList = mentionedAgents.map((a) => a.name).join(", ");
            responseContent = `I'll process your request using the ${agentsList} agent(s).`;

            // Add details about the agents
            responseContent += "\n\nAgent details:";
            mentionedAgents.forEach((agent) => {
              responseContent += `\n- ${agent.name} (${agent.agent_type}): ${
                agent.command
              } ${agent.args?.join(" ") || ""}`;
            });

            responseContent +=
              "\n\nTo connect to an agent, mention it with @name.";
          } else {
            responseContent =
              "I couldn't find any of the mentioned agents in the system.";
          }
        }

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responseContent,
        };

        setMessages((prev) => [...prev, agentMessage]);
      }, 1000);
    }

    setInput("");
  };

  return (
<div className="flex flex-col h-full">
      <div className="border-b p-2 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Chat Interface</h2>
        <div className="flex items-center gap-2">
          {activeAgent && (
            <Badge variant="outline" className="flex items-center gap-1">
              {connectionStatus === "connected" ? (
                <WifiIcon className="h-3 w-3 text-green-500" />
              ) : connectionStatus === "connecting" ? (
                <WifiIcon className="h-3 w-3 text-yellow-500" />
              ) : (
                <WifiOffIcon className="h-3 w-3 text-red-500" />
              )}
              <span>
                {/* {activeAgent.name} */}
                {getAgentGroupName(activeAgent) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {getAgentGroupName(activeAgent)}
                  </span>
                )}
                {" "}({connectionStatus})
              </span>
            </Badge>
          )}
          {activeAgent && (
            <Button variant="ghost" size="sm" onClick={disconnectWebSocket}>
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start gap-2 max-w-[80%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : message.role === "system"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-secondary-foreground"
              } p-3 rounded-lg`}
            >
              {message.role === "user" ? (
                <UserIcon className="h-5 w-5 mt-1 flex-shrink-0" />
              ) : message.role === "assistant" ? (
                <BotIcon className="h-5 w-5 mt-1 flex-shrink-0" />
              ) : null}
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <MentionInput
            agents={agents}
            setAgents={setAgents}
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            formatLabel={formatMentionLabel} // Pass our custom format function
            placeholder={
              connectionStatus === "connected"
                ? `Send message to ${activeAgent?.name}...`
                : "Type a message... (Use @ to mention agents)"
            }
            dropdownPosition="top"
          />
          <Button onClick={handleSendMessage} size="icon">
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
