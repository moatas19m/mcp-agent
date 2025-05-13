import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logging():
    # Get the project root directory
    project_root = Path(__file__).parent.parent.parent
    
    # Create logs directory if it doesn't exist
    logs_dir = project_root / 'logs'
    logs_dir.mkdir(exist_ok=True)
    
    log_file = logs_dir / 'app.log'

    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )

    # Create file handler
    file_handler = RotatingFileHandler(
        str(log_file),
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(file_formatter)

    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove any existing handlers to avoid duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add handlers to root logger
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Create specific loggers for different components
    loggers = {
        'mcp_agents': logging.getLogger('app.api.endpoints.mcp_agents'),
        'websocket': logging.getLogger('app.api.endpoints.websocket'),
    }

    return loggers 