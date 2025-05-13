"use client"

import type React from "react"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { getAgents, type MCPAgent } from "@/lib/api"

interface MentionInputProps {
  agents: MCPAgent[];
  setAgents: React.Dispatch<React.SetStateAction<MCPAgent[]>>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  dropdownPosition?: "bottom" | "top";
  formatLabel?: (agent: MCPAgent) => string; // Add this prop
}

export function MentionInput({
  agents, 
  setAgents, 
  value, 
  onChange, 
  onSubmit, 
  placeholder, 
  dropdownPosition = "bottom",
  formatLabel 
}: MentionInputProps) {
  const [mentionSearch, setMentionSearch] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [filteredAgents, setFilteredAgents] = useState<MCPAgent[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true)
      try {
        const data = await getAgents()
        setAgents(data)
      } catch (err) {
        console.error("Failed to load agents for mention:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgents()
  }, [])

  useEffect(() => {
    if (mentionSearch) {
      setFilteredAgents(
        agents.filter(
          (agent) =>
            agent.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
            agent.agent_type.toLowerCase().includes(mentionSearch.toLowerCase()),
        ),
      )
      setSelectedIndex(0)
    } else {
      setFilteredAgents(agents)
    }
  }, [mentionSearch, agents])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const position = e.target.selectionStart || 0
    setCursorPosition(position)

    // Check if we're in a mention context
    const textBeforeCursor = newValue.substring(0, position)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1])
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (agentName: string) => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const startPos = cursorPosition - mentionMatch[0].length
      const newValue = value.substring(0, startPos) + `@${agentName} ` + value.substring(cursorPosition)

      onChange(newValue)

      // Set cursor position after the inserted mention
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = startPos + agentName.length + 2 // +2 for @ and space
          inputRef.current.selectionStart = newCursorPos
          inputRef.current.selectionEnd = newCursorPos
          inputRef.current.focus()
        }
      }, 0)
    }

    setShowMentions(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (showMentions && filteredAgents.length > 0) {
        e.preventDefault()
        insertMention(filteredAgents[selectedIndex].name)
      } else {
        onSubmit()
      }
    } else if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prevIndex) => (prevIndex < filteredAgents.length - 1 ? prevIndex + 1 : prevIndex))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex))
      } else if (e.key === "Escape") {
        setShowMentions(false)
      } else if (e.key === "Tab") {
        e.preventDefault()
        if (filteredAgents.length > 0) {
          insertMention(filteredAgents[selectedIndex].name)
        }
      }
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full"
      />

      {showMentions && (
        <div
          className={`absolute left-0 right-0 ${
            dropdownPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
          } bg-popover border rounded-md shadow-md z-10`}
        >
          {isLoading ? (
            <div className="px-3 py-2 text-muted-foreground">Loading agents...</div>
          ) : filteredAgents.length > 0 ? (
            <ul className="py-1 max-h-60 overflow-y-auto">
             {filteredAgents.map((agent, index) => (
  <li
    key={agent.id}
    className={`px-3 py-2 cursor-pointer hover:bg-accent ${index === selectedIndex ? "bg-accent" : ""}`}
    onClick={() => insertMention(agent.name)}
  >
    <div className="flex flex-col">
      <span>@{agent.name}</span>
      {formatLabel ? (
        <span className="text-xs text-muted-foreground">
          {formatLabel(agent).replace(agent.name, '').trim()}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Type: {agent.agent_type}</span>
      )}
    </div>
  </li>
))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-muted-foreground">No agents found</div>
          )}
        </div>
      )}
    </div>
  )
}
