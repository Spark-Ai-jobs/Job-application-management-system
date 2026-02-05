# SparkWorkforce - AWS Deployment Guide

## Quick Start (20 minutes)

### Option A: AWS Console (Easiest)

#### Step 1: Launch EC2 Instance

1. Go to [AWS Console](https://console.aws.amazon.com/ec2)
2. Click **Launch Instance**
3. Configure:
   - **Name**: `sparkworkforce-prod`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type**: `t3.medium` (2 vCPU, 4GB RAM) - ~$30/month
     - Or `t3.small` for lighter workloads (~$15/month)
   - **Key pair**: Create or select existing
   - **Network settings**:
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
   - **Storage**: 30 GB gp3 SSD

4. **Advanced Details** → **User data** → Paste contents of `cloud-init.yaml`

5. Click **Launch Instance**

#### Step 2: Allocate Elastic IP (Static IP)

1. Go to **EC2** → **Elastic IPs**
2. Click **Allocate Elastic IP address**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. Select your instance → **Associate**

**Note the Elastic IP** - you'll need this for DNS.

#### Step 3: Configure Security Group

Ensure your security group has these rules:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP |
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

---

### Option B: AWS CLI (Advanced)

```bash
# Create security group
aws ec2 create-security-group \
  --group-name sparkworkforce-sg \
  --description "SparkWorkforce Security Group"

# Add rules
aws ec2 authorize-security-group-ingress \
  --group-name sparkworkforce-sg \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name sparkworkforce-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name sparkworkforce-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name your-key-name \
  --security-groups sparkworkforce-sg \
  --user-data file://cloud-init.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=sparkworkforce-prod}]'
```

---

## Step 4: Configure DNS (Route 53 or External)

### Using AWS Route 53

1. Go to **Route 53** → **Hosted zones**
2. Create hosted zone for `sparkworkforce.studio`
3. Add records:

| Type | Name | Value |
|------|------|-------|
| A | sparkworkforce.studio | `<Elastic IP>` |
| A | www.sparkworkforce.studio | `<Elastic IP>` |

4. Update nameservers at your domain registrar to Route 53 NS records

### Using External DNS (GoDaddy, etc.)

Add A records pointing to your Elastic IP:

| Type | Host | Points to |
|------|------|-----------|
| A | @ | `<Elastic IP>` |
| A | www | `<Elastic IP>` |

---

## Step 5: SSH and Configure

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<Elastic-IP>

# Switch to deploy user
sudo su - deploy

# Navigate to app directory
cd /opt/sparkworkforce/production

# Generate secure passwords
echo "POSTGRES_PASSWORD: $(openssl rand -base64 24)"
echo "REDIS_PASSWORD: $(openssl rand -base64 24)"
echo "MINIO_ROOT_PASSWORD: $(openssl rand -base64 24)"
echo "JWT_SECRET: $(openssl rand -base64 32)"

# Edit .env with generated passwords
nano .env
```

---

## Step 6: Setup SSL Certificate

```bash
cd /opt/sparkworkforce/production
chmod +x scripts/*.sh
./scripts/init-ssl.sh
```

---

## Step 7: Start Application

```bash
# Pull Docker images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Enable auto-start
sudo systemctl enable sparkworkforce

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## Step 8: Setup CI/CD (GitHub Actions)

### Create IAM User for Deployments (Optional)

1. Go to **IAM** → **Users** → **Add user**
2. Name: `github-actions-deploy`
3. Attach policy: `AmazonEC2FullAccess` (or create custom minimal policy)
4. Save Access Key ID and Secret

### Add GitHub Secrets

Go to your repository → **Settings** → **Secrets** → **Actions**

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Your Elastic IP |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | SSH private key |

### Generate SSH Key for Deployment

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/sparkworkforce_aws

# Copy public key to server
ssh -i your-key.pem ubuntu@<Elastic-IP> \
  "echo '$(cat ~/.ssh/sparkworkforce_aws.pub)' >> /home/deploy/.ssh/authorized_keys"

# The private key goes to DEPLOY_SSH_KEY secret
cat ~/.ssh/sparkworkforce_aws
```

---

## AWS Cost Estimate

| Resource | Specs | Cost/Month |
|----------|-------|------------|
| EC2 t3.medium | 2 vCPU, 4GB RAM | ~$30 |
| EC2 t3.small | 2 vCPU, 2GB RAM | ~$15 |
| Elastic IP | Static IP | Free (when attached) |
| EBS Storage | 30GB gp3 | ~$2.50 |
| Data Transfer | First 100GB | Free |
| **Total (medium)** | | **~$32/month** |
| **Total (small)** | | **~$18/month** |

### Free Tier (12 months)

If you're on AWS Free Tier:
- 750 hours/month t2.micro or t3.micro
- 30GB EBS storage
- **Could be FREE for first year** (but t2.micro may be underpowered)

---

## Verify Deployment

- **Application**: https://sparkworkforce.studio
- **Health Check**: https://sparkworkforce.studio/health

---

## Monitoring

### CloudWatch (Recommended)

1. Go to **CloudWatch** → **Alarms**
2. Create alarms for:
   - CPU Utilization > 80%
   - Memory Usage > 80%
   - Disk Space < 20%

### View Logs

```bash
# SSH into server
ssh -i your-key.pem ubuntu@<Elastic-IP>
sudo su - deploy
cd /opt/sparkworkforce/production

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f api-gateway
```

---

## Troubleshooting

### Can't SSH

```bash
# Check security group allows your IP on port 22
# Check key permissions
chmod 400 your-key.pem
```

### Application Not Starting

```bash
# Check Docker status
sudo systemctl status docker

# Check container logs
docker-compose -f docker-compose.prod.yml logs
```

### SSL Certificate Failed

```bash
# Ensure DNS is propagated
dig sparkworkforce.studio +short

# If DNS works, retry SSL
./scripts/init-ssl.sh
```
