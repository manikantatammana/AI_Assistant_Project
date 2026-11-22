
import os
from pathlib import Path

from pymongo import MongoClient
import certifi
from dotenv import load_dotenv


# Load environment variables
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


# Get database details
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_assistant")


# Check MongoDB URL
if not MONGODB_URL:
    raise ValueError("MongoDB URL is missing in .env")


# Connect to MongoDB with certifi CA bundle for secure SSL/TLS validation in cloud containers (Render/Linux)
client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,
    tlsCAFile=certifi.where()
)


# Select database
database = client[DATABASE_NAME]


# Select collections
chats_collection = database["chats"]
resumes_collection = database["resumes"]


# Test database connection
def check_database():

    client.admin.command("ping")

    return "MongoDB connected successfully"
