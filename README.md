# MCP Agent Manager

This project is a robust FastAPI-based backend system designed to manage multiple Model Context Protocol (MCP) agents with WebSocket support for real-time chat functionality.

## Core Features

- *Agent Management:* Full CRUD operations for MCP agents via RESTful API endpoints
- *Configuration Storage:* Uses SQLite database to store agent configurations
- *Automatic Config Generation:* Creates and maintains JSON configuration files
- *Real-time Communication:* WebSocket support for chat functionality
- *Docker Support:* Containerized deployment with Docker Compose

## Agent Orchestration Architecture

The project implements a sophisticated agent orchestration system that handles:

- *Agent Lifecycle Management:* Tracking creation, activation, and termination of agents
- *Configuration Generation:* Automatic generation of configuration files in the configs directory
- *WebSocket Communication:* Real-time bidirectional communication with agents
- *Database Integration:* Persistent storage of agent configurations via SQLAlchemy

## MCP Server Types

### Grouped MCP Servers

The system supports grouped MCP servers that operate as multi-agent systems using multiple MCP servers simultaneously:

- *Tool Selection:* The orchestrator intelligently selects appropriate tools based on the task
- *Concurrent Operation:* Multiple agents can run simultaneously, each specialized for different tasks
- *Shared Context:* Agents within a group can share context and information
- *Unified Management:* Managed collectively by the orchestrator via MCPAgentService

### Ungrouped MCP Servers

The system also supports ungrouped agents that operate individually:

- *Single Purpose:* Each agent connects to a single MCP server
- *Independent Operation:* Operates without requiring other agents
- *Direct Management:* Can be started, stopped, and monitored independently
- *Simplified Configuration:* More straightforward configuration with specific environment variables

Each agent type (Slack, GitHub, Jira) defined in agent-types.json can be used independently or as part of a grouped configuration.

## Technical Implementation

The orchestration is implemented through:

- MCPAgentService for agent management
- mcp_agents.py for API endpoints
- SQLAlchemy models in the models directory
- WebSocket functionality for real-time agent communication

The system uses Groq LLM integration via ChatGroq for intelligent agent capabilities.

## Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- npm 10.8.2 or higher
- npx 10.8.2 or higher

## Installation

1. Clone the repository:
git clone <repository-url>
cd mcp-agent

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create and activate a Python virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate   # On macOS and Linux
    ```
    ```bash
    .\venv\Scripts\activate  # On Windows
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Start the FastAPI server:**
    ```bash
    uvicorn app.main:app --reload
    ```

Access the API documentation at:

http://localhost:8000/docs

### Frontend Setup

1.  **Open a new terminal and navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```

    The frontend application will be available at `http://localhost:3000`.



## API Endpoints

### Agent Management

- POST /api/v1/agents/ - Create a new agent
- GET /api/v1/agents/ - List all agents
- GET /api/v1/agents/{agent_id} - Get agent details
- PUT /api/v1/agents/{agent_id} - Update agent
- DELETE /api/v1/agents/{agent_id} - Delete agent
- POST /api/v1/agents/{agent_id}/start - Start an agent

### WebSocket Chat

- WS /api/v1/agents/ws/{agent_id} - WebSocket endpoint for chat

## Example Agent Configuration

```json
{
    "name": "slack-agent",
    "agent_type": "slack",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-slack"],
    "env": {
        "SLACK_BOT_TOKEN": "your-token",
        "SLACK_TEAM_ID": "your-team-id",
        "SLACK_CHANNEL_IDS": "your-channel-id"
    }
}
```

## Project Structure

```
app/
├── api/
│   └── endpoints/
│       └── mcp_agents.py
├── core/
│   └── config.py
├── db/
│   ├── base_class.py
│   └── session.py
├── models/
│   ├── mcp_agent.py
│   └── schemas.py
├── services/
│   └── mcp_agent_service.py
└── main.py
```


## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

# Slack Setup for Environment Variables

This guide outlines how to set up a Slack App and obtain the necessary credentials to use as environment variables in your application.

## Prerequisites

- You have a Slack workspace where you want to integrate your application.
- You have access to create and manage Slack Apps within that workspace.

## Step-by-Step Guide

### 1. Create a Slack App

1.  Visit the [Slack Apps page](https://api.slack.com/apps) in your web browser.
2.  Click the *"Create New App"* button.
3.  Choose the *"From scratch"* option.
4.  *Name your app* appropriately (e.g., "My Integration Bot").
5.  Select the *workspace* you intend to use with your application from the dropdown menu.
6.  Click the *"Create App"* button.

### 2. Configure Bot Token Scopes

Scopes define what your Slack App is allowed to do within your workspace. You need to configure the following bot token scopes for the specified functionalities:

1.  In the left-hand sidebar of your app's settings, navigate to *"OAuth & Permissions"*.
2.  Scroll down to the *"Scopes"* section.
3.  Under *"Bot Token Scopes", click the *"Add an OAuth Scope"** button.
4.  Add the following scopes one by one by searching for them and clicking "Add":
    - channels:history - Allows your app to view messages and other content in public channels.
    - channels:read - Allows your app to view basic information about public channels.
    - chat:write - Allows your app to send messages as the app.
    - reactions:write - Allows your app to add emoji reactions to messages.
    - users:read - Allows your app to view users and their basic information.
    - users.profile:read - Allows your app to view detailed profiles about users.
5.  Once all the scopes are added, they will be listed under "Bot Token Scopes."

### 3. Install App to Workspace

To generate the necessary token, you need to install your app to your selected Slack workspace:

1.  At the top of the *"OAuth & Permissions"* page, click the *"Install App to Workspace"* button.
2.  Review the requested permissions and click *"Allow"* to authorize the app.
3.  After authorizing, you will be presented with the *"Bot User OAuth Token"*. This token starts with xoxb-.
4.  *Important:* Copy and securely save this *"Bot User OAuth Token"*. You will need to set this as the SLACK_BOT_TOKEN environment variable in your application.

### 4. Get your Team ID

Your Team ID (also known as your Workspace ID) is a unique identifier for your Slack workspace. You will likely need this for certain configurations.

1.  *Open Slack in a web browser.*
2.  Click on your *workspace name* in the top-left corner.
3.  Navigate to *"Settings & administration"* and then *"Workspace settings"*.
4.  In the browser's address bar, look for the team=Txxxxxxxx part of the URL. The string starting with T is your *Team ID*.
5.  Save this *Team ID*. You will need to set this as the SLACK_TEAM_ID environment variable in your application.

## Environment Variables

Once you have completed the steps above, you will have the following information to set as environment variables in your application:

- *SLACK_BOT_TOKEN*: The Bot User OAuth Token you saved in Step 3 (starts with xoxb-).
- *SLACK_TEAM_ID*: Your Slack Workspace ID you found in Step 4 (starts with T).

You might also need to configure *SLACK_CHANNEL_IDS* if your application interacts with specific channels. You can obtain Channel IDs by following these steps within Slack:

1.  Open the desired channel.
2.  Click on the channel name at the top.
3.  Go to the "About" tab or section.
4.  Look for the "Channel ID". You can list multiple Channel IDs separated by commas in the SLACK_CHANNEL_IDS environment variable (e.g., C1234567890,C9876543210).

Also you need to add the bot to particular channel in which you want to send msg. You can just add it by mentioning the app name e.g @my-app

By setting these environment variables, your application should be able to authenticate with Slack and perform the actions defined by the granted scopes. Remember to keep your tokens and IDs secure.

# Jira and Confluence Setup for MCP Atlassian (API Token Authentication - Cloud)

This guide outlines how to set up API token authentication for Jira and Confluence to be used with MCP Atlassian. This method is applicable for Atlassian Cloud instances.

## Prerequisites

- You have an Atlassian Cloud account with access to Jira and/or Confluence.
- You have administrator or user permissions that allow you to create API tokens.

## Step-by-Step Guide: API Token Authentication (Cloud)

This method involves creating API tokens for your Atlassian account, which MCP Atlassian will use to authenticate.

### 1. Generate API Tokens

You will need to generate separate API tokens for both Jira and Confluence if you intend to interact with both.

#### 1.1. Generate a Confluence API Token

1.  Open your web browser and go to the Atlassian account API token management page: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2.  Log in with the Atlassian account that MCP Atlassian will use to access your Confluence instance. This is the account whose email you will use for the CONFLUENCE_USERNAME environment variable.
3.  Click the *"Create API token"* button.
4.  In the "Label" field, enter a descriptive name for your token (e.g., "MCP Confluence").
5.  Click *"Create"*.
6.  *Immediately copy the generated token.* This is the only time you will see it. Store it securely. This token will be used for the CONFLUENCE_API_TOKEN environment variable.

#### 1.2. Generate a Jira API Token

1.  Go back to the Atlassian account API token management page: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2.  Ensure you are logged in with the Atlassian account that MCP Atlassian will use to access your Jira instance. This is the account whose email you will use for the JIRA_USERNAME environment variable.
3.  Click the *"Create API token"* button again.
4.  In the "Label" field, enter a descriptive name for this token (e.g., "MCP Jira").
5.  Click *"Create"*.
6.  *Immediately copy the generated token.* Store it securely. This token will be used for the JIRA_API_TOKEN environment variable.

### 2. Configure Environment Variables for MCP Atlassian

You will need to set the following environment variables for MCP Atlassian to connect to your Jira and Confluence instances using the API tokens you generated:

- *CONFLUENCE_URL: The base URL of your Confluence Cloud instance. Typically in the format https://your-company.atlassian.net/wiki. **Replace your-company with your actual Atlassian subdomain.*
- *CONFLUENCE_USERNAME*: The email address of the Atlassian account you used to generate the Confluence API token.
- *CONFLUENCE_API_TOKEN*: The Confluence API token you copied in Step 1.1.
- *JIRA_URL: The base URL of your Jira Cloud instance. Typically in the format https://your-company.atlassian.net. **Replace your-company with your actual Atlassian subdomain.*
- *JIRA_USERNAME*: The email address of the Atlassian account you used to generate the Jira API token.
- *JIRA_API_TOKEN*: The Jira API token you copied in Step 1.2.

*Example Environment Variable Configuration:*

# GitHub Setup for Environment Variables

This guide outlines how to generate a GitHub Personal Access Token (PAT) for use as the GITHUB_PERSONAL_ACCESS_TOKEN environment variable in your application. *It is crucial that this token does not have fine-grained access control or specific scopes enabled.*

## Important Note on Token Scope

For the purpose of this setup, *ensure that you create a Personal Access Token with broad, repository-level access.* Avoid selecting specific repositories or enabling fine-grained permissions during token creation. This is often necessary for certain integrations that require wider access to your GitHub account.

*However, please be aware that generating tokens with broad access carries security implications. Only grant the necessary permissions and consider using more secure authentication methods like OAuth 2.0 where possible for production environments.*

## Step-by-Step Guide: Generating a GitHub Personal Access Token

1.  *Go to your GitHub Settings:*

    - Log in to your GitHub account at [https://github.com/](https://github.com/).
    - Click on your *profile picture* in the top-right corner.
    - Select *"Settings"* from the dropdown menu.

2.  *Navigate to Developer Settings:*

    - In the left-hand sidebar, scroll down and click on *"Developer settings"*.

3.  *Access Personal Access Tokens (classic):*

    - In the left-hand sidebar under "Developer settings," click on *"Personal access tokens (classic)". **Do NOT select "Fine-grained personal access tokens."*

4.  *Generate a New Token:*

    - Click the green *"Generate new token"* button.
    - You might be asked to confirm your password.

5.  *Provide a Token Note:*

    - In the "Note" field, enter a descriptive name for your token (e.g., "My Integration Token"). This will help you remember what the token is used for.

6.  *Select Scopes (Permissions):*

    - *This is the crucial step for ensuring broad access.* For this specific setup, you will likely need to select the *"repo"* scope. This single scope grants access to all your repositories.
    - *Do NOT select individual repository scopes under the "repo" section.*
    - Depending on the specific needs of your application, you might also need to select other broad scopes like:
      - read:org (Read access to organization membership, organization projects, and team membership)
      - gist (Create, edit, and delete gists)
      - read:user (Read user profile data)
      - user:email (Read user email addresses)
      - write:repo_hook (Access to repository hooks)
    - *Carefully consider the minimum necessary broad scopes required by your application.* Avoid granting unnecessary permissions.

7.  *Generate the Token:*

    - Scroll down and click the green *"Generate token"* button.

8.  *Copy Your New Token:*
    - You will be presented with your newly generated Personal Access Token. *Copy this token immediately and store it in a secure place.* You will not be able to see it again.

## Environment Variable

Once you have generated and copied your Personal Access Token, you can set it as the GITHUB_PERSONAL_ACCESS_TOKEN environment variable in your application's configuration
