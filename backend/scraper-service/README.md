# Job Discovery Service (Scraper Fleet)

## Overview
This service is responsible for aggregating job postings from multiple external sources (LinkedIn, Indeed, Glassdoor, etc.). It operates as a distributed fleet of worker nodes to handle high volume and avoid rate limits.

## Architecture
- **Headless Browsers:** Uses Playwright/Selenium for dynamic content.
- **Proxy Rotation:** Integrated with a rotating proxy service to prevent IP bans.
- **Deduplication:** Uses a Redis Bloom Filter to avoid processing the same job URL twice.

## Events
- Publishes: `JobDiscovered` { title, company, description, url, source, postedDate }

## Tech Stack
- Python
- Scrapy / Playwright
- Kafka Producer
