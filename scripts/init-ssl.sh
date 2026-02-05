#!/bin/bash
# ============================================
# SSL Certificate Initialization Script
# for sparkworkforce.studio
# ============================================

set -e

DOMAIN="sparkworkforce.studio"
EMAIL="${SSL_EMAIL:-admin@sparkworkforce.studio}"
STAGING=${STAGING:-0}  # Set to 1 for testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}SparkWorkforce SSL Certificate Setup${NC}"
echo -e "${GREEN}============================================${NC}"

# Create required directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Check if certificates already exist
if [ -d "./certbot/conf/live/$DOMAIN" ]; then
    echo -e "${YELLOW}Certificates already exist for $DOMAIN${NC}"
    read -p "Do you want to renew them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 0
    fi
fi

# Start nginx for ACME challenge
echo -e "${YELLOW}Starting nginx for ACME challenge...${NC}"

# Create temporary nginx config for initial certificate
cat > ./nginx/nginx.init.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name sparkworkforce.studio www.sparkworkforce.studio;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SparkWorkforce - SSL Setup in Progress';
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Run temporary nginx container
docker run -d --rm \
    --name spark_nginx_init \
    -v $(pwd)/nginx/nginx.init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -p 80:80 \
    nginx:alpine

echo -e "${YELLOW}Waiting for nginx to start...${NC}"
sleep 5

# Staging flag for Let's Encrypt
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    STAGING_FLAG="--staging"
    echo -e "${YELLOW}Using Let's Encrypt staging environment${NC}"
fi

# Request certificate
echo -e "${YELLOW}Requesting SSL certificate from Let's Encrypt...${NC}"
docker run --rm \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_FLAG \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop temporary nginx
echo -e "${YELLOW}Stopping temporary nginx...${NC}"
docker stop spark_nginx_init 2>/dev/null || true

# Clean up temp config
rm -f ./nginx/nginx.init.conf

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}SSL Certificate setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Certificate location: ./certbot/conf/live/$DOMAIN/"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy .env.example to .env and configure your secrets"
echo "2. Run: docker compose -f docker-compose.prod.yml up -d"
echo ""
