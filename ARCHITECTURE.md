# Job Application Management System - System Architecture

## Executive Summary
This document outlines the architectural design for the Job Application Management System. Designed with principles of high scalability, reliability, and fault tolerance (inspired by architectures like Uber and Netflix), this system manages the end-to-end flow of job discovery, candidate matching, and automated application.

## High-Level Architecture
The system follows a **Event-Driven Microservices Architecture**. This ensures that scraping, ATS scoring, and user interactions can scale independently.

### Core Services

1.  **Job Discovery Service (The "Scraper" Fleet)**
    *   **Responsibility:** Scrape jobs from LinkedIn, Indeed, Glassdoor, etc.
    *   **Design:** Distributed worker nodes using Headless Browsers (Selenium/Playwright) and API clients.
    *   **Scaling:** Horizontally scalable based on target site latency and rate limits.
    *   **Output:** Publishes `JobDiscovered` events to the Event Bus.

2.  **ATS Engine (The "Matcher")**
    *   **Responsibility:** Analyze resumes against Job Descriptions (JD).
    *   **Technology:** Python-based NLP service (using models like BERT or LLMs) to extract keywords and calculate semantic similarity.
    *   **Logic:**
        *   `Score >= 90%`: Publish `ApplicationApproved` event.
        *   `Score < 90%`: Publish `ManualReviewRequired` event.

3.  **Workflow & Task Engine**
    *   **Responsibility:** Manage human-in-the-loop processes.
    *   **Logic:**
        *   Listens for `ManualReviewRequired`.
        *   Assigns tasks to `Available` employees via WebSocket.
        *   Manages the 15-20 min timer.
        *   Handles Re-assignment (Queueing) and Violations (3 warnings policy).

4.  **Application Bot Service**
    *   **Responsibility:** Execute the final application on the job portal.
    *   **Trigger:** `ApplicationApproved` or `TaskCompleted` (by human).

5.  **API Gateway & Auth Service**
    *   **Responsibility:** Unified entry point for the Frontend (Web/Mobile).
    *   **Features:** WebSocket termination for real-time dashboard updates.

## Data Flow

1.  **Ingestion:** Scrapers -> Kafka Topic (`jobs.raw`) -> Job Service (deduplication) -> DB.
2.  **Matching:** Job Service -> Kafka Topic (`jobs.new`) -> ATS Engine -> Score Calculation.
3.  **Decision:**
    *   **High Score:** -> Application Service -> Apply.
    *   **Low Score:** -> Task Engine -> Redis Queue -> WebSocket -> Employee UI.
4.  **Resolution:** Employee Updates Resume -> S3 (New Version) -> Task Engine -> Application Service.

## Technology Stack

*   **Frontend:** React, TypeScript, Tailwind CSS (Existing).
*   **Backend Runtime:** Node.js (API/WebSockets), Python (AI/Scrapers).
*   **Database:** PostgreSQL (Relational Data), MongoDB (Unstructured Job Data).
*   **Message Broker:** RabbitMQ or Apache Kafka.
*   **Caching/Real-time:** Redis.
*   **Infrastructure:** Docker, Kubernetes (K8s).

## Scalability & Reliability Pattern

*   **Circuit Breakers:** Prevent cascading failures if a job portal blocks our scrapers.
*   **Dead Letter Queues (DLQ):** Capture failed applications for retry/analysis.
*   **Rate Limiting:** Per-portal throttling to avoid IP bans.
*   **Sharding:** Database sharding by `Region` or `JobCategory` for massive scale.

## "Human-in-the-Loop" Logic (The Uber Model)

Similar to how Uber assigns drivers:
1.  **Presence:** System tracks Employee WebSocket heartbeat (Green/Online).
2.  **Assignment:** Round-robin or Load-balanced assignment to `Available` agents.
3.  **SLA Enforcement:**
    *   Timer starts on assignment.
    *   At `T-5m`: Warning notification.
    *   At `T=0`: Task revoked, marked as "Missed", re-queued. Employee gets a "Strike".
    *   **Strike System:** 3 Strikes = Warning, 4th = Violation (Account Lock/Review).

## Analytics Dashboard
Aggregates real-time streams into:
*   **Live Metrics:** Active Scrapers, Jobs Found/Min, Pending Reviews.
*   **Business KPIs:** Auto-Apply Rate vs. Manual Intervention Rate.
