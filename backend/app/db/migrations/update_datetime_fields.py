from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.mcp_agent import MCPAgent
from datetime import datetime

def update_datetime_fields():
    # Create engine and session
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get all agents
        agents = db.query(MCPAgent).all()
        
        # Update datetime fields for each agent
        for agent in agents:
            if not agent.created_at:
                agent.created_at = datetime.utcnow()
            if not agent.updated_at:
                agent.updated_at = datetime.utcnow()
        
        # Commit changes
        db.commit()
        print("Successfully updated datetime fields for all agents")
        
    except Exception as e:
        print(f"Error updating datetime fields: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_datetime_fields() 