from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import mcp_agents
from app.core.config import settings
from app.db.session import engine
from app.db.base_class import Base
from app.core.logging_config import setup_logging

# Setup logging
loggers = setup_logging()
logger = loggers['mcp_agents']

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    MCP Agent Manager API with WebSocket support for real-time chat functionality.
    
    ## Features
    * Manage multiple MCP agents (create, read, update, delete)
    * Real-time chat via WebSocket
    * Automatic configuration file generation
    * Agent process management
    
    ## Authentication
    Currently, this API does not require authentication.
    """,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=None,  # Disable default docs URL
    redoc_url=None,  # Disable default redoc URL
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Exposes all headers
    max_age=3600  # Cache preflight requests for 1 hour
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include routers
app.include_router(
    mcp_agents.router,
    prefix=f"{settings.API_V1_STR}/agents",
    tags=["agents"]
)

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to MCP Agent Manager",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

# Log registered routes on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup - registering routes")
    for route in app.routes:
        if hasattr(route, "methods"):
            logger.info(f"Route: {route.path}, methods: {route.methods}")
        else:
            logger.info(f"WebSocket Route: {route.path}")

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security schemes if needed
    # openapi_schema["components"]["securitySchemes"] = {...}
    
    # Add server information
    openapi_schema["servers"] = [
        {"url": "http://localhost:8000", "description": "Local development server"},
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Custom Swagger UI endpoint
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    ) 