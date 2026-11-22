
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


# Load environment variables from backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("Gemini API key is missing in .env")


# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)


# Select Gemini model
MODEL_NAME = "gemini-3.5-flash-lite"

# Generate AI response
def generate_response(prompt: str):

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt
    )

    return response.text
