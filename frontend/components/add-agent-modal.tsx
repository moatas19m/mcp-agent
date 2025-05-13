"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, XIcon, CopyIcon, Trash2Icon } from "lucide-react"
import { createAgents, updateAgent, type MCPAgent, type MCPAgentCreate, type MCPAgentUpdate } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AgentFormData {
  id: string // Temporary ID for UI purposes
  name: string
  agent_type: string
  command: string
  args: string[]
  env: Record<string, string>
  is_active: boolean
}

interface AddAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (agents: MCPAgent[]) => void
  initialData?: MCPAgent | null
  className?: string
}

export function AddAgentModal({ isOpen, onClose, onSubmit, initialData, className }: AddAgentModalProps) {
  const [agents, setAgents] = useState<AgentFormData[]>([])
  const [activeTab, setActiveTab] = useState("0")
  const [newArg, setNewArg] = useState("")
  const [newEnvKey, setNewEnvKey] = useState("")
  const [newEnvValue, setNewEnvValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Initialize with a blank agent or the initial data
  useEffect(() => {
    if (initialData) {
      // Editing a single agent
      setAgents([
        {
          id: "0",
          name: initialData.name,
          agent_type: initialData.agent_type,
          command: initialData.command,
          args: initialData.args || [],
          env: initialData.env || {},
          is_active: initialData.is_active,
        },
      ])
      setActiveTab("0")
    } else {
      // Creating new agents - start with one blank agent
      setAgents([createBlankAgent()])
      setActiveTab("0")
    }
  }, [initialData, isOpen])

  const createBlankAgent = (): AgentFormData => ({
    id: Date.now().toString(),
    name: "",
    agent_type: "",
    command: "python",
    args: ["app.py"],
    env: {},
    is_active: true,
  })

  const addNewAgent = () => {
    const newAgent = createBlankAgent()
    setAgents([...agents, newAgent])
    setActiveTab(newAgent.id)
  }

  const duplicateAgent = (index: number) => {
    const agentToDuplicate = agents[index]
    const newAgent: AgentFormData = {
      ...JSON.parse(JSON.stringify(agentToDuplicate)), // Deep copy
      id: Date.now().toString(),
      name: `${agentToDuplicate.name}-copy`,
    }
    setAgents([...agents, newAgent])
    setActiveTab(newAgent.id)
  }

  const removeAgent = (id: string) => {
    const newAgents = agents.filter((agent) => agent.id !== id)
    setAgents(newAgents)

    // If we removed the active tab, select another one
    if (activeTab === id && newAgents.length > 0) {
      setActiveTab(newAgents[0].id)
    }

    // If no agents left, add a blank one
    if (newAgents.length === 0) {
      const newAgent = createBlankAgent()
      setAgents([newAgent])
      setActiveTab(newAgent.id)
    }
  }

  const updateAgentField = (id: string, field: keyof AgentFormData, value: any) => {
    setAgents(agents.map((agent) => (agent.id === id ? { ...agent, [field]: value } : agent)))
  }

  const handleAddArg = (id: string) => {
    if (newArg.trim()) {
      const agent = agents.find((a) => a.id === id)
      if (agent) {
        updateAgentField(id, "args", [...agent.args, newArg.trim()])
        setNewArg("")
      }
    }
  }

  const handleRemoveArg = (id: string, index: number) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      const newArgs = [...agent.args]
      newArgs.splice(index, 1)
      updateAgentField(id, "args", newArgs)
    }
  }

  const handleAddEnv = (id: string) => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      const agent = agents.find((a) => a.id === id)
      if (agent) {
        updateAgentField(id, "env", {
          ...agent.env,
          [newEnvKey.trim()]: newEnvValue.trim(),
        })
        setNewEnvKey("")
        setNewEnvValue("")
      }
    }
  }

  const handleRemoveEnv = (id: string, key: string) => {
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      const newEnv = { ...agent.env }
      delete newEnv[key]
      updateAgentField(id, "env", newEnv)
    }
  }

  const validateAgents = () => {
    const errors: string[] = []

    agents.forEach((agent, index) => {
      if (!agent.name.trim()) {
        errors.push(`Agent ${index + 1}: Name is required`)
      }
      if (!agent.agent_type.trim()) {
        errors.push(`Agent ${index + 1}: Agent Type is required`)
      }
      if (!agent.command.trim()) {
        errors.push(`Agent ${index + 1}: Command is required`)
      }
    })

    // Check for duplicate names
    const names = agents.map((a) => a.name.trim())
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate agent names: ${duplicateNames.join(", ")}`)
    }

    return errors
  }

  const handleSubmit = async () => {
    const errors = validateAgents()
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: (
          <ul className="list-disc pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        ),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (initialData) {
        // Update existing agent (single agent mode)
        const agent = agents[0]
        const updateData: MCPAgentUpdate = {
          name: agent.name,
          agent_type: agent.agent_type,
          command: agent.command,
          args: agent.args.length > 0 ? agent.args : undefined,
          env: Object.keys(agent.env).length > 0 ? agent.env : undefined,
          is_active: agent.is_active,
        }

        const result = await updateAgent(initialData.id, updateData)
        if (result) {
          onSubmit([result])
          toast({
            title: "Agent Updated",
            description: "The agent was successfully updated.",
          })
        } else {
          throw new Error("Failed to update agent")
        }
      } else {
        // Create new agents (multiple agents mode)
        const createData: MCPAgentCreate[] = agents.map((agent) => ({
          name: agent.name,
          agent_type: agent.agent_type,
          command: agent.command,
          args: agent.args.length > 0 ? agent.args : undefined,
          env: Object.keys(agent.env).length > 0 ? agent.env : undefined,
          is_active: agent.is_active,
        }))

        const results = await createAgents(createData)
        if (results && results.length > 0) {
          onSubmit(results)
          toast({
            title: "Agents Created",
            description: `Successfully created ${results.length} agent(s).`,
          })
        } else {
          throw new Error("Failed to create agents")
        }
      }
    } catch (error) {
      console.error("Error saving agents:", error)
      toast({
        title: "Error",
        description: `Failed to ${initialData ? "update" : "create"} the agent(s). Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 flex-shrink-0">
          <DialogTitle>{initialData ? "Edit Agent" : "Add Agents"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          {!initialData && (
            <div className="px-6 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <TabsList className="h-10 overflow-x-auto w-auto">
                  {agents.map((agent, index) => (
                    <TabsTrigger key={agent.id} value={agent.id} className="relative px-4">
                      <span className="mr-1">{agent.name || `Agent ${index + 1}`}</span>
                      {agents.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            removeAgent(agent.id)
                          }}
                          className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs cursor-pointer"
                          role="button"
                          aria-label={`Remove ${agent.name || `Agent ${index + 1}`}`}
                        >
                          ×
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button variant="outline" size="sm" onClick={addNewAgent} disabled={isSubmitting}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Add Agent
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <ScrollArea className="h-[50vh] px-6 py-4">
              {agents.map((agent) => (
                <TabsContent key={agent.id} value={agent.id} className="mt-0 h-full">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">
                        {initialData
                          ? "Edit Agent Details"
                          : `Configure Agent ${agents.findIndex((a) => a.id === agent.id) + 1}`}
                      </h3>
                      {!initialData && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateAgent(agents.findIndex((a) => a.id === agent.id))}
                            disabled={isSubmitting}
                          >
                            <CopyIcon className="h-4 w-4 mr-1" /> Duplicate
                          </Button>
                          {agents.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAgent(agent.id)}
                              disabled={isSubmitting}
                            >
                              <Trash2Icon className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`name-${agent.id}`} className="text-right">
                        Name *
                      </Label>
                      <Input
                        id={`name-${agent.id}`}
                        value={agent.name}
                        onChange={(e) => updateAgentField(agent.id, "name", e.target.value)}
                        className="col-span-3"
                        placeholder="slack-agent-1"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`agentType-${agent.id}`} className="text-right">
                        Agent Type *
                      </Label>
                      <Input
                        id={`agentType-${agent.id}`}
                        value={agent.agent_type}
                        onChange={(e) => updateAgentField(agent.id, "agent_type", e.target.value)}
                        className="col-span-3"
                        placeholder="slack"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`command-${agent.id}`} className="text-right">
                        Command *
                      </Label>
                      <Input
                        id={`command-${agent.id}`}
                        value={agent.command}
                        onChange={(e) => updateAgentField(agent.id, "command", e.target.value)}
                        className="col-span-3"
                        placeholder="python"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">Arguments</Label>
                      <div className="col-span-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {agent.args.map((arg, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded-md"
                            >
                              <span className="text-sm">{arg}</span>
                              <button
                                onClick={() => handleRemoveArg(agent.id, index)}
                                className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newArg}
                            onChange={(e) => setNewArg(e.target.value)}
                            placeholder="Add argument"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleAddArg(agent.id)
                              }
                            }}
                          />
                          <Button type="button" onClick={() => handleAddArg(agent.id)} size="sm">
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">Environment</Label>
                      <div className="col-span-3 space-y-2">
                        <div className="space-y-2">
                          {Object.entries(agent.env).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{key}</span>
                                    <span className="mx-2">=</span>
                                    <span>{value}</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveEnv(agent.id, key)}
                                    className="text-secondary-foreground/70 hover:text-secondary-foreground"
                                  >
                                    <XIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value)} placeholder="ENV_KEY" />
                          <Input
                            value={newEnvValue}
                            onChange={(e) => setNewEnvValue(e.target.value)}
                            placeholder="value"
                          />
                        </div>
                        <Button type="button" onClick={() => handleAddEnv(agent.id)} size="sm" className="w-full">
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Environment Variable
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`isActive-${agent.id}`} className="text-right">
                        Active
                      </Label>
                      <div className="col-span-3">
                        <Switch
                          id={`isActive-${agent.id}`}
                          checked={agent.is_active}
                          onCheckedChange={(checked) => updateAgentField(agent.id, "is_active", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </div>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
                ? "Update Agent"
                : `Add ${agents.length} Agent${agents.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
