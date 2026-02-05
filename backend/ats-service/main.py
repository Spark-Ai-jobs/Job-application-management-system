"""
ATS (Applicant Tracking System) Scoring Service

This service analyzes resumes against job descriptions and provides
an ATS compatibility score. Resumes scoring >= 90% are auto-submitted,
while those below require human review.
"""

import os
import re
import json
from typing import Optional, List, Dict, Any
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pdfplumber
from docx import Document
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Initialize FastAPI app
app = FastAPI(
    title="Spark.AI ATS Scoring Service",
    description="Resume analysis and ATS compatibility scoring",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://spark:sparkpass@postgres:5432/sparkdb")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
ATS_THRESHOLD = int(os.getenv("ATS_THRESHOLD", "90"))

# Redis client
redis_client = redis.from_url(REDIS_URL)

# NLTK components
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')

lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))


# Pydantic models
class ScoreRequest(BaseModel):
    resume_text: str = Field(..., description="Resume text content")
    job_description: str = Field(..., description="Job description text")
    job_requirements: Optional[List[str]] = Field(default=None, description="List of job requirements")


class ScoreResponse(BaseModel):
    score: float = Field(..., description="ATS compatibility score (0-100)")
    keyword_match: float = Field(..., description="Keyword matching score")
    skills_match: float = Field(..., description="Skills matching percentage")
    experience_match: float = Field(..., description="Experience relevance score")
    formatting_score: float = Field(..., description="Resume formatting score")
    recommendations: List[str] = Field(..., description="Improvement recommendations")
    matched_keywords: List[str] = Field(..., description="Keywords found in resume")
    missing_keywords: List[str] = Field(..., description="Important missing keywords")
    auto_submit: bool = Field(..., description="Whether resume qualifies for auto-submission")


class TaskScoreRequest(BaseModel):
    task_id: str
    candidate_id: str
    job_id: str


# Text processing functions
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    text = ""
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text content from a DOCX file."""
    doc = Document(BytesIO(file_bytes))
    text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    return text.strip()


def preprocess_text(text: str) -> str:
    """Clean and normalize text for analysis."""
    # Convert to lowercase
    text = text.lower()

    # Remove special characters but keep important ones
    text = re.sub(r'[^a-zA-Z0-9\s\-\+\#\.]', ' ', text)

    # Tokenize
    tokens = word_tokenize(text)

    # Remove stopwords and lemmatize
    tokens = [lemmatizer.lemmatize(token) for token in tokens
              if token not in stop_words and len(token) > 2]

    return ' '.join(tokens)


def extract_skills(text: str) -> List[str]:
    """Extract technical skills and keywords from text."""
    # Common tech skills patterns
    skill_patterns = [
        # Programming languages
        r'\b(python|java|javascript|typescript|c\+\+|c#|ruby|go|rust|scala|kotlin|swift|php|r)\b',
        # Frameworks
        r'\b(react|angular|vue|django|flask|spring|node\.?js|express|fastapi|tensorflow|pytorch|keras)\b',
        # Cloud & DevOps
        r'\b(aws|azure|gcp|docker|kubernetes|k8s|terraform|jenkins|gitlab|github|ci/cd)\b',
        # Data & ML
        r'\b(machine learning|deep learning|nlp|computer vision|data science|sql|nosql|mongodb|postgresql|redis)\b',
        # General skills
        r'\b(agile|scrum|rest api|microservices|graphql|git|linux|unix)\b',
    ]

    text_lower = text.lower()
    skills = set()

    for pattern in skill_patterns:
        matches = re.findall(pattern, text_lower)
        skills.update(matches)

    return list(skills)


def extract_experience_years(text: str) -> Optional[int]:
    """Extract years of experience from text."""
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
        r'experience\s*(?:of\s*)?(\d+)\+?\s*years?',
        r'(\d+)\+?\s*years?\s*(?:in\s*)?(?:the\s*)?(?:industry|field)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return int(match.group(1))

    return None


def calculate_keyword_match(resume_text: str, job_text: str) -> tuple:
    """Calculate keyword matching using TF-IDF and cosine similarity."""
    # Preprocess texts
    resume_processed = preprocess_text(resume_text)
    job_processed = preprocess_text(job_text)

    # Create TF-IDF vectors
    vectorizer = TfidfVectorizer(max_features=100)
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_processed, job_processed])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except ValueError:
        similarity = 0.0

    # Get feature names for keyword analysis
    feature_names = vectorizer.get_feature_names_out() if hasattr(vectorizer, 'get_feature_names_out') else []

    # Find matched and missing keywords
    resume_words = set(resume_processed.split())
    job_words = set(job_processed.split())

    # Important job keywords (high TF-IDF in job description)
    job_tfidf = tfidf_matrix.toarray()[1] if tfidf_matrix.shape[0] > 1 else []
    important_keywords = []
    if len(job_tfidf) > 0:
        keyword_scores = list(zip(feature_names, job_tfidf))
        keyword_scores.sort(key=lambda x: x[1], reverse=True)
        important_keywords = [kw for kw, score in keyword_scores[:20] if score > 0]

    matched = [kw for kw in important_keywords if kw in resume_words]
    missing = [kw for kw in important_keywords if kw not in resume_words]

    return similarity * 100, matched, missing


def calculate_skills_match(resume_skills: List[str], job_skills: List[str]) -> float:
    """Calculate the percentage of required skills present in resume."""
    if not job_skills:
        return 100.0

    matched = len(set(resume_skills) & set(job_skills))
    return (matched / len(job_skills)) * 100


def calculate_formatting_score(text: str) -> float:
    """Evaluate resume formatting quality."""
    score = 100.0

    # Check for common sections
    sections = ['experience', 'education', 'skills', 'summary', 'objective', 'projects']
    found_sections = sum(1 for section in sections if section in text.lower())
    section_score = (found_sections / len(sections)) * 30

    # Check for contact info patterns
    has_email = bool(re.search(r'\b[\w.-]+@[\w.-]+\.\w+\b', text))
    has_phone = bool(re.search(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', text))
    contact_score = (has_email * 15) + (has_phone * 15)

    # Check text length (too short or too long)
    word_count = len(text.split())
    if word_count < 200:
        length_score = 20
    elif word_count > 2000:
        length_score = 30
    else:
        length_score = 40

    return section_score + contact_score + length_score


def generate_recommendations(
    score: float,
    missing_keywords: List[str],
    formatting_score: float,
    skills_match: float
) -> List[str]:
    """Generate actionable recommendations for resume improvement."""
    recommendations = []

    if missing_keywords[:5]:
        keywords_str = ', '.join(missing_keywords[:5])
        recommendations.append(f"Add these important keywords: {keywords_str}")

    if skills_match < 70:
        recommendations.append("Highlight more technical skills that match the job requirements")

    if formatting_score < 70:
        recommendations.append("Improve resume structure with clear sections (Experience, Education, Skills)")

    if score < 60:
        recommendations.append("Consider tailoring your resume more specifically to this job description")
    elif score < 80:
        recommendations.append("Good match! Minor keyword optimizations could improve your score")
    elif score < 90:
        recommendations.append("Strong match! Fine-tune keyword placement for optimal ATS parsing")

    if not recommendations:
        recommendations.append("Excellent resume! Meets ATS requirements for auto-submission")

    return recommendations


def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ats-scoring"}


@app.post("/score", response_model=ScoreResponse)
async def score_resume(request: ScoreRequest):
    """
    Score a resume against a job description.

    Returns an ATS compatibility score and detailed analysis.
    Resumes scoring >= 90% are flagged for auto-submission.
    """
    resume_text = request.resume_text
    job_description = request.job_description
    job_requirements = request.job_requirements or []

    # Extract skills
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_description)
    if job_requirements:
        job_skills.extend([skill.lower() for skill in job_requirements])
    job_skills = list(set(job_skills))

    # Calculate scores
    keyword_score, matched_keywords, missing_keywords = calculate_keyword_match(
        resume_text, job_description
    )
    skills_match = calculate_skills_match(resume_skills, job_skills)
    formatting_score = calculate_formatting_score(resume_text)

    # Experience matching (simplified)
    resume_exp = extract_experience_years(resume_text)
    job_exp = extract_experience_years(job_description)
    if resume_exp and job_exp:
        exp_ratio = min(resume_exp / job_exp, 1.5)
        experience_match = min(exp_ratio * 100, 100)
    else:
        experience_match = 70.0  # Default if can't extract

    # Calculate weighted final score
    final_score = (
        keyword_score * 0.35 +
        skills_match * 0.30 +
        experience_match * 0.20 +
        formatting_score * 0.15
    )

    # Generate recommendations
    recommendations = generate_recommendations(
        final_score, missing_keywords, formatting_score, skills_match
    )

    return ScoreResponse(
        score=round(final_score, 1),
        keyword_match=round(keyword_score, 1),
        skills_match=round(skills_match, 1),
        experience_match=round(experience_match, 1),
        formatting_score=round(formatting_score, 1),
        recommendations=recommendations,
        matched_keywords=matched_keywords[:10],
        missing_keywords=missing_keywords[:10],
        auto_submit=final_score >= ATS_THRESHOLD
    )


@app.post("/score/file")
async def score_resume_file(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    job_requirements: Optional[str] = Form(None)
):
    """
    Score an uploaded resume file against a job description.

    Supports PDF and DOCX formats.
    """
    # Validate file type
    filename = file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.docx')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF or DOCX."
        )

    # Read file content
    file_bytes = await file.read()

    # Extract text based on file type
    if filename.endswith('.pdf'):
        resume_text = extract_text_from_pdf(file_bytes)
    else:
        resume_text = extract_text_from_docx(file_bytes)

    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from file. Please ensure it's not scanned/image-based."
        )

    # Parse requirements if provided
    requirements_list = None
    if job_requirements:
        try:
            requirements_list = json.loads(job_requirements)
        except json.JSONDecodeError:
            requirements_list = [r.strip() for r in job_requirements.split(',')]

    # Score the resume
    request = ScoreRequest(
        resume_text=resume_text,
        job_description=job_description,
        job_requirements=requirements_list
    )

    return await score_resume(request)


@app.post("/process-task")
async def process_ats_task(request: TaskScoreRequest):
    """
    Process an ATS scoring task from the queue.

    This endpoint is called by the worker service to process
    candidate-job matching tasks.
    """
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get candidate resume
        cur.execute(
            "SELECT name, resume_url FROM candidates WHERE id = %s",
            (request.candidate_id,)
        )
        candidate = cur.fetchone()
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        # Get job description
        cur.execute(
            "SELECT title, company, description, requirements FROM jobs WHERE id = %s",
            (request.job_id,)
        )
        job = cur.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # For now, use placeholder text (in production, fetch from MinIO)
        # This would be replaced with actual resume text extraction
        resume_text = f"Resume for {candidate['name']}"

        # Score the resume
        score_request = ScoreRequest(
            resume_text=resume_text,
            job_description=job['description'] or '',
            job_requirements=job['requirements'] or []
        )

        # Calculate score
        result = await score_resume(score_request)

        # Update task with score
        cur.execute("""
            UPDATE ats_tasks
            SET original_ats_score = %s,
                status = CASE WHEN %s >= %s THEN 'completed' ELSE 'queued' END,
                updated_at = NOW()
            WHERE id = %s
            RETURNING *
        """, (result.score, result.score, ATS_THRESHOLD, request.task_id))

        task = cur.fetchone()
        conn.commit()

        # If auto-submit, create application
        if result.auto_submit:
            cur.execute("""
                INSERT INTO applications (candidate_id, job_id, ats_score, status)
                VALUES (%s, %s, %s, 'submitted')
                ON CONFLICT (candidate_id, job_id) DO NOTHING
            """, (request.candidate_id, request.job_id, result.score))
            conn.commit()

            # Publish event
            redis_client.publish('ats:auto_submitted', json.dumps({
                'task_id': request.task_id,
                'candidate_id': request.candidate_id,
                'job_id': request.job_id,
                'score': result.score
            }))
        else:
            # Queue for human review
            redis_client.publish('ats:needs_review', json.dumps({
                'task_id': request.task_id,
                'candidate_id': request.candidate_id,
                'job_id': request.job_id,
                'score': result.score
            }))

        return {
            "task_id": request.task_id,
            "score": result.score,
            "auto_submit": result.auto_submit,
            "status": "completed" if result.auto_submit else "queued_for_review"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@app.get("/stats")
async def get_scoring_stats():
    """Get ATS scoring statistics."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                COUNT(*) as total_tasks,
                AVG(original_ats_score) as avg_score,
                COUNT(CASE WHEN original_ats_score >= %s THEN 1 END) as auto_submitted,
                COUNT(CASE WHEN original_ats_score < %s THEN 1 END) as needs_review,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM ats_tasks
            WHERE created_at > NOW() - INTERVAL '7 days'
        """, (ATS_THRESHOLD, ATS_THRESHOLD))

        stats = cur.fetchone()

        return {
            "total_tasks": stats['total_tasks'],
            "average_score": round(float(stats['avg_score'] or 0), 1),
            "auto_submitted": stats['auto_submitted'],
            "needs_review": stats['needs_review'],
            "completed": stats['completed'],
            "threshold": ATS_THRESHOLD
        }

    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
