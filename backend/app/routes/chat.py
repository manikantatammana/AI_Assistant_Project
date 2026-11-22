
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database.connection import chats_collection
from app.services.gemini import generate_response


# Create chat router
router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"]
)


# Request model for sending a message
class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


# Create a new chat
@router.post("/new")
def create_chat():

    chat_data = {
        "title": "New Chat",
        "messages": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = chats_collection.insert_one(chat_data)

    return {
        "message": "New chat created successfully",
        "chat_id": str(result.inserted_id)
    }


# Get all chat history
@router.get("/history")
def get_chat_history():

    chats = chats_collection.find(
        {},
        {"title": 1, "created_at": 1, "updated_at": 1}
    ).sort("updated_at", -1)

    history = []

    for chat in chats:
        history.append({
            "chat_id": str(chat["_id"]),
            "title": chat["title"],
            "created_at": chat["created_at"],
            "updated_at": chat["updated_at"]
        })

    return history


# Send a message to an existing chat
@router.post("/{chat_id}/message")
def send_message(chat_id: str, request: MessageRequest):

    # Check whether the chat ID is valid
    if not ObjectId.is_valid(chat_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid chat ID"
        )

    # Find the chat in MongoDB
    chat = chats_collection.find_one({
        "_id": ObjectId(chat_id)
    })

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found"
        )

    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    # Prepare previous conversation for Gemini
    conversation = ""

    for item in chat["messages"][-10:]:
        conversation += (
            f'{item["role"]}: {item["content"]}\n'
        )

    prompt = f"""
You are a helpful AI assistant.
Answer the user in simple and clear language.

Previous conversation:
{conversation}

User: {user_message}

Assistant:
"""

    # Generate AI response
    try:
        ai_response = generate_response(prompt)

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to get a response from Gemini. Please try again."
        )

    # Save both messages in MongoDB
    now = datetime.now(timezone.utc)

    chats_collection.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {
                            "role": "user",
                            "content": user_message,
                            "created_at": now
                        },
                        {
                            "role": "assistant",
                            "content": ai_response,
                            "created_at": now
                        }
                    ]
                }
            },
            "$set": {
                "title": (
                    user_message[:40]
                    if not chat["messages"]
                    else chat["title"]
                ),
                "updated_at": now
            }
        }
    )

    return {
        "chat_id": chat_id,
        "user_message": user_message,
        "ai_response": ai_response
    }


# Get one particular chat
@router.get("/{chat_id}")
def get_chat(chat_id: str):

    if not ObjectId.is_valid(chat_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid chat ID"
        )

    chat = chats_collection.find_one({
        "_id": ObjectId(chat_id)
    })

    if not chat:
        raise HTTPException(
            status_code=404,
            detail="Chat not found"
        )

    return {
        "chat_id": str(chat["_id"]),
        "title": chat["title"],
        "messages": chat["messages"],
        "created_at": chat["created_at"],
        "updated_at": chat["updated_at"]
    }


# Delete a chat
@router.delete("/{chat_id}")
def delete_chat(chat_id: str):

    if not ObjectId.is_valid(chat_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid chat ID"
        )

    result = chats_collection.delete_one({
        "_id": ObjectId(chat_id)
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Chat not found"
        )

    return {
        "message": "Chat deleted successfully"
    }
