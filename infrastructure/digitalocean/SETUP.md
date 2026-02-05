# SparkWorkforce - DigitalOcean Deployment Guide

## Quick Start (15 minutes)

### Step 1: Create a DigitalOcean Account
1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Sign up (you get $200 free credit for 60 days)

### Step 2: Create a Droplet

1. Click **Create** → **Droplets**
2. Choose settings:
   - **Region**: Choose closest to your users (e.g., New York, London)
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic → Regular → **$24/mo** (4GB RAM, 2 vCPU) - minimum recommended
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `sparkworkforce-prod`

3. **Advanced Options** → Check "Add User Data"
4. Paste the contents of `cloud-init.yaml` into the User Data field

5. Click **Create Droplet**

### Step 3: Configure DNS

1. Go to **Networking** → **Domains**
2. Add your domain: `sparkworkforce.studio`
3. Create these DNS records:

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| A | @ | `<droplet-ip>` | 300 |
| A | www | `<droplet-ip>` | 300 |
| A | dev | `<droplet-ip>` | 300 |
| A | qa | `<droplet-ip>` | 300 |

**Note**: If your domain is registered elsewhere (GoDaddy, Namecheap, etc.), update nameservers to:
- ns1.digitalocean.com
- ns2.digitalocean.com
- ns3.digitalocean.com

Or create A records directly at your registrar pointing to the droplet IP.

### Step 4: SSH into Server

Wait 3-5 minutes for the droplet to initialize, then:

```bash
ssh deploy@<droplet-ip>
```

### Step 5: Configure Environment

```bash
cd /opt/sparkworkforce/production

# Generate secure passwords
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 24)"
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Edit .env with the generated passwords
nano .env
```

### Step 6: Setup SSL Certificate

```bash
cd /opt/sparkworkforce/production
chmod +x scripts/*.sh
./scripts/init-ssl.sh
```

### Step 7: Start the Application

```bash
# Pull Docker images
docker-compose -f docker-compose.prod.yml pull

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Step 8: Enable Auto-Start

```bash
sudo systemctl enable sparkworkforce
```

---

## Setup CI/CD Auto-Deployment

### Add GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `DEPLOY_HOST` | Your droplet IP address |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH key (see below) |

### Generate Deployment SSH Key

On your local machine:

```bash
# Generate new key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/sparkworkforce_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/sparkworkforce_deploy.pub deploy@<droplet-ip>

# Get private key for GitHub secret
cat ~/.ssh/sparkworkforce_deploy
```

Copy the entire private key (including `-----BEGIN` and `-----END` lines) to the `DEPLOY_SSH_KEY` secret.

---

## Verify Deployment

After setup, verify at:
- **Application**: https://sparkworkforce.studio
- **Health Check**: https://sparkworkforce.studio/health
- **API Health**: https://sparkworkforce.studio/api/health

---

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api-gateway
```

### Check Resource Usage

```bash
# Container stats
docker stats

# System resources
htop
```

### Manual Backup

```bash
docker exec spark_postgres pg_dump -U spark spark_ai > backup_$(date +%Y%m%d).sql
```

### Update Application

```bash
cd /opt/sparkworkforce/production
git pull
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Estimated Costs

| Resource | Cost/Month |
|----------|------------|
| Droplet (4GB/2vCPU) | $24 |
| Backup (optional) | $4.80 |
| **Total** | **~$28/month** |

For higher traffic, upgrade to:
- 8GB/4vCPU: $48/month
- 16GB/8vCPU: $96/month

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Re-run SSL setup
STAGING=1 ./scripts/init-ssl.sh  # Test first
./scripts/init-ssl.sh            # Production
```

### Database Connection Issues

```bash
docker logs spark_postgres
docker exec spark_postgres psql -U spark -d spark_ai -c "SELECT 1"
```

### Out of Memory

```bash
# Check memory
free -h

# Restart services
docker-compose -f docker-compose.prod.yml restart
```
