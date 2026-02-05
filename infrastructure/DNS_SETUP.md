# DNS Configuration for sparkworkforce.studio

## Option 1: GoDaddy DNS (If domain is registered at GoDaddy)

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains** → Click on `sparkworkforce.studio`
3. Click **DNS** or **Manage DNS**
4. Add/Edit these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `YOUR_SERVER_IP` | 600 |
| A | www | `YOUR_SERVER_IP` | 600 |
| A | dev | `YOUR_SERVER_IP` | 600 |
| A | qa | `YOUR_SERVER_IP` | 600 |

**Note**: Replace `YOUR_SERVER_IP` with your DigitalOcean droplet IP address.

## Option 2: DigitalOcean DNS

If you want DigitalOcean to manage your DNS:

### Step 1: Update Nameservers at GoDaddy

1. Go to GoDaddy → **Domains** → `sparkworkforce.studio`
2. Click **Manage** → **DNS** → **Nameservers**
3. Choose **Custom** and enter:
   - ns1.digitalocean.com
   - ns2.digitalocean.com
   - ns3.digitalocean.com

### Step 2: Add Domain in DigitalOcean

1. Go to [DigitalOcean Control Panel](https://cloud.digitalocean.com)
2. Click **Networking** → **Domains**
3. Add domain: `sparkworkforce.studio`
4. Create A records pointing to your droplet

## Verify DNS Propagation

After making changes, verify propagation:

```bash
# Check A record
nslookup sparkworkforce.studio

# Or use dig
dig sparkworkforce.studio +short

# Check from multiple locations
# https://www.whatsmydns.net/#A/sparkworkforce.studio
```

DNS changes can take 10 minutes to 48 hours to propagate globally.

## SSL Certificate

Once DNS is configured and propagated:

```bash
ssh deploy@YOUR_SERVER_IP
cd /opt/sparkworkforce/production
./scripts/init-ssl.sh
```

This will obtain a free SSL certificate from Let's Encrypt.

## Troubleshooting

### DNS Not Resolving

1. Wait longer (up to 48 hours for full propagation)
2. Clear local DNS cache:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemd-resolve --flush-caches`

### SSL Certificate Error

Make sure DNS is fully propagated before running SSL setup:

```bash
# Test DNS first
dig sparkworkforce.studio +short

# If it returns your server IP, proceed with SSL
./scripts/init-ssl.sh
```
