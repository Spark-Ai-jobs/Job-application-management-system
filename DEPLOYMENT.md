# SparkWorkforce Deployment Guide

## Overview

This guide covers deploying SparkWorkforce to production at **sparkworkforce.studio**.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              sparkworkforce.studio          │
                    │                  (Domain)                    │
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────────┐
                    │              Nginx Reverse Proxy             │
                    │         (SSL Termination, Load Balance)      │
                    └─────────────────┬───────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
    ┌───────────┐            ┌───────────────┐            ┌──────────────┐
    │  Frontend │            │  API Gateway  │◄──────────►│   WebSocket  │
    │  (React)  │            │   (Express)   │            │   Server     │
    └───────────┘            └───────┬───────┘            └──────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌───────────┐            ┌───────────────┐            ┌──────────────┐
   │    ATS    │            │   Scraper     │            │   Worker     │
   │  Service  │            │   Service     │            │   Service    │
   └───────────┘            └───────────────┘            └──────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
   ┌───────────┐            ┌───────────────┐            ┌──────────────┐
   │ PostgreSQL│            │     Redis     │            │    MinIO     │
   │    DB     │            │  Cache/Queue  │            │   Storage    │
   └───────────┘            └───────────────┘            └──────────────┘
```

## Environments

| Branch | Environment | Domain |
|--------|-------------|--------|
| `main` | Production | sparkworkforce.studio |
| `qa` | QA/Staging | qa.sparkworkforce.studio |
| `dev` | Development | dev.sparkworkforce.studio |

## Prerequisites

- Ubuntu 22.04+ server (recommended: 4GB RAM, 2 vCPU minimum)
- Docker & Docker Compose installed
- Domain DNS configured (A record pointing to server IP)
- Ports 80 and 443 open

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Spark-Ai-jobs/Job-application-management-system.git
cd Job-application-management-system
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your secure values
nano .env
```

**Required Environment Variables:**

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | PostgreSQL database password |
| `REDIS_PASSWORD` | Redis authentication password |
| `MINIO_ROOT_USER` | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | MinIO admin password |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) |

### 3. Setup SSL Certificate

```bash
# Make script executable
chmod +x scripts/init-ssl.sh

# Run SSL setup (requires domain DNS to be configured)
./scripts/init-ssl.sh
```

### 4. Deploy

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes two GitHub Actions workflows:

#### CI Pipeline (`.github/workflows/ci.yml`)
- Triggered on: Push/PR to `main`, `qa`, `dev`
- Steps:
  1. Lint and build frontend
  2. Build and test all backend services
  3. Build Docker images (without push)

#### CD Pipeline (`.github/workflows/cd.yml`)
- Triggered on: Push to `main`, `qa`, `dev`
- Steps:
  1. Build and push Docker images to GitHub Container Registry
  2. Deploy to appropriate environment via SSH

### Required GitHub Secrets

Configure these in your repository settings:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key for deployment |
| `SLACK_WEBHOOK` | (Optional) Slack webhook for notifications |

### Setting Up Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add each secret with **New repository secret**

## Manual Deployment

### Pull and Deploy Latest Images

```bash
cd /opt/sparkworkforce/production

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Deploy with zero-downtime
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Check status
docker compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api-gateway
```

### Database Backup

```bash
# Create backup
docker exec spark_postgres pg_dump -U spark spark_ai > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i spark_postgres psql -U spark spark_ai < backup.sql
```

## DNS Configuration

Add these DNS records for your domain:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `<server-ip>` | 300 |
| A | www | `<server-ip>` | 300 |
| A | dev | `<server-ip>` | 300 |
| A | qa | `<server-ip>` | 300 |

## SSL Certificate Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Troubleshooting

### Service Not Starting

```bash
# Check service logs
docker logs spark_api

# Check container status
docker ps -a | grep spark
```

### Database Connection Issues

```bash
# Test database connection
docker exec spark_postgres psql -U spark -d spark_ai -c "SELECT 1"

# Check database logs
docker logs spark_postgres
```

### SSL Certificate Issues

```bash
# Test certificate
openssl s_client -connect sparkworkforce.studio:443 -servername sparkworkforce.studio

# Re-run SSL setup
STAGING=1 ./scripts/init-ssl.sh  # Use staging for testing
```

## Monitoring

### Health Checks

- Frontend: `https://sparkworkforce.studio/health`
- API: `https://sparkworkforce.studio/api/health`

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Configure firewall (UFW: allow 80, 443, 22)
- [ ] Enable fail2ban for SSH protection
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Enable monitoring/alerting

## Support

For issues, please open a ticket at:
https://github.com/Spark-Ai-jobs/Job-application-management-system/issues
