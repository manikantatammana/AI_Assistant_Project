
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import check_database
from app.routes import chat, resume


# Create FastAPI application
app = FastAPI(
    title="AI Assistant",
    description="AI Chatbot and Resume Analyzer",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(resume.router)


# Home route
@app.get("/")
def home():
    return {
        "message": "Welcome to AI Assistant API",
        "status": "Running"
    }


# Database health check
@app.get("/health/database")
def database_health():
    try:
        result = check_database()

        return {
            "status": "success",
            "database": result
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }
