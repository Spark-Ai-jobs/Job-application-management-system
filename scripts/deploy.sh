#!/bin/bash
# ============================================
# SparkWorkforce Deployment Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.prod.yml"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}SparkWorkforce Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}============================================${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure your secrets."
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "REDIS_PASSWORD"
    "MINIO_ROOT_USER"
    "MINIO_ROOT_PASSWORD"
    "JWT_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}Environment validation passed${NC}"

# Pull latest images
echo -e "${YELLOW}Pulling latest Docker images...${NC}"
docker compose -f $COMPOSE_FILE pull

# Create backup of database (if exists)
if docker ps -q -f name=spark_postgres &>/dev/null; then
    echo -e "${YELLOW}Creating database backup...${NC}"
    BACKUP_FILE="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    docker exec spark_postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > $BACKUP_FILE
    echo -e "${GREEN}Backup saved to: $BACKUP_FILE${NC}"
fi

# Deploy with zero-downtime
echo -e "${YELLOW}Deploying services...${NC}"
docker compose -f $COMPOSE_FILE up -d --remove-orphans

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

# Health checks
echo -e "${YELLOW}Running health checks...${NC}"

services=("spark_nginx" "spark_frontend" "spark_api" "spark_postgres" "spark_redis")
all_healthy=true

for service in "${services[@]}"; do
    if docker ps -q -f name=$service &>/dev/null; then
        status=$(docker inspect --format='{{.State.Health.Status}}' $service 2>/dev/null || echo "running")
        if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
            echo -e "${GREEN}✓ $service is $status${NC}"
        else
            echo -e "${RED}✗ $service is $status${NC}"
            all_healthy=false
        fi
    else
        echo -e "${RED}✗ $service is not running${NC}"
        all_healthy=false
    fi
done

# Final status
echo ""
if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}Application: https://${DOMAIN:-sparkworkforce.studio}${NC}"
    echo -e "${GREEN}============================================${NC}"
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}Deployment completed with issues${NC}"
    echo -e "${RED}Check logs: docker compose -f $COMPOSE_FILE logs${NC}"
    echo -e "${RED}============================================${NC}"
    exit 1
fi

# Clean up old images
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}Done!${NC}"
