# 🚀 Deployment Guide - AA Print N Tags

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Cloud VM / Container            │
│  ┌─────────┐    ┌──────────────┐   ┌─────────┐ │
│  │  Nginx   │───▶│ Spring Boot  │───▶│  MySQL  │ │
│  │ (port 80)│    │  (port 8080) │   │ (3306)  │ │
│  │ Frontend │    │   Backend    │   │         │ │
│  └─────────┘    └──────────────┘   └─────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🏆 Option 1: Oracle Cloud Free Tier (BEST - $0/month FOREVER)

**Cost: Completely FREE, forever** (not a trial)

Oracle Cloud gives you an **Always Free** tier that includes:
- **VM**: 1-4 ARM-based VMs with up to 24 GB RAM and 4 OCPUs total
- **Storage**: 200 GB block volume
- **Network**: 10 TB/month outbound data
- **Database**: Autonomous DB (optional)

### Step-by-Step Setup

#### 1. Create Oracle Cloud Account
1. Go to [cloud.oracle.com](https://cloud.oracle.com)
2. Click **"Start for free"**
3. You'll need a credit card for verification (you will NOT be charged)
4. Select **"Always Free"** tier — this never expires

#### 2. Create a Free VM
1. Go to **Compute → Instances → Create Instance**
2. **Image**: Ubuntu 22.04 (or 24.04)
3. **Shape**: Select **"Always Free Eligible"**
   - For ARM: `VM.Standard.A1.Flex` — Choose **2 OCPUs, 12 GB RAM** (free!)
   - For x86: `VM.Standard.E2.1.Micro` — 1 OCPU, 1 GB RAM (free)
4. **Networking**: Create a new VCN or use default
5. **SSH Key**: Upload your public key or generate one
6. Click **Create**

#### 3. Open Ports (Very Important!)
Oracle Cloud blocks ports 80/443 by default. You need to open them:

**In Oracle Cloud Console:**
1. Go to **Networking → Virtual Cloud Networks**
2. Click your VCN → **Security Lists** → **Default Security List**
3. **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`, Protocol: TCP, Dest Port: `80`
   - Source CIDR: `0.0.0.0/0`, Protocol: TCP, Dest Port: `443`

#### 4. Setup the Server
```bash
# SSH into your VM
ssh -i ~/.ssh/your-key ubuntu@YOUR_VM_PUBLIC_IP

# Upload the project (from your local machine)
scp -i ~/.ssh/your-key -r /path/to/aaprintntags ubuntu@YOUR_VM_IP:/home/ubuntu/

# On the server - run setup script
cd /home/ubuntu/aaprintntags
chmod +x deploy/setup-oracle-cloud.sh
sudo ./deploy/setup-oracle-cloud.sh
```

#### 5. Deploy the Application
```bash
# On the server
cd /home/ubuntu/aaprintntags

# Create environment file
cp .env.example .env
nano .env   # Edit with your passwords

# Build and start (first time takes 5-10 minutes)
docker compose -f docker-compose.prod.yml up -d --build

# Watch logs
docker compose -f docker-compose.prod.yml logs -f

# Check status
docker compose -f docker-compose.prod.yml ps
```

#### 6. Access Your App
Open browser: `http://YOUR_VM_PUBLIC_IP`

#### 7. (Optional) Add Custom Domain + Free SSL
```bash
# Point your domain's A record to YOUR_VM_PUBLIC_IP
# Then on the server:
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Updating the App
```bash
# From your local machine - one command deploy:
./deploy/deploy.sh YOUR_VM_IP ~/.ssh/your-key
```

---

## 💰 Option 2: Railway.app ($5/month - Easiest)

**Cost: ~$5/month** (usage-based, free $5 trial credit)

Railway is the simplest option — push code and it deploys automatically.

### Step-by-Step Setup

#### 1. Sign Up
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### 2. Push Code to GitHub
```bash
cd /path/to/aaprintntags
git init
git add .
git commit -m "Initial commit"
gh repo create aaprintntags --private --push
```

#### 3. Create Railway Project
1. Click **"New Project"**
2. Choose **"Deploy from GitHub Repo"**
3. Select your repo
4. Railway will detect the `Dockerfile` automatically

#### 4. Add MySQL
1. In your Railway project, click **"+ New"**
2. Choose **"Database" → "MySQL"**
3. Railway creates the DB and gives you connection variables

#### 5. Set Environment Variables
In your Railway service settings, add:
```
SPRING_DATASOURCE_URL=mysql://USER:PASS@HOST:PORT/railway
SPRING_DATASOURCE_USERNAME=(from MySQL plugin)
SPRING_DATASOURCE_PASSWORD=(from MySQL plugin)
SPRING_PROFILES_ACTIVE=prod
APP_JWT_SECRET=(run: openssl rand -hex 32)
```

#### 6. Deploy
Railway auto-deploys on every `git push`. Done!

---

## 🌐 Option 3: DigitalOcean Droplet ($6/month)

**Cost: $6/month** (good balance of price and performance)

### Step-by-Step

#### 1. Create Account
- Go to [digitalocean.com](https://www.digitalocean.com)
- Use referral links for $200 free credit (60 days)

#### 2. Create Droplet
- **Image**: Ubuntu 24.04
- **Plan**: Basic, $6/month (1 GB RAM, 1 vCPU, 25 GB SSD)
- **Region**: Choose closest to your users
- **Auth**: SSH Key

#### 3. Deploy
```bash
# SSH in
ssh root@YOUR_DROPLET_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Upload and deploy (same as Oracle Cloud steps 4-5)
cd /opt/aaprintntags
cp .env.example .env
nano .env
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🆓 Option 4: Render.com (Free Tier Available)

**Cost: Free tier (spins down after 15 min inactivity) or $7/month**

### Step-by-Step

#### 1. Push to GitHub (same as Railway)

#### 2. Create Render Web Service
1. Go to [render.com](https://render.com)
2. **New → Web Service → Connect your repo**
3. Choose **Docker** environment
4. Set environment variables (same as Railway)

#### 3. Add MySQL
- Use [Aiven.io](https://aiven.io) free MySQL (or PlanetScale, or TiDB Cloud)
- Get connection string and set as `SPRING_DATASOURCE_URL`

---

## 📊 Cost Comparison

| Option | Monthly Cost | RAM | Setup Difficulty | Auto-Deploy |
|--------|-------------|-----|-----------------|-------------|
| **Oracle Cloud** | **$0 (free forever)** | 12-24 GB | Medium | Manual |
| **Railway** | ~$5 | Shared | Very Easy | ✅ Yes |
| **DigitalOcean** | $6 | 1 GB | Easy | Manual |
| **Render** | $0-7 | 512 MB-2 GB | Easy | ✅ Yes |
| **AWS Free Tier** | $0 (12 months) then ~$15 | 1 GB | Hard | Manual |

### 🎯 My Recommendation
**Oracle Cloud Free Tier** — you get a powerful ARM VM with 12 GB RAM completely free, forever. It's the best deal in cloud computing.

---

## 🛠️ Common Operations

### View Logs
```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs -f app

# Database only
docker compose -f docker-compose.prod.yml logs -f db
```

### Restart Application
```bash
docker compose -f docker-compose.prod.yml restart app
```

### Database Backup
```bash
# Backup
docker exec aaprintntags-db mysqldump -u root -p'YOUR_PASSWORD' aaprintntags > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i aaprintntags-db mysql -u root -p'YOUR_PASSWORD' aaprintntags < backup_20260319.sql
```

### Update Application
```bash
# Pull latest code, rebuild and restart
cd /opt/aaprintntags
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Monitor Resources
```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory
free -h
```

### Auto-restart on Reboot
Docker Compose `restart: unless-stopped` handles this. Also ensure Docker starts on boot:
```bash
sudo systemctl enable docker
```

---

## 🔒 Security Checklist

- [x] Change default passwords in `.env`
- [x] Generate new JWT secret: `openssl rand -hex 32`
- [x] Enable SSL with Certbot (free)
- [x] Use firewall (ufw) to only allow ports 80, 443, 22
- [x] Regular database backups
- [x] Keep Docker images updated

### Setup UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔄 Automated Daily Backups (Optional)

Create a cron job for daily database backups:

```bash
# Create backup script
cat > /opt/aaprintntags/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/aaprintntags/backups"
mkdir -p $BACKUP_DIR
docker exec aaprintntags-db mysqldump -u root -p'YOUR_PASSWORD' aaprintntags | gzip > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M).sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/aaprintntags/backup.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/aaprintntags/backup.sh") | crontab -
```

