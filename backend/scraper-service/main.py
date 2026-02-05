"""
Job Scraper Service

This service scrapes job listings from multiple sources:
- LinkedIn
- Indeed
- Glassdoor

Jobs are categorized into: AI/ML, Data Science, Software Engineering,
DevOps, Product, Design, and Other.
"""

import os
import re
import json
import asyncio
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from bs4 import BeautifulSoup
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fake_useragent import UserAgent

# Initialize FastAPI app
app = FastAPI(
    title="Spark.AI Job Scraper Service",
    description="Multi-source job scraping service",
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
SCRAPE_INTERVAL_HOURS = int(os.getenv("SCRAPE_INTERVAL_HOURS", "6"))

# Redis client
redis_client = redis.from_url(REDIS_URL)

# User agent rotation
ua = UserAgent()

# Scheduler
scheduler = AsyncIOScheduler()


class JobSource(str, Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    MANUAL = "manual"


class JobCategory(str, Enum):
    AI_ML = "AI/ML"
    DATA_SCIENCE = "Data Science"
    SOFTWARE_ENGINEERING = "Software Engineering"
    DEVOPS = "DevOps"
    PRODUCT = "Product"
    DESIGN = "Design"
    OTHER = "Other"


# Category classification keywords
CATEGORY_KEYWORDS = {
    JobCategory.AI_ML: [
        'machine learning', 'deep learning', 'artificial intelligence', 'ai/ml',
        'neural network', 'nlp', 'natural language', 'computer vision', 'ml engineer',
        'ai engineer', 'research scientist', 'tensorflow', 'pytorch', 'llm'
    ],
    JobCategory.DATA_SCIENCE: [
        'data scientist', 'data science', 'analytics', 'data analyst',
        'business intelligence', 'bi analyst', 'statistical', 'predictive modeling',
        'data mining', 'a/b testing'
    ],
    JobCategory.SOFTWARE_ENGINEERING: [
        'software engineer', 'developer', 'full stack', 'frontend', 'backend',
        'web developer', 'mobile developer', 'ios', 'android', 'react', 'node',
        'java developer', 'python developer', 'sde', 'software development'
    ],
    JobCategory.DEVOPS: [
        'devops', 'sre', 'site reliability', 'infrastructure', 'platform engineer',
        'cloud engineer', 'kubernetes', 'docker', 'aws', 'azure', 'gcp',
        'ci/cd', 'terraform', 'ansible'
    ],
    JobCategory.PRODUCT: [
        'product manager', 'product owner', 'product lead', 'program manager',
        'technical program', 'product strategy', 'roadmap'
    ],
    JobCategory.DESIGN: [
        'ux designer', 'ui designer', 'product designer', 'visual designer',
        'user experience', 'user interface', 'design system', 'figma'
    ]
}


class ScrapingRequest(BaseModel):
    source: JobSource
    search_query: str = Field(default="software engineer")
    location: str = Field(default="Remote")
    max_results: int = Field(default=50, ge=1, le=200)


class JobListing(BaseModel):
    title: str
    company: str
    location: str
    salary_range: Optional[str] = None
    job_type: str = "full-time"
    experience_level: str = "mid"
    category: str
    source: str
    source_url: str
    description: str
    requirements: List[str] = []
    posted_at: Optional[datetime] = None


class ScrapingStatus(BaseModel):
    source: str
    status: str
    jobs_found: int
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    error: Optional[str] = None


def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def classify_job_category(title: str, description: str = "") -> str:
    """Classify job into a category based on title and description."""
    combined_text = f"{title} {description}".lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in combined_text:
                return category.value

    return JobCategory.OTHER.value


def generate_job_hash(title: str, company: str, source: str) -> str:
    """Generate unique hash for job deduplication."""
    content = f"{title.lower()}{company.lower()}{source}"
    return hashlib.md5(content.encode()).hexdigest()


def extract_salary_range(text: str) -> Optional[str]:
    """Extract salary information from job text."""
    patterns = [
        r'\$[\d,]+\s*[-–]\s*\$[\d,]+(?:\s*(?:per year|/year|annually|/yr))?',
        r'\$[\d,]+k?\s*[-–]\s*\$[\d,]+k?',
        r'(?:USD|CAD)?\s*[\d,]+\s*[-–]\s*[\d,]+(?:\s*(?:per year|/year))?',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)

    return None


def extract_experience_level(title: str, description: str) -> str:
    """Extract experience level from job posting."""
    combined = f"{title} {description}".lower()

    if any(word in combined for word in ['senior', 'sr.', 'sr ', 'lead', 'principal', 'staff']):
        return 'senior'
    elif any(word in combined for word in ['junior', 'jr.', 'jr ', 'entry', 'associate', 'graduate']):
        return 'junior'
    elif any(word in combined for word in ['intern', 'internship', 'co-op']):
        return 'intern'
    elif any(word in combined for word in ['manager', 'director', 'head of', 'vp']):
        return 'management'

    return 'mid'


def extract_requirements(description: str) -> List[str]:
    """Extract job requirements from description."""
    requirements = []

    # Look for requirements sections
    patterns = [
        r'(?:requirements?|qualifications?|what you.ll need|you have|must have)[:\s]*(.+?)(?=\n\n|\Z)',
        r'(?:you (?:will|should) have|we.re looking for)[:\s]*(.+?)(?=\n\n|\Z)',
    ]

    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE | re.DOTALL)
        if match:
            req_text = match.group(1)
            # Split by bullet points or newlines
            items = re.split(r'[\n•\-\*]', req_text)
            requirements.extend([item.strip() for item in items if len(item.strip()) > 10])
            break

    return requirements[:10]  # Limit to 10 requirements


async def scrape_mock_jobs(
    source: JobSource,
    query: str,
    location: str,
    max_results: int
) -> List[Dict[str, Any]]:
    """
    Mock scraper for demonstration purposes.

    In production, this would be replaced with actual scrapers for each source.
    Note: Web scraping may violate terms of service of these platforms.
    Consider using official APIs where available.
    """
    jobs = []

    # Generate mock job data based on source
    companies = {
        JobSource.LINKEDIN: ['Google', 'Meta', 'Microsoft', 'Amazon', 'Apple', 'Netflix'],
        JobSource.INDEED: ['IBM', 'Oracle', 'Salesforce', 'Adobe', 'VMware', 'Cisco'],
        JobSource.GLASSDOOR: ['Uber', 'Lyft', 'Airbnb', 'Stripe', 'Square', 'Spotify'],
    }

    titles = [
        'Senior Machine Learning Engineer',
        'Data Scientist',
        'Software Engineer',
        'DevOps Engineer',
        'Product Manager',
        'Full Stack Developer',
        'AI Research Scientist',
        'Backend Engineer',
        'Frontend Developer',
        'Cloud Infrastructure Engineer',
    ]

    locations = ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Remote']

    for i in range(min(max_results, 10)):
        company = companies.get(source, ['TechCorp'])[i % len(companies.get(source, ['TechCorp']))]
        title = titles[i % len(titles)]
        loc = locations[i % len(locations)] if location == 'Remote' else location

        description = f"""
        We are looking for a talented {title} to join our team at {company}.

        About the Role:
        You will work on cutting-edge technology and collaborate with world-class engineers.

        Requirements:
        - 3+ years of relevant experience
        - Strong programming skills in Python, Java, or similar
        - Experience with cloud platforms (AWS, GCP, Azure)
        - Excellent communication skills
        - Bachelor's degree in Computer Science or related field

        Benefits:
        - Competitive salary and equity
        - Health, dental, and vision insurance
        - Flexible work arrangements
        - Professional development budget
        """

        jobs.append({
            'title': title,
            'company': company,
            'location': loc,
            'salary_range': f'${120 + i * 10},000 - ${180 + i * 10},000',
            'job_type': 'full-time',
            'experience_level': extract_experience_level(title, description),
            'category': classify_job_category(title, description),
            'source': source.value,
            'source_url': f'https://{source.value}.com/jobs/{i + 1000}',
            'description': description.strip(),
            'requirements': extract_requirements(description),
            'posted_at': datetime.utcnow() - timedelta(days=i),
        })

    return jobs


async def save_jobs_to_db(jobs: List[Dict[str, Any]]) -> int:
    """Save scraped jobs to database, handling duplicates."""
    conn = None
    saved_count = 0

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        for job in jobs:
            job_hash = generate_job_hash(job['title'], job['company'], job['source'])

            # Check for duplicate using hash
            cur.execute(
                "SELECT id FROM jobs WHERE source = %s AND source_url = %s",
                (job['source'], job['source_url'])
            )

            if cur.fetchone():
                continue  # Skip duplicate

            cur.execute("""
                INSERT INTO jobs (
                    title, company, location, salary_range, job_type,
                    experience_level, category, source, source_url,
                    description, requirements, posted_at, scraped_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
            """, (
                job['title'],
                job['company'],
                job['location'],
                job.get('salary_range'),
                job.get('job_type', 'full-time'),
                job.get('experience_level', 'mid'),
                job['category'],
                job['source'],
                job['source_url'],
                job['description'],
                job.get('requirements', []),
                job.get('posted_at', datetime.utcnow()),
            ))

            saved_count += 1

        conn.commit()

        # Publish event
        redis_client.publish('scraper:jobs_added', json.dumps({
            'count': saved_count,
            'source': jobs[0]['source'] if jobs else 'unknown'
        }))

        return saved_count

    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


async def run_scraping_job(source: JobSource):
    """Run scraping job for a specific source."""
    try:
        # Update status to running
        redis_client.hset(f'scraper:status:{source.value}', mapping={
            'status': 'running',
            'started_at': datetime.utcnow().isoformat()
        })

        # Run scraper
        jobs = await scrape_mock_jobs(
            source=source,
            query="software engineer",
            location="Remote",
            max_results=50
        )

        # Save to database
        saved_count = await save_jobs_to_db(jobs)

        # Update status
        redis_client.hset(f'scraper:status:{source.value}', mapping={
            'status': 'completed',
            'jobs_found': len(jobs),
            'jobs_saved': saved_count,
            'last_run': datetime.utcnow().isoformat(),
            'error': ''
        })

        return saved_count

    except Exception as e:
        redis_client.hset(f'scraper:status:{source.value}', mapping={
            'status': 'error',
            'error': str(e),
            'last_run': datetime.utcnow().isoformat()
        })
        raise


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup."""
    # Schedule scraping jobs
    for source in [JobSource.LINKEDIN, JobSource.INDEED, JobSource.GLASSDOOR]:
        scheduler.add_job(
            run_scraping_job,
            'interval',
            hours=SCRAPE_INTERVAL_HOURS,
            args=[source],
            id=f'scrape_{source.value}',
            replace_existing=True
        )

    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler."""
    scheduler.shutdown()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "job-scraper"}


@app.post("/scrape")
async def trigger_scrape(
    request: ScrapingRequest,
    background_tasks: BackgroundTasks
):
    """Trigger a scraping job for the specified source."""
    # Check if already running
    status = redis_client.hgetall(f'scraper:status:{request.source.value}')
    if status and status.get(b'status') == b'running':
        raise HTTPException(
            status_code=409,
            detail=f"Scraping already in progress for {request.source.value}"
        )

    # Run in background
    background_tasks.add_task(run_scraping_job, request.source)

    return {
        "message": f"Scraping job started for {request.source.value}",
        "search_query": request.search_query,
        "location": request.location,
        "max_results": request.max_results
    }


@app.post("/scrape/all")
async def trigger_scrape_all(background_tasks: BackgroundTasks):
    """Trigger scraping for all sources."""
    for source in [JobSource.LINKEDIN, JobSource.INDEED, JobSource.GLASSDOOR]:
        background_tasks.add_task(run_scraping_job, source)

    return {"message": "Scraping started for all sources"}


@app.get("/status")
async def get_scraping_status() -> List[ScrapingStatus]:
    """Get status of all scrapers."""
    statuses = []

    for source in [JobSource.LINKEDIN, JobSource.INDEED, JobSource.GLASSDOOR]:
        status_data = redis_client.hgetall(f'scraper:status:{source.value}')

        if status_data:
            statuses.append(ScrapingStatus(
                source=source.value,
                status=status_data.get(b'status', b'idle').decode(),
                jobs_found=int(status_data.get(b'jobs_found', b'0')),
                last_run=datetime.fromisoformat(status_data[b'last_run'].decode())
                    if b'last_run' in status_data else None,
                next_run=scheduler.get_job(f'scrape_{source.value}').next_run_time
                    if scheduler.get_job(f'scrape_{source.value}') else None,
                error=status_data.get(b'error', b'').decode() or None
            ))
        else:
            job = scheduler.get_job(f'scrape_{source.value}')
            statuses.append(ScrapingStatus(
                source=source.value,
                status='idle',
                jobs_found=0,
                last_run=None,
                next_run=job.next_run_time if job else None
            ))

    return statuses


@app.get("/stats")
async def get_scraping_stats():
    """Get overall scraping statistics."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                source,
                COUNT(*) as total,
                COUNT(CASE WHEN scraped_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                COUNT(CASE WHEN scraped_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
            FROM jobs
            GROUP BY source
        """)

        by_source = {}
        for row in cur.fetchall():
            by_source[row['source']] = {
                'total': row['total'],
                'last_24h': row['last_24h'],
                'last_7d': row['last_7d']
            }

        cur.execute("""
            SELECT category, COUNT(*) as count
            FROM jobs
            WHERE is_active = true
            GROUP BY category
            ORDER BY count DESC
        """)

        by_category = {row['category']: row['count'] for row in cur.fetchall()}

        cur.execute("SELECT COUNT(*) as total FROM jobs WHERE is_active = true")
        total = cur.fetchone()['total']

        return {
            "total_active_jobs": total,
            "by_source": by_source,
            "by_category": by_category,
            "scrape_interval_hours": SCRAPE_INTERVAL_HOURS
        }

    finally:
        if conn:
            conn.close()


@app.post("/jobs/manual")
async def add_manual_job(job: JobListing):
    """Manually add a job listing."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO jobs (
                title, company, location, salary_range, job_type,
                experience_level, category, source, source_url,
                description, requirements, posted_at, scraped_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            RETURNING id
        """, (
            job.title,
            job.company,
            job.location,
            job.salary_range,
            job.job_type,
            job.experience_level,
            job.category or classify_job_category(job.title, job.description),
            'manual',
            job.source_url,
            job.description,
            job.requirements,
            job.posted_at or datetime.utcnow(),
        ))

        job_id = cur.fetchone()['id']
        conn.commit()

        return {"id": job_id, "message": "Job added successfully"}

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
