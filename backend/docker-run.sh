#!/bin/bash

# Make the script executable
chmod +x docker-run.sh

# Function to display help
show_help() {
    echo "Usage: ./docker-run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  start     Start the application"
    echo "  stop      Stop the application"
    echo "  restart   Restart the application"
    echo "  logs      Show application logs"
    echo "  clean     Remove containers and images"
    echo "  help      Show this help message"
}

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo "Error: GROQ_API_KEY environment variable is not set"
    echo "Please set it using: export GROQ_API_KEY=your_api_key"
    exit 1
fi

# Process commands
case "$1" in
    "build")
        docker compose build
        ;;
    "start")
        docker compose up -d
        ;;
    "stop")
        docker compose down
        ;;
    "restart")
        docker compose restart
        ;;
    "logs")
        docker compose logs -f
        ;;
    "clean")
        docker compose down
        docker system prune -f
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 