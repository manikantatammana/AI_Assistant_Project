
from bson import ObjectId

import uuid
import io

from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader

from app.database.connection import resumes_collection
from app.services.gemini import generate_response


# Create resume router
router = APIRouter(
    prefix="/api/resume",
    tags=["Resume Analyzer"]
)


# Get uploads folder path
BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# Upload and analyze resume
@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):

    # Check PDF extension
    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    # Read uploaded file
    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty"
        )

    # Check PDF file signature
    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file"
        )

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}.pdf"
    file_path = UPLOAD_DIR / unique_filename

    try:
        # Read PDF
        pdf_reader = PdfReader(io.BytesIO(file_content))

        # Extract text
        resume_text = ""

        for page in pdf_reader.pages:
            resume_text += page.extract_text() or ""

        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in this PDF"
            )

        # Prepare Gemini prompt
        prompt = f"""
You are an expert resume analyzer.

Analyze the following resume carefully.

Provide your analysis using these sections:

1. Resume Summary
2. Technical Skills
3. Key Strengths
4. Weaknesses
5. Areas for Improvement
6. Overall Feedback

Use simple English.
Give practical suggestions.
Do not invent skills or experience.

Resume Content:
{resume_text}
"""

        # Get analysis from Gemini
        try:
            analysis = generate_response(prompt)

        except Exception:
            raise HTTPException(
                status_code=502,
                detail="Gemini could not analyze the resume. Please try again."
            )

        # Save original PDF
        file_path.write_bytes(file_content)

        # Prepare MongoDB document
        resume_data = {
            "filename": file.filename,
            "stored_filename": unique_filename,
            "file_path": str(file_path),
            "resume_text": resume_text,
            "analysis": analysis,
            "created_at": datetime.now(timezone.utc)
        }

        # Save in MongoDB
        result = resumes_collection.insert_one(resume_data)

        return {
            "message": "Resume uploaded and analyzed successfully",
            "resume_id": str(result.inserted_id),
            "filename": file.filename,
            "analysis": analysis
        }

    except HTTPException:
        raise

    except Exception:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=400,
            detail="Unable to process this PDF file"
        )


# Get all uploaded resume history
@router.get("/history")
def get_resume_history():

    resumes = resumes_collection.find(
        {},
        {
            "filename": 1,
            "created_at": 1
        }
    ).sort("created_at", -1)

    history = []

    for resume in resumes:
        history.append({
            "resume_id": str(resume["_id"]),
            "filename": resume["filename"],
            "created_at": resume["created_at"]
        })

    return history


# Get one resume with its AI analysis
@router.get("/{resume_id}")
def get_resume(resume_id: str):

    if not ObjectId.is_valid(resume_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid resume ID"
        )

    resume = resumes_collection.find_one({
        "_id": ObjectId(resume_id)
    })

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    return {
        "resume_id": str(resume["_id"]),
        "filename": resume["filename"],
        "analysis": resume["analysis"],
        "created_at": resume["created_at"]
    }


# Delete a resume
@router.delete("/{resume_id}")
def delete_resume(resume_id: str):

    if not ObjectId.is_valid(resume_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid resume ID"
        )

    resume = resumes_collection.find_one({
        "_id": ObjectId(resume_id)
    })

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    # Delete PDF from uploads folder
    stored_filename = resume.get("stored_filename")

    if stored_filename:
        file_path = UPLOAD_DIR / stored_filename

        if file_path.exists():
            file_path.unlink()

    # Delete resume record from MongoDB
    resumes_collection.delete_one({
        "_id": ObjectId(resume_id)
    })

    return {
        "message": "Resume deleted successfully"
    }
