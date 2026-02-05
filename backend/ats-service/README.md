# ATS Engine (Matching Service)

## Overview
The core intelligence of the platform. This service compares Candidate Resumes against Job Descriptions to determine suitability.

## Logic
1.  **Parsing:** Extracts text from PDF/Docx resumes.
2.  **NLP Analysis:** Uses Named Entity Recognition (NER) to extract Skills, Experience, and Education.
3.  **Scoring:** Calculates a cosine similarity score between the Candidate Vector and Job Vector.
4.  **Threshold Enforcement:**
    - `Score >= 90%`: Approves for Auto-Application.
    - `Score < 90%`: Flags for Manual Review (Human-in-the-Loop).

## Tech Stack
- Python (FastAPI)
- PyTorch / Transformers (BERT)
- Spacy (NLP)
