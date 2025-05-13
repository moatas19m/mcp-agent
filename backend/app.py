import asyncio
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from mcp_use import MCPAgent, MCPClient
import os

async def run_memory_chat():
    load_dotenv()
    os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
    config_file = "browser_mcp.json"
    print("Initializing MCPAgent...")

    client = MCPClient.from_config_file(config_file)
    llm = ChatGroq(model="qwen-qwq-32b")

    agent = MCPAgent(
        client=client,
        llm=llm,
        max_steps=15,
        memory_enabled=True,
    )

    print("\n===== Starting conversation ====")
    print("Type 'exit' to end the conversation.")
    print("Type 'clear' to clear the conversation.")
    print("=========================================\n")

    try:
        while True:
            user_input = input("User: ")
            if user_input.lower() == "exit":
                break
            elif user_input.lower() == "clear":
                agent.clear_conversation_history()
                print("conversation history cleared.")
                continue

            print("\n Assistant:" , end='', flush=True)

            try:
                response = await agent.run(user_input)
                print(f"Agent: {response}")

            except Exception as e:
                print(f"Error: {e}")
                print("Please try again.")
    finally:
        if client and client.session:
            await client.close_all_sessions()

if __name__ == "__main__":
    asyncio.run(run_memory_chat())


            